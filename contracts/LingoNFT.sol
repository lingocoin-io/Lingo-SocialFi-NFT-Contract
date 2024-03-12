// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/// @title LingoNFT: An NFT Contract for Lingo SocialFi Campaign
/// @notice This contract allows for the minting and management of various NFT tiers.
/// @dev Inherits ERC721 for NFT functionality, Ownable for access control, and ReentrancyGuard for security.
contract LingoNFT is ERC721, EIP712, Ownable, ReentrancyGuard {
    using ECDSA for bytes32;

    /// @notice Start time for NFT sale
    uint256 public saleStartTime = 0;

    /// @notice Address authorized to sign minting transactions
    address public mintSigner;

    /// @notice Mint price for First Class NFTs
    uint256 public firstClassMintPrice;

    /// @notice Maximum supply of First Class NFTs
    uint256 public maxFirstClassSupply;

    /// @dev Counter for tracking the number of First Class NFTs minted
    uint256 private firstClassSupplyCounter;

    /// @dev Counter for total minted tokens
    uint256 private _tokenIdCounter;

    /// @dev Mapping to store URI for each token ID
    mapping(uint256 => string) private _tokenURIs;

    /// @dev Mapping to store URI for each NFT tier
    mapping(Tier => string) private _tierURIs;

    /// @notice Enumeration for NFT tiers
    enum Tier {
        ECONOMY_CLASS,
        BUSINESS_CLASS,
        FIRST_CLASS,
        PRIVATE_JET
    }

    /// @dev Tracks whether an address has minted for a specific tier
    mapping(address => mapping(Tier => bool)) private _hasMinted;

    /// @dev Ensures actions are only taken if the sale has started
    modifier isActive() {
        require(
            saleStartTime != 0 && block.timestamp >= saleStartTime,
            "Minting not allowed"
        );
        _;
    }

    /// @notice Initializes contract with URIs for each NFT tier
    constructor() ERC721("Lingo NFT", "LING") EIP712("Lingo NFT", "1") {
        _tierURIs[
            Tier.ECONOMY_CLASS
        ] = "ipfs://QmZ1hGVKUjYnNzwbjJwVAakFWhDX5n1qDWJ6RZgerDx2LJ";
        _tierURIs[
            Tier.BUSINESS_CLASS
        ] = "ipfs://QmYQSRxUV2fFwKcX99Q8hixvyc2AsTEJt5TGwZTERD2dXQ";
        _tierURIs[
            Tier.FIRST_CLASS
        ] = "ipfs://QmWsdztWmpXf8hiuGX8p8sXdn6K6J6zWuWWMcgaa6TaP2H";
        _tierURIs[
            Tier.PRIVATE_JET
        ] = "ipfs://QmPNSZ2jgQtLnk46EaCvcm5WQ31PZDMeCtgtPfbBbtBMsx";
    }

    /// @notice Sets the mint price for First Class NFTs
    /// @param _price New mint price
    function setFirstClassMintPrice(uint256 _price) external onlyOwner {
        require(_price > 0, "Price must be greater than zero");
        firstClassMintPrice = _price;
    }

    /// @notice Sets the maximum supply for First Class NFTs
    /// @param _maxSupply New maximum supply
    function setMaxFirstClassSupply(uint256 _maxSupply) external onlyOwner {
        require(_maxSupply > 0, "Max supply must be greater than zero");
        maxFirstClassSupply = _maxSupply;
    }

    /// @notice Assigns the signer
    /// @param _signer The address of signer
    function setMintSigner(address _signer) external onlyOwner {
        require(_signer != address(0), "Signer address cannot be zero");
        mintSigner = _signer;
    }

    /// @notice Sets the URI for a specific NFT tier
    /// @param tier The NFT tier
    /// @param uri The new URI
    function setTierURI(Tier tier, string calldata uri) external onlyOwner {
        require(bytes(uri).length > 0, "URI cannot be empty");
        _tierURIs[tier] = uri;
    }

    /// @notice Sets the start time for the NFT sale
    /// @param _startDate The start time as a UNIX timestamp
    function setSaleStartTime(uint256 _startDate) external onlyOwner {
        saleStartTime = _startDate;
    }

    /// @notice Retrieves the URI for a given NFT tier
    /// @dev Returns a string representing the IPFS URI for the tier's metadata
    /// @param tier The tier of the NFT for which to retrieve the URI
    /// @return The URI string for the specified tier
    function getTierURI(Tier tier) public view returns (string memory) {
        return _tierURIs[tier];
    }

    // /// @notice Determines the signer address for a specified tier
    // /// @dev Internal view function to abstract the process of fetching the correct signer
    // /// @param tier The tier for which to retrieve the signer address
    // /// @return The address of the signer for the specified tier
    // function getSignerByTier(Tier tier) internal view returns (address) {
    //     if (tier == Tier.ECONOMY_CLASS) {
    //         return economySigner;
    //     }
    //     if (tier == Tier.BUSINESS_CLASS) {
    //         return businessSigner;
    //     }
    //     if (tier == Tier.FIRST_CLASS) {
    //         return firstSigner;
    //     }
    //     return address(0);
    // }

    struct MintData {
        address sender;
        Tier tier;
    }

    /// @notice Allows the minting of NFTs for the Economy and Business classes
    /// @dev Requires allowlist verification through a signer and that the sale is active
    /// @param tier The tier of the NFT to mint (must be Economy or Business)
    /// @param r The r component of the signature
    /// @param s The s component of the signature
    /// @param v The recovery byte of the signature
    function mintEconomyBusinessClassNFT(
        Tier tier,
        bytes32 r,
        bytes32 s,
        uint8 v
    ) external nonReentrant isActive {
        require(
            tier == Tier.ECONOMY_CLASS || tier == Tier.BUSINESS_CLASS,
            "Incorrect Tier"
        );
        require(
            !_hasMinted[msg.sender][tier],
            "Address already minted this tier"
        );

        MintData memory data = MintData({sender: msg.sender, tier: tier});

        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("MintData(address sender,uint8 tier)"),
                data.sender,
                data.tier
            )
        );

        bytes32 messageHash = ECDSA.toTypedDataHash(
            _domainSeparatorV4(),
            structHash
        );

        require(
            ECDSA.recover(messageHash, v, r, s) == mintSigner,
            "Unauthorized Signer"
        );

        uint256 tokenId = getNextTokenId();
        // Mint NFT to the sender
        _mint(msg.sender, tokenId, _tierURIs[tier], tier);
    }

    /// @notice Allows the minting of First Class NFTs
    /// @dev Requires payment equal to the mint price and that the sale is active
    /// @param tier The tier of the NFT to mint (must be First Class)
    /// @param r The r component of the signature
    /// @param s The s component of the signature
    /// @param v The recovery byte of the signature
    function mintFirstClassNFT(
        Tier tier,
        bytes32 r,
        bytes32 s,
        uint8 v
    ) external payable nonReentrant isActive {
        require(
            tier == Tier.FIRST_CLASS,
            "This function is only for FIRST_CLASS tier"
        );
        require(msg.value == firstClassMintPrice, "Ether sent is not correct");
        require(
            !_hasMinted[msg.sender][Tier.FIRST_CLASS],
            "Address already minted First"
        );
        require(
            firstClassSupplyCounter < maxFirstClassSupply,
            "Maximum supply reached"
        );

        MintData memory data = MintData({sender: msg.sender, tier: tier});

        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("MintData(address sender,uint8 tier)"),
                data.sender,
                data.tier
            )
        );

        bytes32 messageHash = ECDSA.toTypedDataHash(
            _domainSeparatorV4(),
            structHash
        );

        require(
            ECDSA.recover(messageHash, v, r, s) == mintSigner,
            "Unauthorized Signer"
        );

        uint256 tokenId = getNextTokenId();
        _mint(msg.sender, tokenId, _tierURIs[tier], tier);
    }

    /// @notice Allows the contract owner to mint and airdrop Private Jet NFTs to specified addresses
    /// @param recipients The addresses to receive the airdropped NFTs
    function mintPrivateJetNFT(
        address[] calldata recipients
    ) external nonReentrant onlyOwner {
        uint256 tokenId;
        for (uint256 i = 0; i < recipients.length; i++) {
            tokenId = getNextTokenId();
            _mint(
                recipients[i],
                tokenId,
                _tierURIs[Tier.PRIVATE_JET],
                Tier.PRIVATE_JET
            );
        }
    }

    /// @notice Airdrops NFTs of a specified tier to multiple addresses
    /// @param recipients The addresses to receive the NFTs
    /// @param tier The tier of NFTs to airdrop
    function airdropNFT(
        address[] calldata recipients,
        Tier tier
    ) external nonReentrant onlyOwner {
        require(tier != Tier.PRIVATE_JET, "Incorrect Tier");
        for (uint256 i = 0; i < recipients.length; i++) {
            uint256 tokenId = getNextTokenId();
            _mint(recipients[i], tokenId, _tierURIs[tier], tier);
        }
    }

    /// @dev Gets the next available token ID based on the current counter
    /// @return The next token ID to be minted
    function getNextTokenId() private view returns (uint256) {
        uint256 tokenId = _tokenIdCounter;
        return tokenId;
    }

    /// @notice Retrieves the total number of First Class NFTs minted
    /// @return The total number of First Class NFTs minted
    function getFirstClassSupply() public view returns (uint256) {
        return firstClassSupplyCounter;
    }

    /// @notice Retrieves the sale start time
    /// @return The UNIX timestamp for when the sale starts
    function getSaleStartTime() external view returns (uint256) {
        return saleStartTime;
    }

    /// @notice Retrieves the current total supply of minted tokens
    /// @return The total number of tokens minted
    function getTotalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }

    /// @notice Retrieves the token URI for a given token ID
    /// @dev Overrides ERC721's tokenURI to incorporate base URI with token-specific URIs
    /// @param tokenId The ID of the token to retrieve the URI for
    /// @return The full URI string for the specified token
    function tokenURI(
        uint256 tokenId
    ) public view override returns (string memory) {
        require(_exists(tokenId), "Token does not exist");
        // Combine the base URI and token-specific URI to get the full metadata URI
        return _tokenURIs[tokenId];
    }

    /// @notice Mints a new token of a specified tier to a given address with a specified URI
    /// @dev Internal function that handles the logic for minting new tokens
    /// @param to The address to mint the token to
    /// @param tokenId The token ID for the new token
    /// @param uri The URI for the new token
    /// @param tier The tier of the new token
    function _mint(
        address to,
        uint256 tokenId,
        string memory uri,
        Tier tier
    ) internal {
        require(!_exists(tokenId), "Token ID already exists");
        require(to != address(0), "Cannot mint to the zero address");
        _hasMinted[msg.sender][tier] = true;
        _tokenIdCounter = _tokenIdCounter + 1;
        _tokenURIs[tokenId] = uri;
        _safeMint(to, tokenId);
        if (tier == Tier.FIRST_CLASS) {
            firstClassSupplyCounter += 1;
        }
    }

    /// @notice Gets the current block timestamp
    /// @return The current block's timestamp
    function getCurrentTimestamp() external view returns (uint256) {
        return block.timestamp;
    }

    /// @notice Checks if an account has already minted a specific tier of NFT
    /// @param account The address to check
    /// @param tier The tier to check for
    /// @return true if the account has already minted an NFT of the specified tier
    function hasMinted(
        address account,
        Tier tier
    ) external view returns (bool) {
        return _hasMinted[account][tier];
    }

    /// @notice Withdraws contract balance to the owner's address
    /// @dev Only callable by the contract owner
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds left to withdraw");
        // Transfer funds to the owner's address
        (bool sent, ) = owner().call{value: balance}("");
        require(sent, "Transfer failed.");
    }
}
