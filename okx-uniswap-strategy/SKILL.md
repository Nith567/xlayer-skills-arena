---
name: okx-uniswap-strategy
description: "Use this skill when the user wants to create a Uniswap LP position, add liquidity to a pool, find the best Uniswap pool strategy, provide liquidity on Uniswap V3 or V4, manage LP positions, or asks things like 'create ETH/USDC LP on Base', 'best Uniswap pool for my funds', 'add liquidity to WBTC/ETH', 'put my tokens into Uniswap', 'which fee tier should I use', 'best LP strategy', 'monitor my LP position', 'is my LP out of range', 'uniswap strategy', 'concentrated liquidity', 'LP range suggestion'. Combines OKX wallet, market data, security scanning with Uniswap AI liquidity-planner and v4-security-foundations skills to: analyze onchain price volatility, pick the best pool and fee tier from data, scan for security risks, auto-balance token ratios, generate a pre-filled Uniswap deep link, and monitor position health. Targets Best Uniswap Integration + Best Data Analyst prizes. Works on Ethereum, Base, Arbitrum, Optimism, Polygon, BNB Chain and all Uniswap-supported chains."
license: MIT
metadata:
  author: okx
  version: "1.0.0"
  homepage: "https://web3.okx.com"
---

# OKX Uniswap Strategy

Data-driven Uniswap LP strategist. Uses OKX onchain market data to calculate optimal price ranges, scores all available pools by real fee APY, runs security checks, auto-balances your tokens, and generates a pre-filled Uniswap deep link — all in one flow.

## Pre-flight Checks

> Read `../okx-agentic-wallet/_shared/preflight.md`. If that file does not exist, read `_shared/preflight.md` instead.

## Chain Support

> Read `../okx-agentic-wallet/_shared/chain-support.md` for the full list of supported chain names and chainIndex values. If that file does not exist, read `_shared/chain-support.md` instead.

## Skill Routing

| Need | Skill/Tool |
|---|---|
| Wallet balance | `okx-agentic-wallet` → `onchainos wallet balance` |
| Price history + volatility | `okx-dex-market` → `onchainos market kline` |
| Token security scan | `okx-security` → `onchainos security token-detection` |
| Swap to balance ratio | `okx-dex-swap` → `onchainos swap execute` |
| Pool discovery + APY | DexScreener API + DeFi Llama API |
| LP deep link generation | Uniswap `liquidity-planner` skill logic |
| V4 hook security | Uniswap `v4-security-foundations` skill logic |
| Position monitoring | `okx-dex-market` + `CronCreate` |

---

## Version Strategy

| Chain | Default Version | Notes |
|---|---|---|
| Ethereum | V4 | V4 deployed, use v4-security check |
| Base | V4 | V4 deployed, good liquidity |
| Arbitrum | V4 | V4 deployed |
| Optimism | V3 | V4 limited |
| Polygon | V3 | V3 dominant |
| BNB Chain | V3 | V3 only |

> Always use V4 when available — it enables hook security scanning and is more innovative. Fall back to V3 otherwise.

---

## Execution Flow

### Step 1 — Parse Intent

Extract from user message:

| Parameter | How to get |
|---|---|
| Token A | From message (e.g. ETH, WBTC) |
| Token B | From message (e.g. USDC, ETH) |
| Chain | Infer from message → default Base |
| Amount | From message or fetch wallet balance |
| Version | V4 if chain supports it, else V3 |

If token pair missing → ask user. If amount missing → check wallet and suggest using available balance.

---

### Step 2 — Check Wallet Balance

```bash
onchainos wallet balance --chain <chainId>
```

Show user what they have available. If they don't have both tokens needed for the pair, note this — Step 6 will handle auto-splitting.

---

### Step 3 — Onchain Volatility Analysis (Data Analyst Layer)

This is what makes the strategy data-driven. Fetch 30-day price history and calculate volatility:

```bash
onchainos market kline \
  --chain <chainId> \
  --token-address <tokenAddress> \
  --bar 1D \
  --limit 30
```

From the kline data, calculate:

```
daily_returns  = [(price[i] - price[i-1]) / price[i-1] for each day]
std_dev        = standard deviation of daily_returns
weekly_vol     = std_dev × sqrt(7)
suggested_range = current_price × (1 ± weekly_vol × 1.5)
```

**Range logic by volatility:**

