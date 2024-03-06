// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract LingoNFT is ERC721, Ownable, ReentrancyGuard {
    // Minting window
    uint256 public saleStartTime = 0;
    address public economySigner;
    address public businessSigner;
    address public firstSigner;
    uint256 public firstClassMintPrice;
    uint256 public maxFirstClassSupply;
    uint256 private firstClassSupplyCounter;

    // Counter for total minted tokens
    uint256 private _tokenIdCounter;

    // Mapping to store URI for each token
    mapping(uint256 => string) private _tokenURIs;
    mapping(Tier => string) private _tierURIs;

    // Enumeration for NFT tiers
    enum Tier {
        ECONOMY_CLASS,
        BUSINESS_CLASS,
        FIRST_CLASS,
        PRIVATE_JET
    }
    // Add a new mapping to track whether a user has minted for a specific tier
    mapping(address => mapping(Tier => bool)) private _hasMinted;

   modifier isActive() {
    require(saleStartTime != 0 && block.timestamp >= saleStartTime, "Minting not allowed outside the campaign window");
    _;
    }
    // Constructor
    constructor() ERC721("Lingo NFT", "LING") {
        _tierURIs[Tier.ECONOMY_CLASS] = "ipfs://economyClassURI";
        _tierURIs[Tier.BUSINESS_CLASS] = "ipfs://businessClassURI";
        _tierURIs[Tier.FIRST_CLASS] = "ipfs://firstClassURI";
        _tierURIs[Tier.PRIVATE_JET] = "ipfs://privateJetURI";
    }
    //function to set the minting price for First Class NFTs
    function setFirstClassMintPrice(uint256 _price) external onlyOwner {
        firstClassMintPrice = _price;
    }
    //function to set the max supply for First Class NFTs
    function setMaxFirstClassSupply(uint256 _maxSupply) external onlyOwner {
        maxFirstClassSupply = _maxSupply;
    }
    //Function to set Economy Class signer
    function setEconomySigner(address _economySigner) external onlyOwner {
        economySigner = _economySigner;
    }
    //Function to set Business Class signer
    function setBusinessSigner(address _businessSigner) external onlyOwner {
        businessSigner = _businessSigner;
    }
    //Function to set First Class signer
    function setFirstSigner(address _firstSigner) external onlyOwner {
        firstSigner = _firstSigner;
    }
    //Function to set URI for a specific tier
    function setTierURI(Tier tier, string calldata uri) external onlyOwner {
    _tierURIs[tier] = uri;
   }
   //Function to get URI for a specific tier
   function getTierURI(Tier tier) public view returns (string memory) {
    return _tierURIs[tier];
    }
    //Function to get Signer for a specific tier
    function getSignerByTier(Tier tier) internal view returns(address)  {
        if(tier == Tier.ECONOMY_CLASS){
            return economySigner;
        }
        if(tier == Tier.BUSINESS_CLASS){
            return businessSigner;
        }
        if(tier == Tier.FIRST_CLASS){
            return firstSigner;
        }
        return address(0);
    }
    // Function to mint NFTs for Economy, and Business (require being allowlisted) (can only be called during the minting window)
    function mintEconomyBusinessClassNFT(Tier tier, bytes32 r, bytes32 s, uint8 v) external nonReentrant isActive {
        require(tier == Tier.ECONOMY_CLASS || tier == Tier.BUSINESS_CLASS, "Incorrect Tier");
        require( !_hasMinted[msg.sender][tier], "Address already minted this tier");
        require( getSignerByTier(tier) != address(0), "Invalid Signer");
        bytes32 messageHash = keccak256(abi.encodePacked(msg.sender, tier));
        bytes32 prefixedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        require( ecrecover(prefixedMessageHash, v, r, s) == getSignerByTier(tier), "Unauthorized Signer");
        
        uint256 tokenId = getNextTokenId();
        // Mint NFT to the sender
        _mint(msg.sender, tokenId, _tierURIs[tier], tier);
    }

   function mintFirstClassNFT(Tier tier, bytes32 r, bytes32 s, uint8 v) external payable nonReentrant isActive {
        require(tier == Tier.FIRST_CLASS, "This function is only for FIRST_CLASS tier");
        require(msg.value >= firstClassMintPrice, "Ether sent is not correct");
        require(!_hasMinted[msg.sender][Tier.FIRST_CLASS], "Address already minted First");
        require( getSignerByTier(tier) != address(0), "Invalid Signer");
        bytes32 messageHash = keccak256(abi.encodePacked(msg.sender, tier));
        bytes32 prefixedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        require( ecrecover(prefixedMessageHash, v, r, s) == getSignerByTier(tier), "Unauthorized Signer");
        
        uint256 tokenId = getNextTokenId();
        _mint(msg.sender, tokenId, _tierURIs[tier], tier);
    }
    //Function to mint and airdrop the Private Jet NFT at the end of the campaign
    function mintPrivateJetNFT(address[] calldata recipients) external nonReentrant onlyOwner {
        uint256 tokenId;
        for (uint256 i = 0; i < recipients.length; i++) {
            tokenId = getNextTokenId();
            _mint(recipients[i], tokenId, _tierURIs[Tier.PRIVATE_JET], Tier.PRIVATE_JET);
        }
    }
   // Fonction to allow airdrop of a specific NFT TIer to specific addresses
    function airdropNFT(address[] calldata recipients, Tier tier) external nonReentrant onlyOwner {
        require(tier != Tier.PRIVATE_JET, "Incorrect Tier");
        for (uint256 i = 0; i < recipients.length; i++) {
            uint256 tokenId = getNextTokenId();
            _mint(recipients[i], tokenId, _tierURIs[tier], tier);
        }
    }   
    // Function to get the next available token ID
    function getNextTokenId() private view returns (uint256) {
        uint256 tokenId = _tokenIdCounter;
        return tokenId;
    }
    //Function to get the total numer of First Class NFT minted
    function getFirstClassSupply() public view returns (uint256) {
        return firstClassSupplyCounter;
    }
    // Function to set the sale start date
    function setSaleStartTime(uint256 _startDate) external onlyOwner {
        saleStartTime = _startDate;
    }
    // Function to get the sale start date
    function getSaleStartTime() external view returns (uint256) {
        return saleStartTime;
    }
    // Function to get the current total supply
    function getTotalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }
    //FUnction to get the URI of a specific NFT
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "Token does not exist");
        // Combine the base URI and token-specific URI to get the full metadata URI
       return _tokenURIs[tokenId];  
    }
   // Override _mint function to include uri and tier
    function _mint(address to, uint256 tokenId, string memory uri, Tier tier) internal {
        require(!_exists(tokenId), "Token ID already exists");
        require(to != address(0), "Cannot mint to the zero address");
        _hasMinted[msg.sender][tier] = true;
        _tokenIdCounter = _tokenIdCounter + 1;
        _tokenURIs[tokenId] = uri;
        _mint(to, tokenId);
        if (tier == Tier.FIRST_CLASS) {
            firstClassSupplyCounter += 1;
        }
    }
    // Function to check the current timestamp
    function getCurrentTimestamp() external view returns (uint256) {
        return block.timestamp;
    }
    // Function to check if the address has already minted a specific NFT Tier
    function hasMinted(address account, Tier tier) external view returns (bool) {
        return _hasMinted[account][tier];
    }
    // Function to withdraw funds from the contract
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds left to withdraw");
        // Transfer funds to the owner's address
        (bool sent, ) = owner().call{value: balance}("");
        require(sent, "Transfer failed.");  
    }
}