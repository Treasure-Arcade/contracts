// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.13;

import '@openzeppelin/contracts/utils/cryptography/MerkleProof.sol';
import '@openzeppelin/contracts/token/ERC1155/ERC1155.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/security/Pausable.sol';

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

    @title Treasure Arcade - ArcadePass mint contract
    @author magiclars <https://github.com/magiclars-off>
*/
contract ArcadePass1155 is ERC1155, Ownable, Pausable {
    
    /**********************
     * Contract Variables *
     **********************/
    
    uint256 private _tokenIds;

    string public constant name = "Arcade Pass";
    string public constant symbol = "ARCADE";

    uint256 public constant TOTAL_SUPPLY = 10_000;
    uint256 public constant ETH_PRICE = 0.05 ether;
    uint256 public constant MAX_MINT_COUNT = 1;
    uint256 public constant TEAM_MINT_COUNT = 500;

    uint256 public allowlistMintStartTime;
    uint256 public publicMintStartTime;

    address payable public teamAddress;
    bytes32 public merkleRoot;

    bool public teamHasMinted = false;

    mapping(address => uint256) public numberMinted;


    /*************
    * Modifiers *
    *************/

    /// Verify if sale started
    modifier saleStarted(uint256 _saleStartTime) {
        require(_saleStartTime != 0 && block.timestamp >= _saleStartTime, 'Not Active');
        _;
    }

    /// Verify that total supply has not been reached
    modifier supplyAvailable() {
        uint256 reservedForTeam = teamHasMinted ? 0 : TEAM_MINT_COUNT;
        require(_tokenIds < (TOTAL_SUPPLY - reservedForTeam), 'Max Supply');
        _;
    }

    /// Verify that address did not mint MAX_MINT_COUNT
    modifier hasNotMaxMinted() {
        require(numberMinted[msg.sender] < MAX_MINT_COUNT, 'Not Eligible to Mint');
        _;
    }
    
    /// Verify correct eth amount is sent
    modifier correctPrice() {
        require(ETH_PRICE == msg.value, 'Incorrect ETH value Sent');
        _;
    }

    /// Verify correct eth amount is sent
    modifier onlyTeam() {
        require(msg.sender == teamAddress, 'Caller is not the teamAddress');
        _;
    }

    /***************
     * Constructor *
     ***************/

    constructor(
        address _teamAddress,
        bytes32 _merkleRoot,
        uint256 _publicMintStartTime,
        uint256 _allowlistMintStartTime,
        string memory _URI
    ) ERC1155(_URI) {
        teamAddress = payable(_teamAddress);
        merkleRoot = _merkleRoot;
        publicMintStartTime = _publicMintStartTime;
        allowlistMintStartTime = _allowlistMintStartTime;

        _mintGenesisNFT();
    }

    /// _mintGenesisNFT mints the NFT when the contract gets deployed and sent it to the contract creator
    function _mintGenesisNFT() internal {
        _tokenIds++;
        _mint(msg.sender, _tokenIds, 1, "");
    }

    /// publicMint allows the sender to mint 1 Arcade Pass
    function publicMint() external payable
        saleStarted(publicMintStartTime)
        supplyAvailable
        hasNotMaxMinted
        correctPrice
    {
        numberMinted[msg.sender]++;
        _tokenIds++;

        _mint(msg.sender, _tokenIds, 1, "");
    }

    /// allowlistMint allows the sender to mint 1 Arcade Pass if allowlisted
    function allowlistMint(bytes32[] calldata _merkleProof) external payable
        saleStarted(allowlistMintStartTime) 
        supplyAvailable
        hasNotMaxMinted
        correctPrice
    {

        /// Verify that address is on the allowlist
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        require(MerkleProof.verify(_merkleProof, merkleRoot, leaf), 'Invalid Proof');

        numberMinted[msg.sender]++;
        _tokenIds++;

        _mint(msg.sender, _tokenIds, 1, "");
    }

    /// teamMint allows the teamAddress to mint the TEAM_MINT_COUNT
    function teamMint() external
        onlyTeam
        supplyAvailable
    {
        /// Verify that address will not mint more than TEAM_MINT_COUNT
        require(!teamHasMinted, 'Team Already Minted');

        teamHasMinted = true;

        uint256[] memory newIDs = new uint256[](TEAM_MINT_COUNT);
        uint256[] memory newAmounts = new uint256[](TEAM_MINT_COUNT);

        uint256 _internalTokenID = _tokenIds;

        for (uint256 i = 0; i < TEAM_MINT_COUNT; i++) {
            _internalTokenID++;

            newIDs[i] = _internalTokenID;
            newAmounts[i] = 1;
        }
        _tokenIds = _internalTokenID;

        _mintBatch(msg.sender, newIDs, newAmounts, "");
    }

    /// totalMinted returns the amount of minted Arcade Passes
    function totalMinted() external view returns (uint256) {
        return _tokenIds;
    }

    /// updateTokenURI allows the owner to update the token URI.
    function updateTokenURI(string memory _newURI) external onlyOwner {
        _setURI(_newURI);
    }

    /// updateTeamAddress allows the owner to update the teamAddress
    function updateTeamAddress(address newAddress) external onlyOwner {
        teamAddress = payable(newAddress);
    }

    /// updateMerkleRoot allows the owner to update the merkleRoot
    function updateMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
        merkleRoot = _merkleRoot;
    }

    /// pause is used to pause the contract
    function pause() external onlyOwner {
        _pause();
    }

    /// unpause is used to unpause the contract.
    function unpause() external onlyOwner {
        _unpause();
    }

    /// updateAllowlistMintStartTime allows the owner to update the allowlist mint start time
    function updateAllowlistMintStartTime(uint256 _allowlistMintStartTime) external onlyOwner {
        allowlistMintStartTime = _allowlistMintStartTime;
    }

    /// updatePublicMintStartTime allows the owner to update the public mint start time
    function updatePublicMintStartTime(uint256 _publicMintStartTime) external onlyOwner {
        publicMintStartTime = _publicMintStartTime;
    }

    /// withdrawBalance allows the teamAddress to withdraw the balance from contract. 
    function withdrawBalance() external 
        onlyTeam
    {
        (bool success, ) = teamAddress.call{value: address(this).balance}('');
        require(success, 'Transfer failed.');
    }
}