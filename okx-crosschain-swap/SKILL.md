---
name: okx-crosschain-swap
description: "Use this skill when the user wants to swap or bridge tokens across different chains, move assets from one blockchain to another, or asks things like 'swap USDC from Base to Arbitrum', 'bridge ETH to Optimism', 'move my USDT from Ethereum to Base', 'cross chain swap 100 USDC Base to Arbitrum USDT', 'bridge tokens', 'send USDC to another chain', 'swap across chains', 'what chains does LI.FI support', 'move funds from polygon to base', 'cheapest bridge route', 'how long does bridging take'. Uses LI.FI API for cross-chain routing — checks chain support, finds optimal bridge route (best output, lowest fees, fastest time), shows quote with bridge details, executes via onchainos wallet contract-call, then polls transfer status until confirmed. No LI.FI API key required for basic usage. Works across 30+ chains including Ethereum, Base, Arbitrum, Optimism, Polygon, Solana, BNB Chain, Avalanche, and more."
license: MIT
metadata:
  author: okx
  version: "1.0.0"
  homepage: "https://web3.okx.com"
---

# OKX Cross-Chain Swap

Bridge and swap tokens across any chain using LI.FI's cross-chain routing. Finds the optimal bridge route, shows you the full quote (output amount, fees, bridge used, estimated time), executes in one transaction, and tracks the transfer until confirmed on the destination chain.

## Pre-flight Checks

> Read `../okx-agentic-wallet/_shared/preflight.md`. If that file does not exist, read `_shared/preflight.md` instead.

## Chain Support

> Read `../okx-agentic-wallet/_shared/chain-support.md` for the full list of supported chain names and chainIndex values. If that file does not exist, read `_shared/chain-support.md` instead.

## API Reference

> Read `references/lifi-api.md` for full LI.FI endpoint reference, parameters, and response schemas.

## Skill Routing

| Need | Skill/Tool |
|---|---|
| Check supported chains | LI.FI → `GET https://li.quest/v1/chains` |
| Check supported tokens | LI.FI → `GET https://li.quest/v1/tokens?chains=<id>` |
| Get cross-chain quote | LI.FI → `GET https://li.quest/v1/quote` |
| Track transfer status | LI.FI → `GET https://li.quest/v1/status` |
| Source wallet balance | `okx-agentic-wallet` → `onchainos wallet balance` |
| Execute bridge tx | `okx-dex-swap` → `onchainos wallet contract-call` |
| Destination balance check | `okx-agentic-wallet` → `onchainos wallet balance` |

---

## Execution Flow

### Step 1 — Parse Intent

Extract from user message:

| Parameter | How to get |
|---|---|
| From chain | From message (e.g. "from Base", "on Ethereum") |
| To chain | From message (e.g. "to Arbitrum", "on Polygon") |
| From token | From message (e.g. "USDC", "ETH") |
| To token | From message — if not specified, use same token as from |
| Amount | From message (e.g. "100 USDC", "0.5 ETH") |

**Example parse:**
```
"swap 100 USDC from Base to Arbitrum USDT"
→ fromChain: 8453 (Base)
→ toChain:   42161 (Arbitrum)
→ fromToken: USDC  (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)
→ toToken:   USDT  (0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9)
→ amount:    100 USDC = 100000000 (6 decimals)
```

---

### Step 2 — Verify Chain Support

```bash
curl -s "https://li.quest/v1/chains"
```

Check both fromChain and toChain exist in response.

**Common chain IDs:**

| Chain | Chain ID |
|---|---|
| Ethereum | 1 |
| Base | 8453 |
| Arbitrum | 42161 |
| Optimism | 10 |
| Polygon | 137 |
| BNB Chain | 56 |
| Avalanche | 43114 |
| Solana | 1151111081099592 |
| Linea | 59144 |
| Scroll | 534352 |

If either chain not found:
```
"❌ <chainName> is not supported by LI.FI cross-chain routing.
 Supported chains: Ethereum, Base, Arbitrum, Optimism, Polygon, BNB Chain...
 Try a different destination chain."
```

---

### Step 3 — Verify Token Support + Resolve Addresses

```bash
curl -s "https://li.quest/v1/tokens?chains=<fromChainId>,<toChainId>"
```

For each chain, find the token by symbol → get contract address and decimals.

**If token not found on destination chain:**
```
"⚠️ USDT not found on Arbitrum via LI.FI.
 Available tokens on Arbitrum: USDC, ETH, WBTC, DAI...
 Want to receive USDC instead?"
```

---

### Step 4 — Check Source Wallet Balance

```bash
onchainos wallet balance --chain <fromChainId>
```

Verify user has:
- Enough of the fromToken (amount + buffer)
- Enough native token for gas on source chain

If insufficient:
```
"❌ Insufficient balance.
 You have: 45.20 USDC on Base
 You need: 100.00 USDC + gas
 Short by: 54.80 USDC"
```

---

### Step 5 — Get Cross-Chain Quote

```bash
curl -s "https://li.quest/v1/quote?\
fromChain=<fromChainId>\
&toChain=<toChainId>\
&fromToken=<fromTokenAddress>\
&toToken=<toTokenAddress>\
&fromAmount=<amountInSmallestUnit>\
&fromAddress=<walletAddress>\
&toAddress=<walletAddress>"
```

**Key response fields:**
- `estimate.toAmount` — amount received on destination (in smallest unit)
- `estimate.toAmountMin` — minimum guaranteed (slippage protected)
- `estimate.feeCosts` — bridge fees breakdown
- `estimate.gasCosts` — gas estimate on source chain
- `estimate.executionDuration` — estimated time in seconds
- `toolDetails.name` — bridge being used (e.g. "Stargate", "Across", "Hop")
- `transactionRequest` — ready-to-sign tx data

