---
name: okx-yield-optimizer
description: "Use this skill whenever the user wants to maximize yield, earn passive income, find best APY, auto-invest in DeFi, search for highest returns, compare yields across protocols, deposit into staking or lending, or asks questions like 'maximize my APY', 'where should I put my USDC for best yield', 'find best staking for SOL', 'highest APY for USDT', 'auto-invest my tokens', 'earn yield on my assets', 'best DeFi returns', 'compare lending rates', 'find best pool for my USDC', 'stake my ETH', '最高年化', '最优收益', '自动理财', '质押', '借贷收益'. Scans 43 DeFi platforms via onchainos defi, cross-references DeFi Llama for market context, ranks by APY + TVL + risk, and auto-deposits into the best executable opportunity. Works across all chains — Ethereum, Solana, BNB Chain, Sui, Avalanche, Base, Arbitrum, X Layer and more."
license: MIT
metadata:
  author: okx
  version: "1.0.0"
  homepage: "https://web3.okx.com"
---

# OKX Yield Optimizer

Scans 43 DeFi platforms, cross-references DeFi Llama market data, and auto-deposits your tokens into the highest-yield executable opportunity — all in one session.

## Pre-flight Checks

> Read `../okx-agentic-wallet/_shared/preflight.md`. If that file does not exist, read `_shared/preflight.md` instead.

## Chain Name Support

> Full chain list: `../okx-agentic-wallet/_shared/chain-support.md`. If that file does not exist, read `_shared/chain-support.md` instead.

---

## Data Sources

| Source | Purpose | Executable? |
|---|---|---|
| `onchainos defi` | 43 platforms, live APY, auto-deposit | ✅ Yes |
| DeFi Llama API | 17,000+ pools, broader market context | ❌ Read-only |

> **Strategy:** Use DeFi Llama to show the full yield landscape. Use `onchainos defi` to actually execute. This gives the user full market awareness + real action.

---

## Execution Flow

### Step 1 — Parse Intent

Extract from the user's message:

| Parameter | How to resolve |
|---|---|
| **Token** | Identify: USDC, USDT, ETH, SOL, BNB, AVAX, etc. If missing → ask |
| **Chain** | Infer from message. If missing → search all chains, recommend best |
| **Amount** | Extract human-readable number. If missing → check wallet balance and ask |
| **Risk tolerance** | "safe" → established protocols only; "aggressive" → include smaller pools; default → balanced |

### Step 2 — Fetch Onchainos DeFi Products

```bash
# Search by token across all chains
onchainos defi search --token <symbol>

# Search on specific chain
onchainos defi search --token <symbol> --chain <chainId>

# Top APY products globally
onchainos defi list
```

Parse results into a ranked list with: `investmentId`, `platformName`, `token`, `APY (rate)`, `TVL`, `chain`.

### Step 3 — Cross-Reference DeFi Llama

Fetch DeFi Llama yields API for broader market context:

```
GET https://yields.llama.fi/pools
```

Filter results:
- Match token symbol to user's token
- `tvlUsd` > $5,000,000 (minimum liquidity)
- `apy` between 0.5% and 50% (filter outliers/honeypots)
- `ilRisk != "yes"` for single-sided positions
- Sort by `apy` descending, take top 10

> DeFi Llama shows what's possible in the market. onchainos shows what's executable right now.

### Step 4 — Score & Rank

Score each **onchainos** product (0–100):

```
score = (apy_score × 0.50) + (tvl_score × 0.30) + (platform_score × 0.20)

apy_score    = min(apy / max_apy_in_list, 1) × 100
tvl_score    = min(log10(tvl) / log10(max_tvl), 1) × 100
platform_score = reputation weight (see table below)
```

**Platform reputation weights:**

| Tier | Platforms | Weight |
|---|---|---|
| Tier 1 (battle-tested) | Aave V3, Compound V3, Lido, Morpho, Spark, Kamino, Jito | 100 |
| Tier 2 (established) | BENQI, NAVI, Marinade, Jupiter, Bluefin, Scallop, Fluid | 80 |
| Tier 3 (newer) | Solayer, Amnis, Echelon, Syrup, Ethena | 60 |

### Step 5 — Display Comparison Table

Show two sections:

**Section A — Executable Now (onchainos)**
```
🏆 Best Executable Yields for USDC
─────────────────────────────────────────────────────────────────
Rank  Platform          Chain       APY      TVL        Score
─────────────────────────────────────────────────────────────────
 #1   Fluid             Ethereum    4.63%    $206M      94  ← RECOMMENDED
 #2   Syrup             Ethereum    4.63%    $1.7B      96
 #3   Jupiter           Solana      4.24%    $465M      91
 #4   Morpho (Base)     Base        3.89%    $272M      88
 #5   Spark             Ethereum    3.72%    $395M      85
─────────────────────────────────────────────────────────────────
```