| Weekly Volatility | Suggested Range | Strategy |
|---|---|---|
| < 2% (stablecoins) | ±0.5–1% | Tight, high fee efficiency |
| 2–8% (correlated) | ±5–10% | Balanced |
| 8–15% (major, e.g. ETH) | ±15–20% | Standard |
| > 15% (volatile) | ±30–50% | Wide, avoid IL |

> This is the "data analyst" layer — range is derived from real onchain price data, not guesswork.

---

### Step 4 — Security Scan

Run both OKX and Uniswap security checks in parallel:

**OKX Token Security:**
```bash
onchainos security token-detection \
  --token-addresses <tokenA_address>,<tokenB_address> \
  --chain <chainId>
```

Check: `isHoneypot`, `isMalicious`, `riskLevel`. Block if either token is flagged.

**Uniswap V4 Hook Security (V4 only):**

If the pool has a custom hook address (non-zero), apply the `v4-security-foundations` permission risk matrix:

```
Fetch pool hook address from DexScreener pool data
If hook != 0x000...000:
  → Check hook permission flags
  → CRITICAL flags (beforeSwapReturnDelta): BLOCK — NoOp rug pull risk
  → HIGH flags (beforeRemoveLiquidity, beforeSwap): WARN user
  → MEDIUM/LOW: Inform and proceed
If no hook (standard pool): ✅ Safe
```

Show security summary:
```
Security Check
─────────────────────────────────────
Token A (ETH):   ✅ Verified safe
Token B (USDC):  ✅ Verified safe
Pool Hook:       ✅ No custom hook (standard pool)
─────────────────────────────────────
```

Block if: either token is honeypot OR hook has CRITICAL permission flags.

---

### Step 5 — Pool Discovery & Scoring (Best Pool Selection)

Discover all pools for the pair using DexScreener:

```bash
curl -s "https://api.dexscreener.com/token-pairs/v1/<network>/<tokenAddress>" | \
  jq '[.[] | select(.dexId == "uniswap")] | map({
    pairAddress,
    pair: "\(.baseToken.symbol)/\(.quoteToken.symbol)",
    version: .labels[0],
    feeTier: .feeTier,
    liquidity: .liquidity.usd,
    volume24h: .volume.h24
  })'
```

**Network IDs:** `ethereum`, `base`, `arbitrum`, `optimism`, `polygon`, `unichain`

Cross-reference with DeFi Llama for APY:
```bash
curl -s "https://yields.llama.fi/pools" | \
  jq '[.data[] | select(.project == "uniswap-v3" and .chain == "<Chain>")]'
```

**Score each pool:**
```
fee_apy   = (volume24h × fee_rate × 365) / tvl   ← actual earnings per dollar
tvl_score = log10(tvl) / 10                        ← liquidity safety
score     = fee_apy × 0.70 + tvl_score × 0.30
```

**Show ranked pool table:**
```
Available WBTC/ETH Pools on Base
──────────────────────────────────────────────────────
Version  Fee    TVL      24h Vol   Fee APY   Score
──────────────────────────────────────────────────────
V4       0.30%  $8.2M    $3.1M     13.8%     91  ← BEST
V3       0.05%  $5.1M    $1.2M     4.3%      72
V3       1.00%  $1.8M    $800K     16.2%     68  (low TVL)
──────────────────────────────────────────────────────
Recommendation: V4 0.30% — highest risk-adjusted fee APY
```

> If multiple fee tiers have similar scores, recommend the one with highest TVL (lower IL risk on exit).

---

### Step 6 — Auto-Balance Token Ratio

V3/V4 concentrated LP requires both tokens in a specific ratio based on the price range. Calculate required ratio:

```
For range [P_low, P_high] at current price P:
ratio = sqrt(P × P_high) - P) / (P - sqrt(P × P_low))
→ token_A_needed = amount × ratio / (1 + ratio)
→ token_B_needed = amount × (1 - ratio / (1 + ratio))
```

If user doesn't have correct ratio:
```bash
onchainos swap execute \
  --from <excess_token> \
  --to <needed_token> \
  --readable-amount <deficit_amount> \
  --chain <chainId> \
  --wallet <address> \
  --gas-level average
```

Show before/after:
```
Token Balance for LP
──────────────────────────────────────
         Current    Needed    Action
ETH:     0.0005     0.00038   sell 0.00012 ETH
USDC:    0.24       0.78      buy 0.54 USDC
──────────────────────────────────────
→ Swapping 0.00012 ETH → USDC to balance
```

---

### Step 7 — Generate Uniswap Deep Link

