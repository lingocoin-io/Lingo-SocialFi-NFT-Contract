const express = require("express");
const ethers = require("ethers");
const app = express();
app.use(express.json());

// Configuration
const PORT = 3000;
const ECONOMY_SIGNER =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const BUSINESS_SIGNER =
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a";
const FIRST_SIGNER =
  "0x689af8efa8c651a91ad287602527f3af2fe9f6501a7ac4b061667b5a93e037fd";
const BACKEND_VERIFY_URL = "http://backend-url/api";

const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545/");
const economySigner = new ethers.Wallet(ECONOMY_SIGNER, provider);
const businessSigner = new ethers.Wallet(BUSINESS_SIGNER, provider);
const firstSigner = new ethers.Wallet(BUSINESS_SIGNER, provider);
app.use(express.json());

// Function to sign the minting message
async function signMintingMessage(signer, address, tier) {
  const messageHash = ethers.utils.solidityKeccak256(
    ["address", "uint256"],
    [address, tier],
  );
  const signature = await signer.signMessage(
    ethers.utils.arrayify(messageHash),
  );
  const splitSignature = ethers.utils.splitSignature(signature);
  return splitSignature;
}

app.post("/sign", async (req, res) => {
  const { address, tier } = req.body;
  if (!address || tier === undefined) {
    return res.status(400).send({ error: "Address and tier are required" });
  }

  let signer;
  switch (tier) {
    case 0: // Economy Class
      signer = economySigner;
      break;
    case 1: // Business Class
      signer = businessSigner;
      break;
    case 2: // First Class
      signer = firstSigner; // Use firstSigner for First Class
      break;
    default:
      return res.status(400).send({ error: "Invalid tier" });
  }

  try {
    const { r, s, v } = await signMintingMessage(signer, address, tier);
    res.send({ address, tier, r, s, v });
  } catch (err) {
    console.error("Error signing message:", err);
    res.status(500).send({ error: "Error signing message" });
  }
});

app.listen(PORT, () => {
  console.log(`Signer Microservice running on port ${PORT}`);
});
