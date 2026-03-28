const fetch = require("node-fetch");
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));
app.use(express.json());

app.post("/scan", async (req, res) => {
  const { wallet, chain } = req.body;

  if (!wallet) return res.status(400).json({ error: "Wallet address required" });

  const prompt = `You are a Web3 wallet reputation and risk analysis agent.

Wallet Address: ${wallet}
Chain: ${chain || "Ethereum"}

Return ONLY a JSON object, no markdown, no backticks:

{
  "trustScore": 75,
  "verdict": "Moderately active wallet with mixed signals",
  "riskLevel": "MODERATE RISK",
  "metrics": [
    {"label": "WALLET AGE", "value": "2 years", "sub": "Active since 2022"},
    {"label": "TX COUNT", "value": "142", "sub": "Regular activity"},
    {"label": "PROTOCOLS USED", "value": "5", "sub": "Uniswap, Aave, OpenSea"},
    {"label": "FIRST SEEN", "value": "2022", "sub": null}
  ],
  "analysis": "This wallet has been active for approximately two years with consistent DeFi usage across multiple protocols. Transaction patterns suggest a retail user with moderate experience. No direct association with known exploit contracts detected. Interaction history includes Uniswap swaps and occasional NFT activity on OpenSea.",
  "flags": [
    {"severity": "green", "text": "Wallet age over 1 year — established address"},
    {"severity": "green", "text": "Multiple reputable protocol interactions detected"},
    {"severity": "yellow", "text": "Some interaction with unverified token contracts"},
    {"severity": "yellow", "text": "Moderate transaction volume — limited track record"}
  ],
  "recommendation": "This wallet appears relatively safe to transact with. Exercise standard caution and verify the transaction details before proceeding."
}

Adjust the values based on the wallet address. If it contains Dead or Bad give low score. If it is Vitalik address 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 give score 95. Otherwise give moderate score. Return valid JSON only.`;

  try {
    console.log("Calling Anthropic API...");
    console.log("API Key present:", !!process.env.ANTHROPIC_API_KEY);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await response.json();
    console.log("Anthropic response status:", response.status);
    console.log("Anthropic response:", JSON.stringify(data));

    if (!data.content) {
      console.error("No content in response:", data);
      return res.status(500).json({ error: "No content returned from AI" });
    }

    const text = data.content.map(b => b.text || "").join("");
    const clean = text.replace(/```json|```/g, "").trim();
    const result = JSON.parse(clean);
    res.json(result);
  } catch (err) {
    console.error("Full error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/", (req, res) => res.send("ChainVerify API is running."));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
