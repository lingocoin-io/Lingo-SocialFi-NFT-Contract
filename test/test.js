const { describe, beforeEach, it } = require("mocha");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Lingo NFT Tests", async () => {
  let lingoNFT;

  let [owner, user1, user2, signer, wrongSigner] = await ethers.getSigners();

  const FIRST_CLASS_TIER = 0;
  const PRIVATE_JET_TIER = 1;

  const FIRST_CLASS_URI =
    "ipfs://QmWsdztWmpXf8hiuGX8p8sXdn6K6J6zWuWWMcgaa6TaP2H";
  const PRIVATE_JET_URI =
    "ipfs://QmPNSZ2jgQtLnk46EaCvcm5WQ31PZDMeCtgtPfbBbtBMsx";

  const FIRST_CLASS_SUPPLY = 2;

  let messageHash = ethers.utils.id("hello");

  // Sign the message hash
  let messageBytes = ethers.utils.arrayify(messageHash);
  let signature = await signer.signMessage(messageBytes);
  let wrongSignature = await wrongSigner.signMessage(messageBytes);

  beforeEach(async () => {
    const NFT = await ethers.getContractFactory("LingoNFT", owner);
    lingoNFT = await NFT.deploy(FIRST_CLASS_SUPPLY, { gasLimit: 30000000 });
    await lingoNFT.deployed();
  });

  describe("Deployment", () => {
    it("Should set the right owner", async function () {
      expect(await lingoNFT.owner()).to.equal(owner.address);
    });
    // Test for correctly setting tier URIs
    it("Should correctly set tier URIs for each class", async function () {
      const firstClassURI = await lingoNFT.firstClassURI();
      expect(firstClassURI).to.equal(FIRST_CLASS_URI);

      const privateJetURI = await lingoNFT.privateJetURI();
      expect(privateJetURI).to.equal(PRIVATE_JET_URI);
    });
    it("Returns 0 for SaleStartTime", async () => {
      expect(await lingoNFT.saleStartTime()).to.equal(0);
    });
  });

  describe("Set functions", () => {
    it("Should set the max supply for First Class NFTs", async function () {
      const newMaxSupply = 500;
      await lingoNFT.connect(owner).setMaxFirstClassSupply(newMaxSupply, {
        gasLimit: 30000000,
      });
      expect(await lingoNFT.maxFirstClassSupply()).to.equal(newMaxSupply);
    });

    it("Should set Signer", async function () {
      await lingoNFT.connect(owner).setMintSigner(signer.address, {
        gasLimit: 30000000,
      });

      firstSuply = await lingoNFT.maxFirstClassSupply();
      signerContract = await lingoNFT.mintSigner();

      expect(await lingoNFT.mintSigner()).to.equal(signer.address);
    });

    it("Should set Tier URI", async function () {
      const tier = 0; // Assuming you have an enum or some way to specify the tier
      const uri = "ipfs://newTierURI";
      await lingoNFT.connect(owner).setTierURI(FIRST_CLASS_TIER, uri, {
        gasLimit: 30000000,
      });
      await lingoNFT.connect(owner).setTierURI(PRIVATE_JET_TIER, uri, {
        gasLimit: 30000000,
      });

      expect(await lingoNFT.firstClassURI()).to.equal(uri);
      expect(await lingoNFT.privateJetURI()).to.equal(uri);
    });
  });

  describe("Minting Before Sale Start Time", function () {
    describe("Minting First Class NFT", function () {
      let signers;
      let firstClassTier = 0;

      before(async function () {
        signers = await ethers.getSigners();
        // Deploy the contract
        const NFT = await ethers.getContractFactory("LingoNFT");
        lingoNFT = await NFT.deploy(FIRST_CLASS_SUPPLY);
        await lingoNFT.deployed();
      });

      it("Should revert First Class minting when saleStartTime is not set", async function () {
        // Prepare message to sign
        const domain = {
          name: "Lingo NFT",
          version: "1",
          chainId: (await ethers.provider.getNetwork()).chainId,
          verifyingContract: lingoNFT.address,
        };

        await lingoNFT.setMintSigner(signer.address, {
          gasLimit: 30000000,
        });

        signature = await signer._signTypedData(
          domain,
          {
            MintData: [
              { name: "sender", type: "address" },
              { name: "tier", type: "uint8" },
            ],
          },
          {
            sender: user1.address,
            tier: firstClassTier,
          },
        );

        const { v, r, s } = ethers.utils.splitSignature(signature);

        // Attempt to mint before saleStartTime is updated
        await expect(
          lingoNFT.connect(user2).mintFirstClassNFT(r, s, v, {
            gasLimit: 30000000,
          }),
        ).to.be.revertedWithCustomError(lingoNFT, "NotStarted");
      });
    });
  });

  describe("Minting After Sale Start Time", function () {
    describe("Mint First Class NFT", function () {
      let firstClassTier = 0;

      before(async function () {
        // Deploy the contract
        const NFT = await ethers.getContractFactory("LingoNFT");
        lingoNFT = await NFT.deploy(FIRST_CLASS_SUPPLY);
        await lingoNFT.deployed();

        // Set a past sale start time
        const SaleStartTime =
          (await ethers.provider.getBlock("latest")).timestamp - 1; // 24 hours before the current time
        await lingoNFT.setSaleStartTime(SaleStartTime);

        //Set Mint Signer
        await lingoNFT.setMintSigner(signer.address, {
          gasLimit: 30000000,
        });
      });

      it("Should allow First minting after saleStartTime is set and First Signer signature", async function () {
        const domain = {
          name: "Lingo NFT",
          version: "1",
          chainId: (await ethers.provider.getNetwork()).chainId,
          verifyingContract: lingoNFT.address,
        };

        await lingoNFT.setMintSigner(signer.address, {
          gasLimit: 30000000,
        });

        signature = await signer._signTypedData(
          domain,
          {
            MintData: [
              { name: "sender", type: "address" },
              { name: "tier", type: "uint8" },
            ],
          },
          {
            sender: user1.address,
            tier: firstClassTier,
          },
        );

        await lingoNFT.connect(owner).setMaxFirstClassSupply(10, {
          gasLimit: 30000000,
        });

        const { v, r, s } = ethers.utils.splitSignature(signature);
        SaleStartTime =
          (await ethers.provider.getBlock("latest")).timestamp - 86400; // 24 hours before the current time
        await lingoNFT.setSaleStartTime(SaleStartTime, {
          gasLimit: 30000000,
        });
        await expect(
          lingoNFT
            .connect(user1)
            .mintFirstClassNFT(r, s, v, { gasLimit: 30000000 }),
        ).to.emit(lingoNFT, "Transfer");
        contractBalance = await ethers.provider.getBalance(lingoNFT.address);
        ownerBalance = await ethers.provider.getBalance(owner.address);
      });
      it("Should revert First minting after saleStartTime is set and First Signer signature but Incorrect Domain", async function () {
        const domain = {
          name: "Test NFT Contract",
          version: "1",
          chainId: (await ethers.provider.getNetwork()).chainId,
          verifyingContract: lingoNFT.address,
        };

        await lingoNFT.setMintSigner(signer.address, {
          gasLimit: 30000000,
        });

        signature = await signer._signTypedData(
          domain,
          {
            MintData: [
              { name: "sender", type: "address" },
              { name: "tier", type: "uint8" },
            ],
          },
          {
            sender: user1.address,
            tier: firstClassTier,
          },
        );

        await lingoNFT.connect(owner).setMaxFirstClassSupply(10, {
          gasLimit: 30000000,
        });

        const { v, r, s } = ethers.utils.splitSignature(signature);
        SaleStartTime =
          (await ethers.provider.getBlock("latest")).timestamp - 86400; // 24 hours before the current time
        await lingoNFT.setSaleStartTime(SaleStartTime, {
          gasLimit: 30000000,
        });
        await expect(
          lingoNFT
            .connect(user1)
            .mintFirstClassNFT(r, s, v, { gasLimit: 3000000 }),
        ).to.be.revertedWithCustomError(lingoNFT, "InvalidSignature");
      });
      it("Should revert First minting after saleStartTime is set but Wrong Signer signature", async function () {
        const domain = {
          name: "Lingo NFT",
          version: "1",
          chainId: (await ethers.provider.getNetwork()).chainId,
          verifyingContract: lingoNFT.address,
        };

        await lingoNFT.setMintSigner(signer.address, {
          gasLimit: 30000000,
        });

        signature = await wrongSigner._signTypedData(
          domain,
          {
            MintData: [
              { name: "sender", type: "address" },
              { name: "tier", type: "uint8" },
            ],
          },
          {
            sender: user1.address,
            tier: firstClassTier,
          },
        );

        await lingoNFT.connect(owner).setMaxFirstClassSupply(10, {
          gasLimit: 30000000,
        });

        const { v, r, s } = ethers.utils.splitSignature(signature);
        SaleStartTime =
          (await ethers.provider.getBlock("latest")).timestamp - 86400; // 24 hours before the current time
        await lingoNFT.setSaleStartTime(SaleStartTime, {
          gasLimit: 30000000,
        });
        await expect(
          lingoNFT
            .connect(user1)
            .mintFirstClassNFT(r, s, v, { gasLimit: 3000000 }),
        ).to.be.revertedWithCustomError(lingoNFT, "InvalidSignature");
      });
      it("Should revert First minting after saleStartTime is set and First Signer signature but incorrect Tier in message", async function () {
        const domain = {
          name: "Lingo NFT",
          version: "1",
          chainId: (await ethers.provider.getNetwork()).chainId,
          verifyingContract: lingoNFT.address,
        };

        await lingoNFT.setMintSigner(signer.address, {
          gasLimit: 30000000,
        });

        signature = await signer._signTypedData(
          domain,
          {
            MintData: [
              { name: "sender", type: "address" },
              { name: "tier", type: "uint8" },
            ],
          },
          {
            sender: user1.address,
            tier: 2,
          },
        );

        await lingoNFT.connect(owner).setMaxFirstClassSupply(10, {
          gasLimit: 30000000,
        });

        const { v, r, s } = ethers.utils.splitSignature(signature);
        SaleStartTime =
          (await ethers.provider.getBlock("latest")).timestamp - 86400; // 24 hours before the current time
        await lingoNFT.setSaleStartTime(SaleStartTime, {
          gasLimit: 30000000,
        });
        await expect(
          lingoNFT
            .connect(user1)
            .mintFirstClassNFT(r, s, v, { gasLimit: 3000000 }),
        ).to.be.revertedWithCustomError(lingoNFT, "InvalidSignature");
      });
      it("Should revert First minting after saleStartTime is set and First Signer signature but not First Tier in parameter", async function () {
        const domain = {
          name: "Lingo NFT",
          version: "1",
          chainId: (await ethers.provider.getNetwork()).chainId,
          verifyingContract: lingoNFT.address,
        };

        await lingoNFT.setMintSigner(signer.address, {
          gasLimit: 30000000,
        });

        signature = await signer._signTypedData(
          domain,
          {
            MintData: [
              { name: "sender", type: "address" },
              { name: "tier", type: "uint8" },
            ],
          },
          {
            sender: user1.address,
            tier: firstClassTier,
          },
        );

        await lingoNFT.connect(owner).setMaxFirstClassSupply(10, {
          gasLimit: 30000000,
        });

        const { v, r, s } = ethers.utils.splitSignature(signature);
        SaleStartTime =
          (await ethers.provider.getBlock("latest")).timestamp - 86400; // 24 hours before the current time
        await lingoNFT.setSaleStartTime(SaleStartTime, {
          gasLimit: 30000000,
        });
      });
      it("Should fail to mint First Class NFT with Maximum supply reached", async function () {
        const domain = {
          name: "Lingo NFT",
          version: "1",
          chainId: (await ethers.provider.getNetwork()).chainId,
          verifyingContract: lingoNFT.address,
        };

        await lingoNFT.setMintSigner(signer.address, {
          gasLimit: 30000000,
        });

        signature = await signer._signTypedData(
          domain,
          {
            MintData: [
              { name: "sender", type: "address" },
              { name: "tier", type: "uint8" },
            ],
          },
          {
            sender: user1.address,
            tier: firstClassTier,
          },
        );

        await lingoNFT.connect(owner).setMaxFirstClassSupply(1, {
          gasLimit: 30000000,
        });

        var { v, r, s } = ethers.utils.splitSignature(signature);
        SaleStartTime =
          (await ethers.provider.getBlock("latest")).timestamp - 86400; // 24 hours before the current time
        await lingoNFT.setSaleStartTime(SaleStartTime, {
          gasLimit: 30000000,
        });
        await lingoNFT
          .connect(user1)
          .mintFirstClassNFT(r, s, v, { gasLimit: 30000000 });

        signature2 = await signer._signTypedData(
          domain,
          {
            MintData: [
              { name: "sender", type: "address" },
              { name: "tier", type: "uint8" },
            ],
          },
          {
            sender: user2.address,
            tier: firstClassTier,
          },
        );

        var { v, r, s } = ethers.utils.splitSignature(signature2);

        await expect(
          lingoNFT
            .connect(user2)
            .mintFirstClassNFT(r, s, v, { gasLimit: 3000000 }),
        ).to.be.revertedWithCustomError(lingoNFT, "MaxSupplyReached");
      });
      it("Should revert First minting after saleStartTime is set and Signer signature but Another User Calls Mint Function", async function () {
        const domain = {
          name: "Lingo NFT",
          version: "1",
          chainId: (await ethers.provider.getNetwork()).chainId,
          verifyingContract: lingoNFT.address,
        };

        await lingoNFT.setMintSigner(signer.address, {
          gasLimit: 30000000,
        });

        signature = await signer._signTypedData(
          domain,
          {
            MintData: [
              { name: "sender", type: "address" },
              { name: "tier", type: "uint8" },
            ],
          },
          {
            sender: user1.address,
            tier: firstClassTier,
          },
        );

        await lingoNFT.connect(owner).setMaxFirstClassSupply(1, {
          gasLimit: 30000000,
        });

        const { v, r, s } = ethers.utils.splitSignature(signature);
        SaleStartTime =
          (await ethers.provider.getBlock("latest")).timestamp - 86400; // 24 hours before the current time
        await lingoNFT.setSaleStartTime(SaleStartTime, {
          gasLimit: 30000000,
        });

        await expect(
          lingoNFT
            .connect(user2)
            .mintFirstClassNFT(r, s, v, { gasLimit: 3000000 }),
        ).to.be.revertedWithCustomError(lingoNFT, "InvalidSignature");
      });
      it("Should revert First minting after saleStartTime is set and Signer signature but User mints first twice", async function () {
        const domain = {
          name: "Lingo NFT",
          version: "1",
          chainId: (await ethers.provider.getNetwork()).chainId,
          verifyingContract: lingoNFT.address,
        };

        await lingoNFT.setMintSigner(signer.address, {
          gasLimit: 30000000,
        });

        signature = await signer._signTypedData(
          domain,
          {
            MintData: [
              { name: "sender", type: "address" },
              { name: "tier", type: "uint8" },
            ],
          },
          {
            sender: user1.address,
            tier: firstClassTier,
          },
        );

        await lingoNFT.connect(owner).setMaxFirstClassSupply(1, {
          gasLimit: 30000000,
        });

        const { v, r, s } = ethers.utils.splitSignature(signature);
        SaleStartTime =
          (await ethers.provider.getBlock("latest")).timestamp - 86400; // 24 hours before the current time
        await lingoNFT.setSaleStartTime(SaleStartTime, {
          gasLimit: 30000000,
        });
        await lingoNFT
          .connect(user1)
          .mintFirstClassNFT(r, s, v, { gasLimit: 3000000 });

        await expect(
          lingoNFT
            .connect(user1)
            .mintFirstClassNFT(r, s, v, { gasLimit: 3000000 }),
        ).to.be.revertedWithCustomError(lingoNFT, "Unauthorized");
      });
    });
  });

  describe("Set Sale Start Date", () => {
    it("reverts with Ownable: caller is not the owner", async () => {
      await expect(
        lingoNFT.connect(user1).setSaleStartTime(0, {
          gasLimit: 30000000,
        }),
      ).to.be.revertedWithCustomError(lingoNFT, "OwnableUnauthorizedAccount");
    });
    it("returns Minting Start", async () => {
      startTime = Math.floor(Date.now() + 1000);
      await lingoNFT.connect(owner).setSaleStartTime(startTime, {
        gasLimit: 30000000,
      });
      salestartime = await lingoNFT.saleStartTime();

      expect((await lingoNFT.saleStartTime()).toNumber()).to.be.equal(
        startTime,
      );
    });
  });

  describe("Before Minting period", () => {
    beforeEach(async () => {
      await lingoNFT
        .connect(owner)
        .setSaleStartTime(Math.floor(Date.now() + 1000 / 1000), {
          gasLimit: 30000000,
        });
    });
    it("returns saleStart greater than current time", async () => {
      expect((await lingoNFT.saleStartTime()).toNumber()).to.be.above(
        Math.floor(Date.now() / 1000),
      );
    });
  });

  describe("During Minting Period", () => {
    beforeEach(async () => {
      await lingoNFT
        .connect(owner)
        .setSaleStartTime(Math.floor(Date.now()) + 2, {
          gasLimit: 30000000,
        });
    });
    it("returns mintingStart less than current time", async () => {
      expect((await lingoNFT.saleStartTime()).toNumber()).to.be.below(
        Math.floor(Date.now()) + 1000,
      );
    });
    describe("Set Signer", async () => {
      it("reverts with Ownable: caller is not the owner", async () => {
        await expect(
          lingoNFT
            .connect(user1)
            .setMintSigner("0xdD2FD4581271e230360230F9337D5c0430Bf44C0", {
              gasLimit: 30000000,
            }),
        ).to.be.revertedWithCustomError(lingoNFT, "OwnableUnauthorizedAccount");
      });
      it("returns true", async () => {
        try {
          await lingoNFT
            .connect(owner)
            .setMintSigner("0xdD2FD4581271e230360230F9337D5c0430Bf44C0", {
              gasLimit: 30000000,
            });
          expect(await lingoNFT.mintSigner()).to.be.equal(
            "0xdD2FD4581271e230360230F9337D5c0430Bf44C0",
          );
        } catch (error) {
          assert.fail("Expected function to pass");
        }
      });
    });

    describe("Airdrop Private Jet NFT", () => {
      let recipientAddresses = [
        "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
        "0x976EA74026E726554dB657fA54763abd0C3a0aa9",
        "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955",
        "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f",
      ];
      it("reverts with Ownable: caller is not the owner", async () => {
        await expect(
          lingoNFT
            .connect(user1)
            .airdropNFT(PRIVATE_JET_TIER, recipientAddresses, {
              gasLimit: 30000000,
            }),
        ).to.be.revertedWithCustomError(lingoNFT, "OwnableUnauthorizedAccount");
      });
      it("returns true", async () => {
        const result = await lingoNFT
          .connect(owner)
          .airdropNFT(PRIVATE_JET_TIER, recipientAddresses, {
            gasLimit: 30000000,
          });
        expect(result).to.not.haveOwnProperty("error");
      });
      it("should correctly mint and airdrop Private Jet NFTs to multiple recipients", async () => {
        // Perform the minting by the owner
        await lingoNFT
          .connect(owner)
          .airdropNFT(PRIVATE_JET_TIER, recipientAddresses, {
            gasLimit: 30000000,
          });

        // Assuming token IDs start from 0 and no other tokens have been minted yet
        const startingTokenId = 0;

        // Check if each recipient received their NFT
        for (let i = 0; i < recipientAddresses.length; i++) {
          const tokenId = startingTokenId + i;
          const ownerOfToken = await lingoNFT.ownerOf(tokenId);
          expect(ownerOfToken).to.equal(recipientAddresses[i]);
        }
      });
      it("should mint the right tier", async () => {
        // Perform the minting by the owner
        await lingoNFT
          .connect(owner)
          .airdropNFT(PRIVATE_JET_TIER, recipientAddresses, {
            gasLimit: 30000000,
          });

        // Assuming token IDs start from 0 and no other tokens have been minted yet
        const startingTokenId = 0;

        // Check if each recipient received their NFT
        for (let i = 0; i < recipientAddresses.length; i++) {
          const tokenId = startingTokenId + i;
          const uri = await lingoNFT.tokenURI(tokenId);
          expect(uri).to.equal(PRIVATE_JET_URI);
        }
      });
    });
  });

  describe("Airdrop NFT", function () {
    let recipientAddresses = [
      "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
      "0x976EA74026E726554dB657fA54763abd0C3a0aa9",
      "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955",
      "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f",
    ];

    it("should revert if not called by the owner", async function () {
      await expect(
        lingoNFT
          .connect(user1)
          .airdropNFT(FIRST_CLASS_TIER, recipientAddresses, {
            gasLimit: 30000000,
          }),
      ).to.be.revertedWithCustomError(lingoNFT, "OwnableUnauthorizedAccount");
    });
    it("should correctly airdrop First Class NFTs to multiple recipients", async function () {
      await lingoNFT
        .connect(owner)
        .airdropNFT(FIRST_CLASS_TIER, recipientAddresses, {
          gasLimit: 30000000,
        });

      const startingTokenId = 0;

      // Check if each recipient received their NFT
      for (let i = 0; i < recipientAddresses.length; i++) {
        const tokenId = startingTokenId + i;
        const ownerOfToken = await lingoNFT.ownerOf(tokenId, {
          gasLimit: 30000000,
        });
        expect(ownerOfToken).to.equal(recipientAddresses[i]);
      }
    });
  });

  describe("hasMinted Function", function () {
    it("should return false if the address has not minted any NFT", async function () {
      const hasMintedFirstClass = await lingoNFT.hasMinted(user1.address, 0);
      const hasMintedPrivateJet = await lingoNFT.hasMinted(user1.address, 1);

      expect(hasMintedFirstClass).to.be.false;
      expect(hasMintedPrivateJet).to.be.false;
    });

    it("should return true if the address has minted a First Class NFT", async function () {
      // Simulate the minting process for the first class tier
      const domain = {
        name: "Lingo NFT",
        version: "1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: lingoNFT.address,
      };

      const SaleStartTime =
        (await ethers.provider.getBlock("latest")).timestamp - 1; // 24 hours before the current time
      await lingoNFT.setSaleStartTime(SaleStartTime);

      await lingoNFT.setMintSigner(signer.address, {
        gasLimit: 30000000,
      });

      signature = await signer._signTypedData(
        domain,
        {
          MintData: [
            { name: "sender", type: "address" },
            { name: "tier", type: "uint8" },
          ],
        },
        {
          sender: user1.address,
          tier: 0,
        },
      );

      const { v, r, s } = ethers.utils.splitSignature(signature);
      await lingoNFT
        .connect(user1)
        .mintFirstClassNFT(r, s, v, { gasLimit: 30000000 });

      const hasMintedFirstClass = await lingoNFT.hasMinted(user1.address, 0);
      expect(hasMintedFirstClass).to.be.true;
    });

    it("should return true if the address has minted a Private Jet NFT", async function () {
      // Simulate the minting process for the Privat jet tier
      await lingoNFT
        .connect(owner)
        .airdropNFT(PRIVATE_JET_TIER, [user2.address], {
          gasLimit: 30000000,
        });

      const hasMintedPrivateJet = await lingoNFT.hasMinted(user2.address, 1);

      expect(hasMintedPrivateJet).to.be.true;
    });

    it("should return false for unminted tier if the address has minted a different tier", async function () {
      // assuming user2 has only private Jet and user1 only FirstClass
      const hasMintedFirstClass = await lingoNFT.hasMinted(user2.address, 0);
      const hasMintedPrivateJet = await lingoNFT.hasMinted(user1.address, 1);

      expect(hasMintedFirstClass).to.be.false;
      expect(hasMintedPrivateJet).to.be.false;
    });
  });

  describe("totalSupply Function", function () {
    it("should return correct totalSupply when no NFTs are minted", async function () {
      const totalSupply = await lingoNFT.totalSupply();
      expect(totalSupply).to.equal(0);
    });

    it("should return correct totalSupply after minting First Class NFTs", async function () {
      const domain = {
        name: "Lingo NFT",
        version: "1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: lingoNFT.address,
      };

      const SaleStartTime =
        (await ethers.provider.getBlock("latest")).timestamp - 1; // 24 hours before the current time
      await lingoNFT.setSaleStartTime(SaleStartTime);

      await lingoNFT.setMintSigner(signer.address, {
        gasLimit: 30000000,
      });

      signature = await signer._signTypedData(
        domain,
        {
          MintData: [
            { name: "sender", type: "address" },
            { name: "tier", type: "uint8" },
          ],
        },
        {
          sender: user1.address,
          tier: 0,
        },
      );

      const { v, r, s } = ethers.utils.splitSignature(signature);
      await lingoNFT
        .connect(user1)
        .mintFirstClassNFT(r, s, v, { gasLimit: 30000000 });

      const totalSupply = await lingoNFT.totalSupply();
      expect(totalSupply).to.equal(1);
    });
  });

  describe("totalSupply Function", function () {
    it("should return correct firstClassSupply when no NFTs are minted", async function () {
      const firstClassSupply = await lingoNFT.firstClassSupply();
      expect(firstClassSupply).to.equal(0);
    });

    it("should return correct firstClassSupply after minting First Class NFTs", async function () {
      const domain = {
        name: "Lingo NFT",
        version: "1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: lingoNFT.address,
      };

      const SaleStartTime =
        (await ethers.provider.getBlock("latest")).timestamp - 1; // 24 hours before the current time
      await lingoNFT.setSaleStartTime(SaleStartTime);

      await lingoNFT.setMintSigner(signer.address, {
        gasLimit: 30000000,
      });

      signature = await signer._signTypedData(
        domain,
        {
          MintData: [
            { name: "sender", type: "address" },
            { name: "tier", type: "uint8" },
          ],
        },
        {
          sender: user1.address,
          tier: 0,
        },
      );

      const { v, r, s } = ethers.utils.splitSignature(signature);
      await lingoNFT
        .connect(user1)
        .mintFirstClassNFT(r, s, v, { gasLimit: 30000000 });

      const firstClassSupply = await lingoNFT.firstClassSupply();
      expect(firstClassSupply).to.equal(1);
    });
  });
});
