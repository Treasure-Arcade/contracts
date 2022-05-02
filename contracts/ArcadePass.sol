// SPDX-License-Identifier: MIT

pragma solidity 0.8.13;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/utils/cryptography/MerkleProof.sol';
import '@openzeppelin/contracts/security/Pausable.sol';
import './libraries/ERC721A.sol';

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

    @dev Contract inherits functionality from ERC721A, 
    a fully compliant implementation of IERC721 with 
    gas savings for minting multiple NFTs in a single transaction.
    source: https://github.com/chiru-labs/ERC721A 
    @title Treasure Arcade - ArcadePass mint contract
    @author magiclars <https://github.com/magiclars-off>
*/
contract ArcadePass is Ownable, ERC721A, Pausable {
    using Strings for uint256;
    
    /**********************
     * Contract Variables *
     **********************/

    uint256 public constant MAX_MINT_COUNT = 1;
    uint256 public constant TEAM_MINT_COUNT = 500;
    uint256 public constant TOTAL_SUPPLY = 10_000;
    uint256 public constant ETH_PRICE = 0.05 ether;
    
    uint256 public allowlistMintStartTime;
    uint256 public publicMintStartTime;

    address payable public teamAddress;
    bytes32 public merkleRoot;

    bool public teamHasMinted = false;


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
        uint256 reservedForTeam = TEAM_MINT_COUNT - super._numberMinted(owner());
        require(super.totalSupply() < (TOTAL_SUPPLY - reservedForTeam), 'Max Supply');
        _;
    }

    /// Verify that address did not mint MAX_MINT_COUNT
    modifier hasNotMintedMax() {
        require(super._numberMinted(msg.sender) < MAX_MINT_COUNT, 'Not Eligible to Mint');
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
        uint256 _allowlistMintStartTime
    ) ERC721A('ArcadePass', 'PASS') {
        teamAddress = payable(_teamAddress);
        merkleRoot = _merkleRoot;
        publicMintStartTime = _publicMintStartTime;
        allowlistMintStartTime = _allowlistMintStartTime;
    }



    /*********************************
     * External and Public Functions *
     *********************************/

    /// allowlistMint allows the sender to mint 1 Arcade Pass if allowlisted
    function allowlistMint(bytes32[] calldata _merkleProof) external payable 
        saleStarted(allowlistMintStartTime) 
        supplyAvailable
        hasNotMintedMax
        correctPrice
    {
        /// Verify that address is on the allowlist
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        require(MerkleProof.verify(_merkleProof, merkleRoot, leaf), 'Invalid Proof');

        super._mint(msg.sender, 1);
    }

    /// publicMint allows the sender to mint 1 Arcade Pass
    function publicMint() external payable
        saleStarted(publicMintStartTime)
        supplyAvailable
        hasNotMintedMax
        correctPrice
    {
        super._mint(msg.sender, 1);
    }

    /// teamMint allows the teamAddress to mint the TEAM_MINT_COUNT
    function teamMint() external 
        onlyTeam 
        supplyAvailable
    {
        /// Verify that address will not mint more than TEAM_MINT_COUNT
        require(!teamHasMinted, 'Team Already Minted');

        teamHasMinted = true;

        /// Mint ArcadePass in batches of 10
        for (uint256 i = 0; i < (TEAM_MINT_COUNT / 10); i++) {
            super._mint(msg.sender, 10);
        }
    }

    /// Returns the amount of Arcade Passes minted by an address
    function numberMinted(address _address) public view returns (uint256) {
        return super._numberMinted(_address);
    }

    /// Returns the amount of minted Arcade Passes
    function totalMinted() public view returns (uint256) {
        return super._totalMinted();
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

    /// withdrawBalance allows the owner to withdraw the balance from contract.
    function withdrawBalance() external 
        onlyTeam
    {
        (bool success, ) = msg.sender.call{value: address(this).balance}('');
        require(success, 'Transfer failed.');
    }


    /**********************
     * Metadata Variables *
     **********************/

    string private _baseTokenURI;
    string private _defaultURI;
    bool private _enableDefaultUri = true;

    /// Overrides the _baseURI function from ERC721A.sol
    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }

    /// Overrides the tokenURI function from ERC721A.sol
    function tokenURI(uint256 _tokenId) public view override returns (string memory) {
        require(super._exists(_tokenId), 'ERC721Metadata: URI query for nonexistent token');

        return _enableDefaultUri ? _defaultURI : string.concat(_baseTokenURI, _tokenId.toString());
    }

    /// Sets the Base URI
    function setBaseURI(string calldata baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }

    /// Sets the Default URI
    function setDefaultURI(string calldata defaultURI) external onlyOwner {
        _defaultURI = defaultURI;
    }

    /// Toggles the usage of the default- or baseTokenURI
    function setToggleDefaultURI(bool enable) external onlyOwner {
        _enableDefaultUri = enable;
    }
}