Build the pre-filled Uniswap position creation URL:

**Base URL:** `https://app.uniswap.org/positions/create`

**Parameters:**

```
chain        = <network_name>
currencyA    = NATIVE (for ETH) or token address
currencyB    = token address
fee          = {"feeAmount":<amount>,"tickSpacing":<spacing>,"isDynamic":false}
priceRangeState = {"priceInverted":false,"fullRange":false,"minPrice":"<min>","maxPrice":"<max>","initialPrice":"","inputMode":"price"}
depositState = {"exactField":"TOKEN0","exactAmounts":{"TOKEN0":"<amount>"}}
step         = 1
```

**Fee → tick spacing:**
| Fee | feeAmount | tickSpacing |
|---|---|---|
| 0.01% | 100 | 1 |
| 0.05% | 500 | 10 |
| 0.30% | 3000 | 60 |
| 1.00% | 10000 | 200 |

**URL encoding:** Only encode `"` → `%22`. Do NOT encode `{}`, `:`, `,`.

**Example:**
```
https://app.uniswap.org/positions/create
  ?currencyA=NATIVE
  &currencyB=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
  &chain=base
  &fee={%22feeAmount%22:3000,%22tickSpacing%22:60,%22isDynamic%22:false}
  &priceRangeState={%22priceInverted%22:false,%22fullRange%22:false,%22minPrice%22:%221750%22,%22maxPrice%22:%222400%22,%22initialPrice%22:%22%22,%22inputMode%22:%22price%22}
  &depositState={%22exactField%22:%22TOKEN0%22,%22exactAmounts%22:{%22TOKEN0%22:%220.00038%22}}
  &step=1
```

Open in browser:
```bash
open "<url>"   # macOS
xdg-open "<url>"  # Linux
```

Always display the full URL as a clickable link in case browser opening fails.

---

### Step 8 — Strategy Summary

Show before opening the link:

```
LP Strategy Summary
──────────────────────────────────────────────────────
Pair:          ETH / USDC
Chain:         Base
Version:       V4 (no custom hook ✅)
Fee Tier:      0.30% (highest fee APY)
Price Range:   $1,750 – $2,400 (±15%, based on 30d volatility)
Current Price: $2,060 ✅ In range
Est. Fee APY:  13.8%
Pool TVL:      $8.2M
IL Risk:       Moderate (ETH volatile)
Deposit:       0.00038 ETH + 0.78 USDC

📊 Data Sources: OKX 30d kline, DexScreener, DeFi Llama
──────────────────────────────────────────────────────
🔗 Opening Uniswap with position pre-filled...
```

---

### Step 9 — Set Up Position Monitor

After link is generated, offer monitoring:

> "Want me to monitor this position and alert you if ETH goes out of range ($1,750–$2,400)?"

If yes, create a scheduled check:

```
CronCreate: every 1 hour
→ onchainos market price --chain <chainId> --token-address <addr>
→ if price < minPrice OR price > maxPrice:
    notify: "⚠️ Your ETH/USDC LP is OUT OF RANGE
             Current: $1,720 | Range: $1,750–$2,400
             Options: rebalance range, add liquidity, or exit"
```

---

## Out-of-Range Actions

When position goes out of range, offer:

1. **Rebalance range** → recalculate new range based on current price + volatility, generate new deep link
2. **Exit position** → user manually removes on Uniswap, then `okx-auto-rebalance` redistributes funds
3. **Do nothing** → position earns 0 fees but no IL increases further

---

## Risk Warnings

| Situation | Action |
|---|---|
| Token flagged as honeypot | BLOCK — do not proceed |
| V4 hook has CRITICAL permission | BLOCK — NoOp rug pull risk |
| V4 hook has HIGH permission | WARN — explain risk, ask confirmation |
| Pool TVL < $100K | WARN — thin liquidity, slippage on entry/exit |
| Weekly volatility > 20% | WARN — very wide range needed or consider full range |
| Price impact on auto-swap > 3% | WARN — swap will move price significantly |

---

## Amount Display Rules

- Token amounts in UI units (`0.00038 ETH`, `0.78 USDC`)
- APY as percentage with 2 decimals (`13.8%`)
- TVL in shorthand (`$8.2M`)
- Price ranges with 0 decimals for large prices (`$1,750`)
- Always note: *"Fee APY is based on historical 24h volume and may vary"*

> For full API references and chain token addresses, see [references/data-providers.md](references/data-providers.md)
