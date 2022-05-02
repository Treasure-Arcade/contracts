// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import '@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20SnapshotUpgradeable.sol';

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

    @title Treasure Arcade - TreasurePoints ERC20 contract
    @author magiclars <https://github.com/magiclars-off>
*/
contract TreasurePoints is
    Initializable,
    ERC20Upgradeable,
    ERC20SnapshotUpgradeable,
    OwnableUpgradeable,
    AccessControlUpgradeable
{
    /**********************
     * Contract Variables *
     **********************/

    bytes32 public constant MINTER_ROLE = keccak256('MINTER_ROLE');

    /***************
     * Initializer *
     ***************/

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize(uint256 _initialMintAmount) public initializer {
        __ERC20_init('Treasure Points', 'TP');
        __ERC20Snapshot_init();
        __AccessControl_init();
        __Ownable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);

        _mint(msg.sender, _initialMintAmount * 10**decimals());
    }

    /*********************************
     * External and Public Functions *
     *********************************/

    /// @notice Owner takes a snapshot of current state.
    function snapshot() external onlyOwner {
        _snapshot();
    }

    /// @notice Owner can grant MINTER_ROLE to an address.
    function grantMinterRole(address _to) external onlyOwner {
        _grantRole(MINTER_ROLE, _to);
    }

    /// @notice Owner can revoke MINTER_ROLE to an address.
    function revokeMinterRole(address _to) external onlyOwner {
        require(_to != owner(), 'Cannot Revoke own Role');

        _revokeRole(MINTER_ROLE, _to);
    }

    /// @notice Allows sender with MINTER_ROLE to mint an amount to an address.
    function mint(address _to, uint256 _amount) external onlyRole(MINTER_ROLE) {
        _mint(_to, _amount);
    }

    /**********************************
     * Internal and Private Functions *
     **********************************/

    /// @notice The following functions are overrides required by Solidity.
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20Upgradeable, ERC20SnapshotUpgradeable) {
        super._beforeTokenTransfer(from, to, amount);
    }
}
