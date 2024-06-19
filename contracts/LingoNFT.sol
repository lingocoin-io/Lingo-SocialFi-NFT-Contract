// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

error CannotBeZero();
error InvalidSignature();
error MaxSupplyReached();
error NotExistant();
error NotSent();
error NotStarted();
error Unauthorized();

/// @title LingoNFT: An NFT Contract for Lingo SocialFi Campaign
/// @notice This contract allows for the minting and management of various NFT tiers.
/// @dev Inherits ERC721 for NFT functionality, Ownable for access control, and ReentrancyGuard for security.
contract LingoNFT is ERC721, EIP712, Ownable {
    /// @notice Enumeration for NFT tiers
    enum Tier {
        FIRST_CLASS,
        PRIVATE_JET
    }

    /// @notice Struct for Mint data
    struct MintData {
        address sender;
        Tier tier;
    }

    /// @dev Tracks whether an address has minted for a specific tier
    struct MintStatus {
        bool firstClassMinted;
        bool privateJetMinted;
    }

    uint256 private _nextTokenId;
    uint256 public privateJetSupply;

    /// @notice Start time for NFT sale
    uint256 public saleStartTime;

    /// @notice Maximum supply of First Class NFTs
    uint256 public maxFirstClassSupply;

    /// @notice Address authorized to sign minting transactions
    address public mintSigner;

    mapping(uint256 => bool) private privateJet;

    string public firstClassURI =
        "ipfs://QmWsdztWmpXf8hiuGX8p8sXdn6K6J6zWuWWMcgaa6TaP2H";
    string public privateJetURI =
        "ipfs://QmPNSZ2jgQtLnk46EaCvcm5WQ31PZDMeCtgtPfbBbtBMsx";

    mapping(address => MintStatus) private _hasMinted;

    /// @notice Initializes contract with URIs for each NFT tier
    constructor(
        uint256 _maxFirstClassSupply
    ) ERC721("Lingo NFT", "LING") EIP712("Lingo NFT", "1") Ownable(msg.sender) {
        maxFirstClassSupply = _maxFirstClassSupply;
    }

    /// @notice Function to receive Ether
    receive() external payable {}

    /// @notice Allows the minting of First Class NFTs
    /// @dev Requires that the sale is active and the provided signature is valid
    /// @param r The r component of the signature
    /// @param s The s component of the signature
    /// @param v The recovery byte of the signature
    function mintFirstClassNFT(bytes32 r, bytes32 s, uint8 v) external {
        if (_hasMinted[msg.sender].firstClassMinted) revert Unauthorized();
        if (saleStartTime == 0 || block.timestamp < saleStartTime)
            revert NotStarted();
        if ((_nextTokenId - privateJetSupply) >= maxFirstClassSupply)
            revert MaxSupplyReached();

        MintData memory data = MintData({
            sender: msg.sender,
            tier: Tier.FIRST_CLASS
        });

        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("MintData(address sender,uint8 tier)"),
                data.sender,
                data.tier
            )
        );

        bytes32 messageHash = MessageHashUtils.toTypedDataHash(
            _domainSeparatorV4(),
            structHash
        );

        if (ECDSA.recover(messageHash, v, r, s) != mintSigner)
            revert InvalidSignature();

        _mint(msg.sender, Tier.FIRST_CLASS);
    }

    /// @notice Sets the maximum supply for First Class NFTs
    /// @param _maxSupply New maximum supply
    function setMaxFirstClassSupply(uint256 _maxSupply) external onlyOwner {
        if (_maxSupply == 0) revert CannotBeZero();
        maxFirstClassSupply = _maxSupply;
    }

    /// @notice Assigns the signer
    /// @param _signer The address of signer
    function setMintSigner(address _signer) external onlyOwner {
        if (_signer == address(0)) revert CannotBeZero();
        mintSigner = _signer;
    }

    /// @notice Sets the URI for a specific NFT tier
    /// @param tier The NFT tier
    /// @param uri The new URI
    function setTierURI(Tier tier, string calldata uri) external onlyOwner {
        if (bytes(uri).length == 0) revert CannotBeZero();

        if (tier == Tier.FIRST_CLASS) {
            firstClassURI = uri;
        } else {
            privateJetURI = uri;
        }
    }

    /// @notice Sets the start time for the NFT sale
    /// @param _startDate The start time as a UNIX timestamp
    function setSaleStartTime(uint256 _startDate) external onlyOwner {
        saleStartTime = _startDate;
    }

    /// @notice Withdraws contract balance to the owner's address
    /// @dev Only callable by the contract owner
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance == 0) revert CannotBeZero();
        // Transfer funds to the owner's address
        (bool sent, ) = owner().call{value: balance}("");
        if (!sent) revert NotSent();
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

    /// @notice Checks if an account has already minted a specific tier of NFT
    /// @param account The address to check
    /// @param tier The tier to check for
    /// @return true if the account has already minted an NFT of the specified tier
    function hasMinted(
        address account,
        Tier tier
    ) external view returns (bool) {
        if (tier == Tier.FIRST_CLASS) {
            return _hasMinted[account].firstClassMinted;
        } else {
            return _hasMinted[account].privateJetMinted;
        }
    }

    /// @notice Retrieves the total number of NFTs minted
    /// @return The total number of NFTs minted
    function totalSupply() external view returns (uint256) {
        return _nextTokenId;
    }

    /// @notice Retrieves the total number of First Class NFTs minted
    /// @return The total number of First Class NFTs minted
    function firstClassSupply() external view returns (uint256) {
        return _nextTokenId - privateJetSupply;
    }

    /// @notice Retrieves the token URI for a given token ID
    /// @dev Overrides ERC721's tokenURI to incorporate base URI with token-specific URIs
    /// @param tokenId The ID of the token to retrieve the URI for
    /// @return The full URI string for the specified token
    function tokenURI(
        uint256 tokenId
    ) public view override returns (string memory) {
        _requireOwned(tokenId);
        return privateJet[tokenId] ? privateJetURI : firstClassURI;
    }

    /// @notice Mints a new token of a specified tier to a given address
    /// @dev Internal function that handles the logic for minting new tokens
    /// @param to The address to mint the token to
    /// @param tier The tier of the new token
    function _mint(address to, Tier tier) internal {
        uint256 tokenId = _nextTokenId++;

        if (tier == Tier.PRIVATE_JET) {
            privateJetSupply++;
            privateJet[tokenId] = true;
            _hasMinted[to].privateJetMinted = true;
        } else {
            _hasMinted[to].firstClassMinted = true;
        }

        _safeMint(to, tokenId);
    }
}
