const express = require('express');
const ethers = require('ethers');
const axios = require('axios');
const app = express();
app.use(express.json());

// Configuration
const PORT = 3000;
const SIGNER_PRIVATE_KEY = "0xde9be858da4a475276426320d5e9262ecfc3ba460bfac56360bfa6c4c28b4ee0";
const LINGO_NFT_CONTRACT_ADDRESS = "0xcD71582A11f4c60c8FB7685c4BdD1b748c0e764C";
// const BACKEND_VERIFY_URL = 'http://backend-url/api';

const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545/');
const signer = new ethers.Wallet(SIGNER_PRIVATE_KEY, provider);
const express = require('express');
const ethers = require('ethers');
const axios = require('axios');
app.use(express.json());

app.post('/sign', async (req, res) => {
    const { address, tier } = req.body;
    if (!address || tier === undefined) {
        return res.status(400).send({ error: 'Address and tier are required' });
    }

    domain = {
        name: "Lingo NFT",
        version: "1",
        chainId: 80001,
        verifyingContract: LINGO_NFT_CONTRACT_ADDRESS,
    }

    signature = await signer._signTypedData(domain, {
        MintData: [
            { name: "sender", type: "address" },
            { name: "tier", type: "uint8" },
        ]
    }, {
        sender: address,
        tier: tier
    })


    try {
        const { v, r, s } = ethers.utils.splitSignature(signature);
        res.send({ address, tier, r, s, v });
    } catch (err) {
        console.error('Error signing message:', err);
        res.status(500).send({ error: 'Error signing message' });
    }
});

app.listen(PORT, () => {
    console.log(`Signer Microservice running on port ${PORT}`);
});
