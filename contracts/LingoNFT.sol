// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";


/// @title LingoNFT: An NFT Contract for Lingo SocialFi Campaign
/// @notice This contract allows for the minting and management of various NFT tiers.
/// @dev Inherits ERC721 for NFT functionality, Ownable for access control, and ReentrancyGuard for security.
contract LingoNFT is ERC721URIStorage, EIP712, Ownable {
    using ECDSA for bytes32;
    using Counters for Counters.Counter;

    /// @dev Counter for total minted tokens
    Counters.Counter private _tokenIdCounter;

    /// @dev Counter for tracking the number of First Class NFTs minted
    Counters.Counter private _firstClassSupplyCounter;

    /// @notice Start time for NFT sale
    uint256 public saleStartTime;

    /// @notice Address authorized to sign minting transactions
    address public mintSigner;

    /// @notice Maximum supply of First Class NFTs
    uint256 public maxFirstClassSupply;

    /// @notice Enumeration for NFT tiers
    enum Tier {
        FIRST_CLASS,
        PRIVATE_JET
    }

    /// @dev Mapping to store Tier for each token ID
    mapping(uint256 => bool) private privateJet;

    /// @notice Struct for Mint data
    struct MintData {
        address sender;
        Tier tier;
    }

    string public firstClassURI = "ipfs://QmWsdztWmpXf8hiuGX8p8sXdn6K6J6zWuWWMcgaa6TaP2H";
    string public privateJetURI = "ipfs://QmPNSZ2jgQtLnk46EaCvcm5WQ31PZDMeCtgtPfbBbtBMsx";

    /// @dev Tracks whether an address has minted for a specific tier
    mapping(address => mapping(Tier => bool)) private _hasMinted;

    /// @dev Ensures actions are only taken if the sale has started
    modifier isActive() {
        require(
            saleStartTime != 0 && block.timestamp >= saleStartTime,
            "Sale has not started"
        );
        _;
    }

    /// @notice Initializes contract with URIs for each NFT tier
    constructor() ERC721("Lingo NFT", "LING") EIP712("Lingo NFT", "1") {
        maxFirstClassSupply = 555;
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
        tier == Tier.FIRST_CLASS ? firstClassURI = uri : privateJetURI = uri;
    }

    /// @notice Sets the start time for the NFT sale
    /// @param _startDate The start time as a UNIX timestamp
    function setSaleStartTime(uint256 _startDate) external onlyOwner {
        saleStartTime = _startDate;
    }

    /// @notice Allows the minting of First Class NFTs
    /// @dev Requires that the sale is active and the provided signature is valid
    /// @param r The r component of the signature
    /// @param s The s component of the signature
    /// @param v The recovery byte of the signature
    function mintFirstClassNFT(
        bytes32 r,
        bytes32 s,
        uint8 v
    ) external isActive {
        require(
            !_hasMinted[msg.sender][Tier.FIRST_CLASS],
            "Address already minted First"
        );
        require(
            _firstClassSupplyCounter.current() < maxFirstClassSupply,
            "Maximum supply reached"
        );

        MintData memory data = MintData({sender: msg.sender, tier: Tier.FIRST_CLASS});

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

        _mint(msg.sender, Tier.FIRST_CLASS);
    }

    /// @notice Airdrops NFTs of a specified tier to multiple addresses
    /// @param tier The tier of NFTs to airdrop
    /// @param recipients The addresses to receive the NFTs
    function airdropNFT(
        Tier tier,
        address[] calldata recipients
    ) external onlyOwner {
        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], tier);
        }
    }

    /// @notice Retrieves the total number of First Class NFTs minted
    /// @return The total number of First Class NFTs minted
    function firstClassSupply() public view returns (uint256) {
        return _firstClassSupplyCounter.current();
    }

    /// @notice Retrieves the token URI for a given token ID
    /// @dev Overrides ERC721's tokenURI to incorporate base URI with token-specific URIs
    /// @param tokenId The ID of the token to retrieve the URI for
    /// @return The full URI string for the specified token
    function tokenURI(
        uint256 tokenId
    ) public view override returns (string memory) {
        require(_exists(tokenId), "Token does not exist");
        return privateJet[tokenId] ? privateJetURI : firstClassURI;
    }

    /// @notice Mints a new token of a specified tier to a given address
    /// @dev Internal function that handles the logic for minting new tokens
    /// @param to The address to mint the token to
    /// @param tier The tier of the new token
    function _mint(address to, Tier tier) internal {
        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();

        if (tier == Tier.FIRST_CLASS) {
            _firstClassSupplyCounter.increment();
        } else {
            privateJet[tokenId] = true;
        }

        _hasMinted[to][tier] = true;

        _safeMint(to, tokenId);
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
