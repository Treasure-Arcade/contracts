// SPDX-License-Identifier: MIT

pragma solidity 0.8.13;

import './interfaces/ITreasurePoints.sol';
import '@openzeppelin/contracts/token/ERC721/IERC721.sol';
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC721/IERC721ReceiverUpgradeable.sol';
import '@openzeppelin/contracts/utils/structs/EnumerableSet.sol';


/** 
 _________  ________  _______   ________  ________  ___  ___  ________  _______      
|\___   ___\\   __  \|\  ___ \ |\   __  \|\   ____\|\  \|\  \|\   __  \|\  ___ \     
\|___ \  \_\ \  \|\  \ \   __/|\ \  \|\  \ \  \___|\ \  \\\  \ \  \|\  \ \   __/|    
     \ \  \ \ \   _  _\ \  \_|/_\ \   __  \ \_____  \ \  \\\  \ \   _  _\ \  \_|/__  
      \ \  \ \ \  \\  \\ \  \_|\ \ \  \ \  \|____|\  \ \  \\\  \ \  \\  \\ \  \_|\ \ 
       \ \__\ \ \__\\ _\\ \_______\ \__\ \__\____\_\  \ \_______\ \__\\ _\\ \_______\
        \|__|  \|__|\|__|\|_______|\|__|\|__|\_________\|_______|\|__|\|__|\|_______|
                                            \|_________|                             
                                                                                                                                                                         
 ________  ________  ________  ________  ________  _______                           
|\   __  \|\   __  \|\   ____\|\   __  \|\   ___ \|\  ___ \                          
\ \  \|\  \ \  \|\  \ \  \___|\ \  \|\  \ \  \_|\ \ \   __/|                         
 \ \   __  \ \   _  _\ \  \    \ \   __  \ \  \ \\ \ \  \_|/__                       
  \ \  \ \  \ \  \\  \\ \  \____\ \  \ \  \ \  \_\\ \ \  \_|\ \                      
   \ \__\ \__\ \__\\ _\\ \_______\ \__\ \__\ \_______\ \_______\                     
    \|__|\|__|\|__|\|__|\|_______|\|__|\|__|\|_______|\|_______|                     

    @title Arcade Staking contract
    @author magiclars <https://github.com/magiclars-off>
*/
contract ArcadeStaking is Initializable, OwnableUpgradeable, PausableUpgradeable, IERC721ReceiverUpgradeable {
    using EnumerableSet for EnumerableSet.UintSet;

    /**********************
     * Contract Variables *
     **********************/

    IERC721 public arcadePassContract;
    ITreasurePoints public treasurePointsContract;

    uint256 public emissionRate;

    /// @notice Mapping of address to token numbers deposited
    mapping(address => EnumerableSet.UintSet) private _deposits;

    /// @notice Mapping of Deposit Block number of a staked token
    mapping(address => mapping(uint256 => uint256)) public depositBlocks;

    /// @notice Checks that the caller is not a contract
    modifier callerIsUser() {
        require(tx.origin == msg.sender, 'Please be a human');
        _;
    }

    /***************
     * Initializer *
     ***************/

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    /**
     * @notice Initialize the ArcadeStaking contract.
     * @param _arcadePassContract Address of the Arcade Pass NFT (ERC721A) contract.
     * @param _treasurePointContract Address of the Treasure Points (ERC20) contract.
     */
    function initialize(address _arcadePassContract, address _treasurePointContract) public initializer {
        __Ownable_init();
        __Pausable_init();

        arcadePassContract = IERC721(_arcadePassContract);
        treasurePointsContract = ITreasurePoints(_treasurePointContract);
        _pause();

        emissionRate = 55 * 10**15;
    }

    /*********************************
     * External and Public Functions *
     *********************************/

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function deposit(uint256[] calldata _tokenIds) external callerIsUser whenNotPaused {
        require(msg.sender != address(arcadePassContract), 'Invalid address');

        for (uint256 i = 0; i < _tokenIds.length; i++) {
            uint256 tokenId = _tokenIds[i];

            _deposits[msg.sender].add(tokenId);
            depositBlocks[msg.sender][tokenId] = block.number;
            arcadePassContract.safeTransferFrom(msg.sender, address(this), tokenId);
        }
    }

    function withdraw(uint256[] calldata _tokenIds) external callerIsUser whenNotPaused {
        claimRewards(_tokenIds);

        for (uint256 i = 0; i < _tokenIds.length; i++) {
            uint256 tokenId = _tokenIds[i];
            require(_deposits[msg.sender].contains(tokenId), 'Token not deposited');

            _deposits[msg.sender].remove(tokenId);
            arcadePassContract.safeTransferFrom(address(this), msg.sender, tokenId);
        }
    }

    function claimRewards(uint256[] calldata _tokenIds) public whenNotPaused {
        uint256 reward = 0;

        for (uint256 i; i < _tokenIds.length; i++) {
            reward += calculateReward(msg.sender, _tokenIds[i]);

            // Update the deposit timestamp after each claim
            depositBlocks[msg.sender][_tokenIds[i]] = block.number;
        }

        if (reward > 0) {
            treasurePointsContract.mint(msg.sender, reward);
        }
    }

    function setEmissionRate(uint256 _emissionRate) external onlyOwner {
        emissionRate = _emissionRate;
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external virtual override returns (bytes4) {
        return IERC721ReceiverUpgradeable(address(0)).onERC721Received.selector;
    }

    /**********************************
     * Internal and Private Functions *
     **********************************/

    function calculateReward(address owner, uint256 tokenId) public view returns (uint256) {
        return
            emissionRate *
            (_deposits[owner].contains(tokenId) ? 1 : 0) *
            (block.number - depositBlocks[owner][tokenId]);
    }
}
