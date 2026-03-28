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

  const prompt = `You are a Web3 wallet reputation and risk analysis agent. A user wants to assess the trustworthiness of a wallet before transacting.

Wallet Address: ${wallet}
Chain: ${chain || "Ethereum"}

Analyze this wallet and return ONLY a JSON object (no markdown, no backticks, no extra text) with this exact structure:

{
  "trustScore": <integer 0-100>,
  "verdict": "<one clear sentence verdict about this wallet, max 8 words>",
  "riskLevel": "<one of: LOW RISK | MODERATE RISK | HIGH RISK | CRITICAL RISK>",
  "metrics": [
    {"label": "WALLET AGE", "value": "<realistic value>", "sub": "<context>"},
    {"label": "TX COUNT", "value": "<realistic number>", "sub": "<context>"},
    {"label": "PROTOCOLS USED", "value": "<number>", "sub": "<e.g. Uniswap, Aave...>"},
    {"label": "FIRST SEEN", "value": "<year or timeframe>", "sub": null}
  ],
  "analysis": "<3-4 sentences of plain English analysis of this wallet behavior, patterns, and history. Be specific and insightful. Mention real Web3 protocols and behaviors.>",
  "flags": [
    {"severity": "<red|yellow|green>", "text": "<specific signal or behavior detected>"},
    {"severity": "<red|yellow|green>", "text": "<specific signal or behavior detected>"},
    {"severity": "<red|yellow|green>", "text": "<specific signal or behavior detected>"},
    {"severity": "<red|yellow|green>", "text": "<specific signal or behavior detected>"}
  ],
  "recommendation": "<1-2 sentences on whether to transact with this wallet and any precautions to take>"
}

Important:
- If the address looks like vitalik.eth or Vitalik known address (0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045), give a high trust score (85-98) with appropriate signals.
- If the address contains Dead or Bad or looks suspicious, give a low score (5-30) with red flags.
- For random/unknown addresses, give a moderate score (45-70) with mixed signals.
- Make the analysis feel realistic and informed, referencing real DeFi protocols, behaviors, and Web3 patterns.
- Always return valid JSON only.`;

  try {
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
    const text = data.content.map(b => b.text || "").join("");
    const clean = text.replace(/```json|```/g, "").trim();
    const result = JSON.parse(clean);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Scan failed" });
  }
});

app.get("/", (req, res) => res.send("ChainVerify API is running."));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