**Convert amounts:**
```
toAmount_human = toAmount / 10^decimals
fees_usd = sum(feeCosts[].amountUSD)
gas_usd = sum(gasCosts[].amountUSD)
duration_min = executionDuration / 60
```

---

### Step 6 — Display Quote

```
Cross-Chain Swap Quote
──────────────────────────────────────────────────────────
From:     100.00 USDC on Base
To:       99.21 USDT on Arbitrum
Min out:  98.72 USDT  (slippage: 0.5%)

Bridge:   Stargate V2  ⚡
Fees:     $0.48  (bridge fee)
Gas:      $0.09  (Base → sign here)
Total cost: $0.57

Est. time: ~3 minutes
──────────────────────────────────────────────────────────
Rate:     1 USDC = 0.9921 USDT
You save: $0 vs manual bridge
──────────────────────────────────────────────────────────
Confirm? (yes/no)
```

**If amount out is significantly low (>2% loss):**
```
⚠️ High slippage detected — you lose 2.3% in fees.
Consider: larger amount, different token pair, or direct bridge.
Still confirm? (yes/no)
```

---

### Step 7 — Execute Transaction

After user confirms, execute the bridge transaction:

```bash
onchainos wallet contract-call \
  --chain <fromChainId> \
  --contract <transactionRequest.to> \
  --calldata <transactionRequest.data> \
  --value <transactionRequest.value> \
  --gas-limit <transactionRequest.gasLimit> \
  --wallet <walletAddress>
```

**Submitted:**
```
✅ Bridge Transaction Submitted
──────────────────────────────────────────────────────────
Source tx:  0xabc...def (Base)
Bridge:     Stargate V2
Tracking:   Polling every 15 seconds...
──────────────────────────────────────────────────────────
```

---

### Step 8 — Track Transfer Status

Poll until DONE or FAILED:

```bash
curl -s "https://li.quest/v1/status?\
txHash=<sourceTxHash>\
&fromChain=<fromChainId>\
&toChain=<toChainId>"
```

**Status values:**
```
NOT_FOUND → tx not indexed yet, wait 10s and retry
PENDING   → bridge in progress, keep polling
DONE      → completed ✅
FAILED    → failed ❌
```

**Poll loop (every 15 seconds, max 20 attempts = 5 min):**
```
Attempt 1:  PENDING... (Stargate processing)
Attempt 2:  PENDING... (waiting for destination confirmation)
Attempt 3:  DONE ✅
```

**On DONE:**
```
✅ Cross-Chain Swap Complete!
──────────────────────────────────────────────────────────
Sent:       100.00 USDC on Base
Received:   99.24 USDT on Arbitrum  ✅
Bridge:     Stargate V2
Time taken: 2m 41s
Source tx:  0xabc...def
Dest tx:    0x123...456
──────────────────────────────────────────────────────────
Your USDT is now on Arbitrum.
Want to deposit it into yield? → try okx-yield-optimizer
```

**On PARTIAL (received different token):**
```
⚠️ Swap partially completed
Received: 99.24 USDC (not USDT — bridge swapped to available token)
Still successful — funds arrived on Arbitrum.
```

**On FAILED:**
```
❌ Bridge transfer failed.
Reason: <error message>
Your funds should be returned to Base within 30 minutes.
Check status manually: https://scan.li.fi/tx/<txHash>
```

---

### Step 9 — Confirm Destination Balance

After DONE, verify arrival:

```bash
onchainos wallet balance --chain <toChainId>
```

```
Destination Balance — Arbitrum
──────────────────────────────────────────────────────────
USDT:  99.24 USDT  ✅ (just bridged)
ETH:   0.012 ETH   (for gas)
──────────────────────────────────────────────────────────
```

---

## Common Cross-Chain Routes

| Route | Bridge Used | Typical Time | Fee |
|---|---|---|---|
| Base → Arbitrum (USDC) | Stargate V2 / Across | 2–5 min | ~$0.50 |
| Ethereum → Base (ETH) | Across / Hop | 1–3 min | ~$2–5 |
| Arbitrum → Optimism | Stargate / Hop | 3–7 min | ~$0.30 |
| Polygon → Ethereum | Stargate | 5–15 min | ~$1–3 |
| BNB → Arbitrum | Stargate | 3–7 min | ~$0.50 |

---

## No API Key Usage

LI.FI quote endpoint works without an API key at reduced rate limits (sufficient for skill usage):

```
Rate limit without key: ~10 req/min (enough for normal use)
Rate limit with key:    higher (get free key at portal.li.fi)
```

If rate limited (HTTP 429):
```
"⚠️ Rate limited by LI.FI. Waiting 10 seconds before retry..."
→ Retry once after 10s
→ If still limited: "Please try again in 1 minute"
```

---

## Risk Rules

| Situation | Action |
|---|---|
| Slippage > 2% | Warn before confirming |
| Estimated time > 30 min | Warn — slow route, suggest alternatives |
| Both chains same | Route to okx-dex-swap instead (same-chain swap) |
| fromToken not found on fromChain | Ask user to verify token symbol/chain |
| toToken not found on toChain | Suggest using same token (e.g. USDC→USDC) |
| Transfer FAILED | Inform funds will be refunded automatically |
| Amount < $5 | Warn — fees may exceed transfer value |

---

## Amount Display Rules

- Human-readable amounts (`100.00 USDC`, `99.24 USDT`)
- Fees in USD (`$0.57 total`)
- Time in minutes (`~3 minutes`)
- Always show minimum received (slippage-protected amount)
- Always show source AND destination tx hashes when available
- Always note: *"Cross-chain transfers are irreversible once submitted. Verify destination address before confirming."*
