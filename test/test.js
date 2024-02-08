const { describe, beforeEach, it } = require('mocha');
const { expect } = require('chai');
const { ethers } = require('hardhat');
const { BigNumber } = require('ethers');
const _ = require('lodash');

// const BN = ethers.BigNumber.from;

function BNtoNumber(bn) {
    return bn.toNumber();
}

describe("Lingo NFT Tests", async () => {
    let lingoNFT;
    let owner;
    let user1;
    let user2;
    let timestamp;

    // console.log("ethers4", ethers);
    // [owner, user1, user2] = await ethers.getSigners();

    const hhprovider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545");
    owner = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", hhprovider);//0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
    user1 = new ethers.Wallet("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", hhprovider);//0x70997970C51812dc3A010C7d01b50e0d17dc79C8
    user2 = new ethers.Wallet("0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a", hhprovider);//0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC

    economySigner = new ethers.Wallet("0xde9be858da4a475276426320d5e9262ecfc3ba460bfac56360bfa6c4c28b4ee0", hhprovider); // 0xdD2FD4581271e230360230F9337D5c0430Bf44C0
    businessSigner = new ethers.Wallet("0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e", hhprovider); // 0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199
    firstSigner = new ethers.Wallet("0x689af8efa8c651a91ad287602527f3af2fe9f6501a7ac4b061667b5a93e037fd", hhprovider); // 0xbDA5747bFD65F08deb54cb465eB87D40e51B197E
    // Compute message hash
    messageHash = ethers.utils.id("hello");

    // Sign the message hash
    let messageBytes = ethers.utils.arrayify(messageHash);
    economySignature = await economySigner.signMessage(messageBytes);
    businessSignature = await businessSigner.signMessage(messageBytes);
    
    beforeEach(async () => {
        const NFT = await ethers.getContractFactory("LingoNFT", owner);
        lingoNFT = await NFT.deploy();
        await lingoNFT.deployed();
    });

    describe('Deployment', () => {
        it("Should set the right owner", async function() {
            expect(await lingoNFT.owner()).to.equal(owner.address);
        });
        // Test for correctly setting tier URIs
        it("Should correctly set tier URIs for each class", async function() {
            // Verify the URIs for each tier
            const economyClassURI = await lingoNFT.getTierURI(0); // Assuming you have a public getter for _tierURIs
            expect(economyClassURI).to.equal("ipfs://economyClassURI");

            const businessClassURI = await lingoNFT.getTierURI(1);
            expect(businessClassURI).to.equal("ipfs://businessClassURI");

            const firstClassURI = await lingoNFT.getTierURI(2);
            expect(firstClassURI).to.equal("ipfs://firstClassURI");

            const privateJetURI = await lingoNFT.getTierURI(3);
            expect(privateJetURI).to.equal("ipfs://privateJetURI");
        });
        it("Returns 0 for SaleStartTime", async () => {
            expect(await lingoNFT.saleStartTime()).to.equal(0);
        });

    });
    describe('Set functions', () => {
        it("Should set the max supply for First Class NFTs", async function () {
            const newMaxSupply = 500;
            await lingoNFT.connect(owner).setMaxFirstClassSupply(newMaxSupply, {
                        gasLimit: 30000000
                    });
            expect(await lingoNFT.maxFirstClassSupply()).to.equal(newMaxSupply);
        });

        it("Should set Economy Class signer", async function () {
            await lingoNFT.connect(owner).setEconomySigner(economySigner.address, {
                gasLimit: 30000000
            });
            expect(await lingoNFT.economySigner()).to.equal(economySigner.address);
        });

        it("Should set Business Class signer", async function () {
            await lingoNFT.connect(owner).setBusinessSigner(businessSigner.address, {
                gasLimit: 30000000
            });
            expect(await lingoNFT.businessSigner()).to.equal(businessSigner.address);
        });

        it("Should set First Class signer", async function () {
            await lingoNFT.connect(owner).setFirstSigner(firstSigner.address, {
                gasLimit: 30000000
            });
            expect(await lingoNFT.firstSigner()).to.equal(firstSigner.address);
        });

        it("Should set Tier URI", async function () {
            const tier = 0; // Assuming you have an enum or some way to specify the tier
            const uri = "ipfs://newTierURI";
            await lingoNFT.connect(owner).setTierURI(tier, uri, {
                gasLimit: 30000000
            });
            expect(await lingoNFT.getTierURI(tier)).to.equal(uri);
        });

    });
    describe("Minting Before Sale Start Time", function() {
        
        describe("Minting Economy,Business or First Class NFT", function() {
            let signers;
            let economyClassTier = 0; 
            let businessClassTier = 1; 
            let firstClassTier = 2;
            let firstClassMintPrice ;

            before(async function() {
                signers = await ethers.getSigners();
                // Deploy the contract
                const NFT = await ethers.getContractFactory("LingoNFT");
                lingoNFT = await NFT.deploy();
                await lingoNFT.deployed();
            });
        
            it("Should revert Economy minting when saleStartTime is not set", async function() {
                // Prepare message to sign
                const messageHash = ethers.utils.solidityKeccak256(["address", "uint8"], [user1.address, economyClassTier]);
                const messageHashBytes = ethers.utils.arrayify(messageHash);
        
                // Sign the message
                economySignature = await economySigner.signMessage(messageHashBytes, {
                    gasLimit: 30000000
                });
                const { v, r, s } = ethers.utils.splitSignature(economySignature);
        
                // Attempt to mint before saleStartTime is updated
                await expect(
                    lingoNFT.connect(user1).mintEconomyBusinessClassNFT(economyClassTier, r, s, v, {
                        gasLimit: 30000000
                    })
                ).to.be.revertedWith("Minting not allowed outside the campaign window");
            });
            it("Should revert Business minting when saleStartTime is not set", async function() {
                // Prepare message to sign
                const messageHash = ethers.utils.solidityKeccak256(["address", "uint8"], [user1.address, businessClassTier]);
                const messageHashBytes = ethers.utils.arrayify(messageHash);
        
                // Sign the message
                businessSignature = await businessSigner.signMessage(messageHashBytes, {
                    gasLimit: 30000000
                });
                const { v, r, s } = ethers.utils.splitSignature(businessSignature);
        
                // Attempt to mint before saleStartTime is updated
                await expect(
                    lingoNFT.connect(user1).mintEconomyBusinessClassNFT(businessClassTier, r, s, v, {
                        gasLimit: 30000000
                    })
                ).to.be.revertedWith("Minting not allowed outside the campaign window");
            });
            it("Should revert First Class minting when saleStartTime is not set", async function() {
                // Prepare message to sign
                const messageHash = ethers.utils.solidityKeccak256(["address", "uint8"], [user2.address, firstClassTier]);
                const messageHashBytes = ethers.utils.arrayify(messageHash);
        
                // Sign the message with the firstSigner
                firstClassSignature = await firstSigner.signMessage(messageHashBytes, {
                    gasLimit: 30000000
                });
                const { v, r, s } = ethers.utils.splitSignature(firstClassSignature);
        
                // Attempt to mint before saleStartTime is updated
                await expect(
                    lingoNFT.connect(user2).mintFirstClassNFT(firstClassTier, r, s, v, { value: firstClassMintPrice, 
                        gasLimit: 30000000
                    })
                ).to.be.revertedWith("Minting not allowed outside the campaign window");
            });
        });
    });
    describe("Minting After Sale Start Time", function() {
    
        describe("Minting Economy, Business, and First Class NFT", function() {
            let economyClassTier = 0; 
            let businessClassTier = 1; 
            let firstClassTier = 2;
            let firstClassMintPrice = 2;
    
            before(async function() {
                // Deploy the contract
                const NFT = await ethers.getContractFactory("LingoNFT");
                lingoNFT = await NFT.deploy();
                await lingoNFT.deployed();
                    
                // Set a past sale start time
                const SaleStartTime = (await ethers.provider.getBlock('latest')).timestamp - 1; // 24 hours before the current time
                await lingoNFT.setSaleStartTime(SaleStartTime);
                
                //Set Signers
                await lingoNFT.setEconomySigner(economySigner.address, {
                    gasLimit: 30000000
                });   
                
                await lingoNFT.setBusinessSigner(businessSigner.address, {
                    gasLimit: 30000000
                });
                await lingoNFT.setFirstSigner(firstSigner.address, {
                    gasLimit: 30000000
                });

                // Set the mint price for First Class NFT
                firstClassMintPrice = ethers.utils.parseEther("1.0"); 
                await lingoNFT.setFirstClassMintPrice(firstClassMintPrice, {
                    gasLimit: 30000000
                });
            });
    
            it("Should allow Economy minting after saleStartTime is set and Economy Signer signature", async function() {
                
                const messageHash = ethers.utils.solidityKeccak256(["address", "uint8"], [user1.address, economyClassTier]);
                const messageHashBytes = ethers.utils.arrayify(messageHash);
                
                await lingoNFT.setEconomySigner(economySigner.address, {
                    gasLimit: 30000000
                });
                economySignature = await economySigner.signMessage(messageHashBytes);
                const { v, r, s } = ethers.utils.splitSignature(economySignature);
                SaleStartTime = (await ethers.provider.getBlock('latest')).timestamp - 86400; // 24 hours before the current time
                await lingoNFT.setSaleStartTime(SaleStartTime, {
                    gasLimit: 30000000
                });

                await expect(
                    lingoNFT.connect(user1).mintEconomyBusinessClassNFT(economyClassTier, r, s, v, {
                        gasLimit: 30000000
                    })
                ).to.emit(lingoNFT, 'Transfer'); // Assuming Transfer event is emitted on successful mint
            });
            it("Should revert Economy minting after saleStartTime is set and Business Signer signature", async function() {
                
                const messageHash = ethers.utils.solidityKeccak256(["address", "uint8"], [user1.address, economyClassTier]);
                const messageHashBytes = ethers.utils.arrayify(messageHash);
                
                await lingoNFT.setEconomySigner(businessSigner.address, {
                    gasLimit: 30000000
                });//set the business signer instead of economy
                economySignature = await economySigner.signMessage(messageHashBytes);
                const { v, r, s } = ethers.utils.splitSignature(economySignature);
                SaleStartTime = (await ethers.provider.getBlock('latest')).timestamp - 86400; // 24 hours before the current time
                await lingoNFT.setSaleStartTime(SaleStartTime, {
                    gasLimit: 30000000
                });

                await expect(
                    lingoNFT.connect(user1).mintEconomyBusinessClassNFT(economyClassTier, r, s, v,{
                    gasLimit: 30000000
                })
                ).to.be.revertedWith("Unauthorized Signer"); // Assuming Transfer event is emitted on successful mint
            });
            it("Should revert Economy minting after saleStartTime is set and Economy Signer signature but Business Class Tier", async function() {
                
                const messageHash = ethers.utils.solidityKeccak256(["address", "uint8"], [user1.address, economyClassTier]);
                const messageHashBytes = ethers.utils.arrayify(messageHash);
                
                await lingoNFT.setEconomySigner(economySigner.address,{
                    gasLimit: 30000000
                });
                await lingoNFT.setBusinessSigner(businessSigner.address,{
                    gasLimit: 30000000
                });
                economySignature = await economySigner.signMessage(messageHashBytes);
                const { v, r, s } = ethers.utils.splitSignature(economySignature);
                SaleStartTime = (await ethers.provider.getBlock('latest')).timestamp - 86400; // 24 hours before the current time
                await lingoNFT.setSaleStartTime(SaleStartTime,{
                    gasLimit: 30000000
                });
                await expect(
                    lingoNFT.connect(user1).mintEconomyBusinessClassNFT(businessClassTier, r, s, v,{
                    gasLimit: 30000000
                })
                ).to.be.revertedWith("Unauthorized Signer"); 
            });
            it("Should revert Economy minting after saleStartTime is set and Economy Signer signature but First Class Tier", async function() {
                
                const messageHash = ethers.utils.solidityKeccak256(["address", "uint8"], [user1.address, firstClassTier]);
                const messageHashBytes = ethers.utils.arrayify(messageHash);
                
                await lingoNFT.setEconomySigner(economySigner.address,{
                    gasLimit: 30000000
                });
                economySignature = await economySigner.signMessage(messageHashBytes);
                const { v, r, s } = ethers.utils.splitSignature(economySignature);
                SaleStartTime = (await ethers.provider.getBlock('latest')).timestamp - 86400; // 24 hours before the current time
                await lingoNFT.setSaleStartTime(SaleStartTime,{
                    gasLimit: 30000000
                });

                await expect(
                    lingoNFT.connect(user1).mintEconomyBusinessClassNFT(firstClassTier, r, s, v,{
                    gasLimit: 30000000
                })
                ).to.be.revertedWith("Incorrect Tier"); 
            });
            it("Should allow Business minting after saleStartTime is set and Business Signer signature", async function() {
                
                const messageHash = ethers.utils.solidityKeccak256(["address", "uint8"], [user1.address, businessClassTier]);
                const messageHashBytes = ethers.utils.arrayify(messageHash);
                
                await lingoNFT.setBusinessSigner(businessSigner.address,{
                    gasLimit: 30000000
                });
                businessSignature = await businessSigner.signMessage(messageHashBytes);
                const { v, r, s } = ethers.utils.splitSignature(businessSignature);
                SaleStartTime = (await ethers.provider.getBlock('latest')).timestamp - 86400; // 24 hours before the current time
                await lingoNFT.setSaleStartTime(SaleStartTime,{
                    gasLimit: 30000000
                });

                await expect(
                    lingoNFT.connect(user1).mintEconomyBusinessClassNFT(businessClassTier, r, s, v,{
                    gasLimit: 30000000
                })
                ).to.emit(lingoNFT, 'Transfer'); // Assuming Transfer event is emitted on successful mint
            });
            it("Should revert Business minting after saleStartTime is set and Economy Signer signature", async function() {
                
                const messageHash = ethers.utils.solidityKeccak256(["address", "uint8"], [user1.address, businessClassTier]);
                const messageHashBytes = ethers.utils.arrayify(messageHash);
                
                await lingoNFT.setBusinessSigner(economySigner.address,{
                    gasLimit: 30000000
                });//set wrong signer
                businessSignature = await businessSigner.signMessage(messageHashBytes);
                const { v, r, s } = ethers.utils.splitSignature(businessSignature);
                SaleStartTime = (await ethers.provider.getBlock('latest')).timestamp - 86400; // 24 hours before the current time
                await lingoNFT.setSaleStartTime(SaleStartTime,{
                    gasLimit: 30000000
                });

                await expect(
                    lingoNFT.connect(user1).mintEconomyBusinessClassNFT(businessClassTier, r, s, v,{
                    gasLimit: 30000000
                })
                ).to.be.revertedWith("Unauthorized Signer"); 
            });
            it("Should revert Business minting after saleStartTime is set and Business Signer signature but Economy Class Tier", async function() {
                
                const messageHash = ethers.utils.solidityKeccak256(["address", "uint8"], [user1.address, businessClassTier]);
                const messageHashBytes = ethers.utils.arrayify(messageHash);
                
                await lingoNFT.setEconomySigner(economySigner.address,{
                    gasLimit: 30000000
                });
                await lingoNFT.setBusinessSigner(businessSigner.address,{
                    gasLimit: 30000000
                });
                businessSignature = await businessSigner.signMessage(messageHashBytes);
                const { v, r, s } = ethers.utils.splitSignature(businessSignature);
                SaleStartTime = (await ethers.provider.getBlock('latest')).timestamp - 86400; // 24 hours before the current time
                await lingoNFT.setSaleStartTime(SaleStartTime,{
                    gasLimit: 30000000
                });

                await expect(
                    lingoNFT.connect(user1).mintEconomyBusinessClassNFT(economyClassTier, r, s, v,{
                    gasLimit: 30000000
                })
                ).to.be.revertedWith("Unauthorized Signer"); 
            });
            it("Should revert Business minting after saleStartTime is set and Business Signer signature but First Class Tier", async function() {
                
                const messageHash = ethers.utils.solidityKeccak256(["address", "uint8"], [user1.address, firstClassTier]);
                const messageHashBytes = ethers.utils.arrayify(messageHash);
                
                await lingoNFT.setEconomySigner(economySigner.address,{
                    gasLimit: 30000000
                });
                economySignature = await economySigner.signMessage(messageHashBytes);
                const { v, r, s } = ethers.utils.splitSignature(economySignature);
                SaleStartTime = (await ethers.provider.getBlock('latest')).timestamp - 86400; // 24 hours before the current time
                await lingoNFT.setSaleStartTime(SaleStartTime,{
                    gasLimit: 30000000
                });

                await expect(
                    lingoNFT.connect(user1).mintEconomyBusinessClassNFT(firstClassTier, r, s, v,{
                    gasLimit: 30000000
                })
                ).to.be.revertedWith("Incorrect Tier"); 
            });

            it("Should allow First minting after saleStartTime is set and First Signer signature", async function() {
                
                const messageHash = ethers.utils.solidityKeccak256(["address", "uint8"], [user1.address, firstClassTier]);
                const messageHashBytes = ethers.utils.arrayify(messageHash);
                
                await lingoNFT.setFirstSigner(firstSigner.address,{
                    gasLimit: 30000000
                });
                firstSignature = await firstSigner.signMessage(messageHashBytes);
                const { v, r, s } = ethers.utils.splitSignature(firstSignature);
                SaleStartTime = (await ethers.provider.getBlock('latest')).timestamp - 86400; // 24 hours before the current time
                await lingoNFT.setSaleStartTime(SaleStartTime,{
                    gasLimit: 30000000
                });

                await expect(
                    lingoNFT.connect(user1).mintFirstClassNFT(firstClassTier, r, s, v, { value: firstClassMintPrice , gasLimit: 30000000})
                ).to.emit(lingoNFT, 'Transfer'); 
                contractBalance = await ethers.provider.getBalance(lingoNFT.address);
                ownerBalance = await ethers.provider.getBalance(owner.address);
                console.log("First Class minting price: ", firstClassMintPrice);
                console.log("Contract Balance after first Class minting : ", contractBalance);
                console.log("Owner Balance after first Class minting : ", ownerBalance);
            });
            it("Should revert First minting after saleStartTime is set and not First Signer signature", async function() {
                
                const messageHash = ethers.utils.solidityKeccak256(["address", "uint8"], [user1.address, firstClassTier]);
                const messageHashBytes = ethers.utils.arrayify(messageHash);
                
                await lingoNFT.setFirstSigner(businessSigner.address,{
                    gasLimit: 30000000
                });//Set wrong signer
                firstSignature = await firstSigner.signMessage(messageHashBytes);
                const { v, r, s } = ethers.utils.splitSignature(firstSignature);
                SaleStartTime = (await ethers.provider.getBlock('latest')).timestamp - 86400; // 24 hours before the current time
                await lingoNFT.setSaleStartTime(SaleStartTime,{
                    gasLimit: 30000000
                });

                await expect(
                    lingoNFT.connect(user1).mintFirstClassNFT(firstClassTier, r, s, v, { value: firstClassMintPrice , gasLimit : 3000000})
                ).to.be.revertedWith("Unauthorized Signer");
            });
            it("Should revert First minting after saleStartTime is set and First Signer signature but incorrect Tier in message", async function() {
                
                const messageHash = ethers.utils.solidityKeccak256(["address", "uint8"], [user1.address, businessClassTier]);
                const messageHashBytes = ethers.utils.arrayify(messageHash);
                
                await lingoNFT.setFirstSigner(firstSigner.address,{
                    gasLimit: 30000000
                });//Set wrong signer
                firstSignature = await firstSigner.signMessage(messageHashBytes);
                const { v, r, s } = ethers.utils.splitSignature(firstSignature);
                SaleStartTime = (await ethers.provider.getBlock('latest')).timestamp - 86400; // 24 hours before the current time
                await lingoNFT.setSaleStartTime(SaleStartTime,{
                    gasLimit: 30000000
                });

                await expect(
                    lingoNFT.connect(user1).mintFirstClassNFT(firstClassTier, r, s, v, { value: firstClassMintPrice , gasLimit : 3000000})
                ).to.be.revertedWith("Unauthorized Signer");
            });
            it("Should revert First minting after saleStartTime is set and First Signer signature but not First Tier in parameter", async function() {
                
                const messageHash = ethers.utils.solidityKeccak256(["address", "uint8"], [user1.address, businessClassTier]);
                const messageHashBytes = ethers.utils.arrayify(messageHash);
                
                await lingoNFT.setBusinessSigner(businessSigner.address,{
                    gasLimit: 30000000
                });
                await lingoNFT.setFirstSigner(firstSigner.address,{
                    gasLimit: 30000000
                });
                firstSignature = await firstSigner.signMessage(messageHashBytes);
                const { v, r, s } = ethers.utils.splitSignature(firstSignature);
                SaleStartTime = (await ethers.provider.getBlock('latest')).timestamp - 86400; // 24 hours before the current time
                await lingoNFT.setSaleStartTime(SaleStartTime,{
                    gasLimit: 30000000
                });

                await expect(
                    lingoNFT.connect(user1).mintFirstClassNFT(businessClassTier, r, s, v, { value: firstClassMintPrice , gasLimit : 3000000})
                ).to.be.revertedWith("This function is only for FIRST_CLASS tier");
            });
            it("Should revert First class minting if message value is below firstmintPrice", async function() {
                
                const messageHash = ethers.utils.solidityKeccak256(["address", "uint8"], [user1.address, firstClassTier]);
                const messageHashBytes = ethers.utils.arrayify(messageHash);
                
                await lingoNFT.setFirstSigner(firstSigner.address,{
                    gasLimit: 30000000
                });
                firstSignature = await firstSigner.signMessage(messageHashBytes);
                const { v, r, s } = ethers.utils.splitSignature(firstSignature);
                SaleStartTime = (await ethers.provider.getBlock('latest')).timestamp - 86400; // 24 hours before the current time
                await lingoNFT.setSaleStartTime(SaleStartTime,{
                    gasLimit: 30000000
                });
                await lingoNFT.setFirstClassMintPrice(2,{
                    gasLimit: 30000000
                });
                await expect(
                    lingoNFT.connect(user1).mintFirstClassNFT(firstClassTier, r, s, v, { value: 1, gasLimit : 3000000})
                ).to.be.revertedWith("Ether sent is not correct");
            });
        });
    });
    
    describe("Get Current Timestamp", () => {

        it("returns current timestamp", async () => {
            const result = await lingoNFT.getCurrentTimestamp();
            timestamp = BNtoNumber(result);
            expect(result).to.be.instanceOf(BigNumber);
        });
    });

    describe("Set Sale Start Date", () => {

        it("reverts with Ownable: caller is not the owner", async () => {
            try {
                await lingoNFT.connect(user1).setSaleStartTime(0,{
                    gasLimit: 30000000
                });
                assert.fail("Expected function to revert");
            } catch (error) {
                expect(JSON.parse(error.body).error.message).to.contain("Ownable: caller is not the owner");
            }
        });
        it("returns Minting Start", async () => {
            await lingoNFT.connect(owner).setSaleStartTime(Math.floor(Date.now() + 1000 ),{
                    gasLimit: 30000000
                });
            expect(BNtoNumber(await lingoNFT.getSaleStartTime())).to.be.above(timestamp);
        });

    });
    
    describe("Set First Class Mint Price", async () => {
        const newMintPrice = ethers.utils.parseEther("0.1"); // 0.5 ETH
        it("should allow only the owner to set the mint price", async () => {
            await expect(lingoNFT.connect(user1).setFirstClassMintPrice(newMintPrice, {
                gasLimit: 30000000
            }))
                .to.be.revertedWith("Ownable: caller is not the owner");
        });
        it("should update the mint price correctly", async () => {
            await lingoNFT.connect(owner).setFirstClassMintPrice(newMintPrice, {
                gasLimit: 30000000
            });
            expect(await lingoNFT.firstClassMintPrice()).to.equal(newMintPrice);
        });
    });

    describe("Before Minting period", () => {
        beforeEach(async () => {
            await lingoNFT.connect(owner).setSaleStartTime(Math.floor(Date.now() + 1000 / 1000),{
                    gasLimit: 30000000
                });
        });
        it("returns saleStart greater than current time", async () => {
            expect(BNtoNumber(await lingoNFT.saleStartTime())).to.be.above(Math.floor(Date.now() / 1000));
        });
    });

    describe("During Minting Period", () => {

        beforeEach(async () => {
            await lingoNFT.connect(owner).setSaleStartTime(BNtoNumber(await lingoNFT.getCurrentTimestamp()) + 2, {
                gasLimit: 30000000
            });           
        });
        it("returns mintingStart less than current time", async () => {
            expect(BNtoNumber(await lingoNFT.saleStartTime())).to.be.below(Math.floor(Date.now()) + 1000);
        });
        describe("Set Economy Signer", async () => {
            it("reverts with Ownable: caller is not the owner", async () => {
                try {
                    await lingoNFT.connect(user1).setEconomySigner("0xdD2FD4581271e230360230F9337D5c0430Bf44C0", {
                        gasLimit: 30000000
                    });
                    assert.fail("Expected function to revert");
                } catch (error) {
                    expect(JSON.parse(error.body).error.message).to.contain("Ownable: caller is not the owner");
                }
            });
            it("returns true", async () => {
                try {
                    const result = await lingoNFT.connect(owner).setEconomySigner("0xdD2FD4581271e230360230F9337D5c0430Bf44C0", {
                        gasLimit: 30000000
                    });
                    expect(await lingoNFT.economySigner()).to.be.equal("0xdD2FD4581271e230360230F9337D5c0430Bf44C0")
                } catch (error) {
                    assert.fail("Expected function to pass");
                }
            });
        });

        describe("Set Business Signer", async () => {
            it("reverts with Ownable: caller is not the owner", async () => {
                try {
                    await lingoNFT.connect(user1).setBusinessSigner("0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199", {
                        gasLimit: 30000000
                    });
                    assert.fail("Expected function to revert");
                } catch (error) {
                    expect(JSON.parse(error.body).error.message).to.contain("Ownable: caller is not the owner");
                }
            });

            it("returns true", async () => {
                try {
                    const result = await lingoNFT.connect(owner).setBusinessSigner("0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199", {
                        gasLimit: 30000000
                    });
                    expect(await lingoNFT.businessSigner()).to.be.equal("0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199")
                } catch (error) {
                    assert.fail("Expected function to pass");
                }
            });
        });
        describe("Airdrop Private Jet NFT", () => {
                let recipientAddresses = ["0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc", "0x976EA74026E726554dB657fA54763abd0C3a0aa9", "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955", "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f"]
                it("reverts with Ownable: caller is not the owner", async () => {
                    try {
                        await lingoNFT.connect(user1).mintPrivateJetNFT(recipientAddresses, {
                            gasLimit: 30000000
                        });
                        assert.fail("Expected function to revert");
                    } catch (error) {
                        expect(JSON.parse(error.body).error.message).to.contain("Ownable: caller is not the owner");
                    }
                })
                it("returns true", async () => {
                    const result = await lingoNFT.connect(owner).mintPrivateJetNFT(recipientAddresses, {
                        gasLimit: 30000000
                    });
                    expect(result).to.not.haveOwnProperty("error");
                })
                it("should correctly mint and airdrop Private Jet NFTs to multiple recipients", async () => {
                    // Perform the minting by the owner
                    await lingoNFT.connect(owner).mintPrivateJetNFT(recipientAddresses, {
                        gasLimit: 30000000
                    });
            
                    // Assuming token IDs start from 1 and no other tokens have been minted yet
                    const startingTokenId = 0;
            
                    // Check if each recipient received their NFT
                    for (let i = 0; i < recipientAddresses.length; i++) {
                        const tokenId = startingTokenId + i;
                        const ownerOfToken = await lingoNFT.ownerOf(tokenId);
                        expect(ownerOfToken).to.equal(recipientAddresses[i]);
                    }
                })
        });
    });
    describe("Airdrop NFT", function() {
        let recipientAddresses = ["0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc", "0x976EA74026E726554dB657fA54763abd0C3a0aa9", "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955", "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f"]
        let economyClassTier = 0; 
        let businessClassTier = 1; 
        let firstClassTier = 2;
        let privateClassTier = 3;
    
        it("should revert if not called by the owner", async function() {
            await expect(lingoNFT.connect(user1).airdropNFT(recipientAddresses, economyClassTier,{
                    gasLimit: 30000000
                }))
                .to.be.revertedWith("Ownable: caller is not the owner");
        });
        it("should correctly airdrop Economy Class NFTs to multiple recipients", async function() {
            await lingoNFT.connect(owner).airdropNFT(recipientAddresses, economyClassTier,{
                    gasLimit: 30000000
                });
            const startingTokenId = 0;
            
            // Check if each recipient received their NFT
            for (let i = 0; i < recipientAddresses.length; i++) {
                const tokenId = startingTokenId + i;
                const ownerOfToken = await lingoNFT.ownerOf(tokenId,{
                    gasLimit: 30000000
                });
                expect(ownerOfToken).to.equal(recipientAddresses[i]);
            }
        });
        it("should revert when attempting to airdrop Private Jet Class NFTs ", async function() {
            // Assuming FIRST_CLASS is not allowed for airdrop based on your function logic
            await expect(lingoNFT.connect(owner).airdropNFT(recipientAddresses, privateClassTier, {
                gasLimit: 30000000
            }))
                .to.be.revertedWith("Incorrect Tier");
        })

    });
    describe("Withdraw Function", function() { 
        let lingoNFT;
        let owner;
        let user1;
        let user2;

        beforeEach(async function () {
            // Deploy your contract here before each test
            const LingoNFT = await ethers.getContractFactory("LingoNFT");
            [owner, user1, user2] = await ethers.getSigners();
            lingoNFT = await LingoNFT.deploy();
            await lingoNFT.deployed();
        });
        it("should allow only the owner to withdraw", async function() {
            // Send some Ether to the contract
            await owner.sendTransaction({
                to: lingoNFT.address,
                value: ethers.utils.parseEther("1.0"), // Sending 1 Ether
            });
    
            // Try to withdraw with an account that is not the owner
            await expect(lingoNFT.connect(user1).withdraw()).to.be.revertedWith("Ownable: caller is not the owner");
        });
       
it("sends ether to the contract and checks balance", async function () {
        await owner.sendTransaction({
            to: lingoNFT.address,
            value: ethers.utils.parseEther("5"),
        });
        expect(await ethers.provider.getBalance(lingoNFT.address)).to.equal(ethers.utils.parseEther("5"));
    });

    it("should allow the owner to withdraw when there is Ether", async function() {
        // Send some Ether to the contract to ensure it has a balance
        await owner.sendTransaction({
            to: lingoNFT.address,
            value: ethers.utils.parseEther("1.0"),
        });
    
        const initialOwnerBalance = await ethers.provider.getBalance(owner.address);
        const contractBalance = await ethers.provider.getBalance(lingoNFT.address);
    
        // Ensure the contract has balance before withdrawing
        expect(contractBalance).to.be.gt(0);
    
        // Withdraw
        const tx = await lingoNFT.connect(owner).withdraw();
        const receipt = await tx.wait();
        const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);
        const finalOwnerBalance = await ethers.provider.getBalance(owner.address);
    
        // Check that the owner received the Ether minus gas fees
        expect(finalOwnerBalance.add(gasUsed)).to.be.closeTo(initialOwnerBalance.add(contractBalance), ethers.utils.parseEther("0.01"));
    
        // Check that the contract's balance is now 0
        expect(await ethers.provider.getBalance(lingoNFT.address)).to.equal(0);
    });
    

    it("should revert if there is no Ether to withdraw", async function() {
        // Assuming the contract currently has a 0 balance
        await expect(lingoNFT.connect(owner).withdraw()).to.be.revertedWith("No funds left to withdraw");
    });
    });
});