**Section B — Market Context (DeFi Llama, not directly executable)**
```
📊 Broader Market (via DeFi Llama — for reference only)
─────────────────────────────────────────────────────────────────
  Merkl / USDT       Hyperliquid   25.05%   $12.7M
  Goldfinch / USDC   Ethereum      10.06%   $37.3M
  Aura / USDC        Ethereum      10.46%   $20.9M
─────────────────────────────────────────────────────────────────
ℹ️  These require manual interaction. Shown for market awareness.
```

Then ask:
> "I recommend **#1 [Platform]** with **[APY]%** APY on [Chain]. How much [token] would you like to deposit? Or type a number to pick a different option."

### Step 6 — Confirm & Execute

Once user confirms amount and choice:

```bash
# Get full product details
onchainos defi detail --investment-id <id>

# Execute deposit (CLI handles ABI, calldata, approval, broadcast)
onchainos defi invest \
  --investment-id <id> \
  --address <walletAddress> \
  --token <symbol_or_address> \
  --amount <minimal_units> \
  --chain <chainId>
```

> Amount conversion: fetch token decimals from `defi detail`, then convert. Example: 100 USDC (6 decimals) → `--amount 100000000`

### Step 7 — Post-Deposit Summary

```
✅ Deposit Complete
─────────────────────────────────────
Protocol:    Fluid (Ethereum)
Deposited:   100 USDC
Expected APY: 4.63%
Est. monthly: ~$0.39
Est. annual:  ~$4.63
Tx Hash:     0xabc...def
─────────────────────────────────────
To withdraw: tell me "withdraw my USDC from Fluid"
To monitor:  tell me "show my DeFi positions"
```

---

## Risk Rules

| Situation | Action |
|---|---|
| APY > 50% | ⚠️ Warn: unusually high, possible incentive token inflation |
| TVL < $1M | ⚠️ Warn: low liquidity, higher exit risk |
| Platform < 6 months old | ⚠️ Warn: newer protocol, unaudited risk |
| IL risk = yes (LP pools) | ⚠️ Warn: impermanent loss possible |
| No products found for token | Inform user, suggest alternative token or chain |
| Deposit simulation fails | Show error, do NOT broadcast, suggest retry or alternative |

---

## Withdraw Flow

When user says "withdraw" / "redeem" / "exit my position":

```bash
# Check current positions first
onchainos defi positions --address <addr> --chains <chain>

# Get platform ID from positions
onchainos defi position-detail --address <addr> --chain <chainId> --platform-id <pid>

# Withdraw (full or partial)
onchainos defi withdraw \
  --investment-id <id> \
  --address <addr> \
  --chain <chainId> \
  --ratio 1   # 1 = 100%, 0.5 = 50%
```

---

## Claim Rewards

When user says "claim rewards" / "harvest" / "collect yield":

```bash
onchainos defi collect \
  --address <addr> \
  --chain <chainId> \
  --reward-type supply \
  --investment-id <id>
```

---

## DeFi Llama API Reference

```
# All pools
GET https://yields.llama.fi/pools

# Response fields used:
pool        → unique pool ID
project     → protocol name
symbol      → token symbol
chain       → chain name
apy         → current APY (%)
tvlUsd      → total value locked
ilRisk      → "yes" if impermanent loss risk
```

No API key required. Rate limit: reasonable (cache response per session).

> Cache the DeFi Llama response for the session. Do NOT re-fetch for every query — one fetch per conversation is enough.

---

## Supported Platforms (43 total)

**Lending/Borrowing:** Aave V3, Compound V3, Spark, Fluid, Morpho, NAVI, Kamino, Echelon Market, Scallop, Bluefin

**Liquid Staking:** Lido, Rocket Pool, Jito, Marinade, SOL Staking, SUI Staking, ATOM Staking, BENQI, Haedal, Solayer, Amnis, Renzo, Puffer, ether.fi, Stader

**DEX/LP:** Uniswap V2/V3/V4, PancakeSwap/V3, QuickSwap/V3, SushiSwap V3, Raydium/V3, Orca V3, Cetus, Momentum

**Yield Aggregators:** Ethena, Syrup, Jupiter

---

## Amount Display Rules

- Always show amounts in UI units (`100 USDC`, `1.5 ETH`)
- APY as percentage with 2 decimals (`4.63%`)
- TVL in shorthand (`$206M`, `$1.7B`)
- Monthly/annual estimates based on current APY (not guaranteed)
- Always add disclaimer: *"APY is variable and subject to change"*

> For full CLI parameters, see [references/cli-reference.md](references/cli-reference.md)
