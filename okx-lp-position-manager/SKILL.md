---
name: okx-lp-position-manager
description: "Use this skill when the user wants to manage, monitor, rebalance, or exit an existing Uniswap LP position, check if their LP is in range, calculate impermanent loss vs fees earned, collect LP fees, or asks things like 'check my LP position', 'is my ETH/USDC LP profitable', 'rebalance my Uniswap position', 'my LP is out of range what do I do', 'collect my Uniswap fees', 'how much IL have I suffered', 'exit my LP', 'move my LP range', 'my position is out of range', 'LP health check'. Manages the full Uniswap LP lifecycle after creation — calculates real impermanent loss vs fee income, detects out-of-range positions, auto-rebalances using OKX swaps + new Uniswap deep link, and helps exit positions cleanly. Uses Uniswap swap-planner, swap-integration, v4-security-foundations skills combined with OKX market data and DexScreener. Works on Ethereum, Base, Arbitrum, Optimism, Polygon."
license: MIT
metadata:
  author: okx
  version: "1.0.0"
  homepage: "https://web3.okx.com"
---

# OKX LP Position Manager

Full lifecycle manager for Uniswap V3/V4 LP positions. Checks if your position is in range, calculates whether fees are beating impermanent loss, and auto-rebalances to an optimal new range when needed — all powered by OKX market data.

## Pre-flight Checks

> Read `../okx-agentic-wallet/_shared/preflight.md`. If that file does not exist, read `_shared/preflight.md` instead.

## Skill Routing

| Need | Skill/Tool |
|---|---|
| Current token prices | `okx-dex-market` → `onchainos market price` |
| Price history for new range | `okx-dex-market` → `onchainos market kline` |
| Swap to rebalance ratio | `okx-dex-swap` → `onchainos swap execute` |
| Pool data + current tick | DexScreener API |
| Swap route planning | Uniswap `swap-planner` skill logic |
| Swap execution path | Uniswap `swap-integration` skill logic |
| V4 hook re-check | Uniswap `v4-security-foundations` skill logic |
| New LP deep link | Uniswap `liquidity-planner` skill logic |
| Position monitoring | `CronCreate` |

---

## Execution Flow

### Step 1 — Parse Intent

Identify what the user wants:

| Intent | Action |
|---|---|
| "check my LP" / "is it in range" | → Health check only (Steps 2–4) |
| "rebalance my LP" / "out of range" | → Full rebalance (Steps 2–7) |
| "collect fees" / "harvest" | → Fee collection only (Step 8) |
| "exit my LP" / "remove liquidity" | → Exit guide (Step 9) |
| "how much IL" / "is it profitable" | → IL vs fees analysis (Steps 2–4) |

Extract:
- Token pair (e.g. ETH/USDC)
- Chain (default: Base)
- Position address or ask user

---

### Step 2 — Fetch Position Data

Get current pool state from DexScreener:

```bash
curl -s "https://api.dexscreener.com/token-pairs/v1/<network>/<tokenAddress>" | \
  jq '[.[] | select(.dexId == "uniswap")] | map({
    pairAddress,
    version: .labels[0],
    feeTier,
    liquidity: .liquidity.usd,
    volume24h: .volume.h24,
    priceNative,
    priceUsd
  })'
```

Get current token prices:
```bash
onchainos market price --chain <chainId> --token-address <tokenA>
onchainos market price --chain <chainId> --token-address <tokenB>
```

Ask user for their position details if not provided:
- Entry price (when they opened the position)
- Price range (min/max they set)
- Amount deposited

---

### Step 3 — Position Health Check

**In-Range Check:**
```
isInRange = minPrice <= currentPrice <= maxPrice
```

**Fee Income Estimate:**
```
daysOpen     = (today - entryDate) in days
poolShare    = userLiquidity / totalPoolLiquidity      ← approximate
feeIncome    = poolShare × volume24h × feeRate × daysOpen
feeIncome_usd = feeIncome
```

**Impermanent Loss Calculation (V3 concentrated):**
```
k = currentPrice / entryPrice         ← price ratio
sqrt_k = sqrt(k)
sqrt_P_low  = sqrt(minPrice / entryPrice)
sqrt_P_high = sqrt(maxPrice / entryPrice)

IL% = 2 × sqrt_k / (1 + k) - 1       ← simplified full-range IL
# For concentrated positions, IL is amplified by the concentration factor
concentration = sqrt(maxPrice/minPrice)
concentratedIL% = IL% × concentration
```

**Net Position:**
```
net = feeIncome_usd - IL_usd
```

**Display health summary:**
```
LP Position Health — ETH/USDC (Base)
──────────────────────────────────────────────────────
Status:       ✅ IN RANGE  /  ⚠️ OUT OF RANGE
Current:      $2,060
Your Range:   $1,750 – $2,400
──────────────────────────────────────────────────────
Entry Price:  $1,920        Days Open: 14
Fee Income:   +$12.40       (est. based on pool share)
IL Loss:      -$8.20        (concentrated IL)
──────────────────────────────────────────────────────
Net P&L:      +$4.20 ✅     Position is PROFITABLE
──────────────────────────────────────────────────────
Fee APY:      18.3%
IL APY:       -12.1%
Net APY:      +6.2%
──────────────────────────────────────────────────────
```

If out of range:
```
⚠️ OUT OF RANGE — earning 0 fees right now
Price $2,510 is above your max $2,400
Options:
  1. Rebalance range upward (recommended)
  2. Exit position and redeploy
  3. Wait — price may return to range
```

---

### Step 4 — Swap Route Analysis (Uniswap swap-planner)

Before any rebalance swap, apply `swap-planner` logic to find best route:

```
For each required swap (e.g. ETH → USDC):
  1. Check direct pool (e.g. ETH/USDC 0.05%)
  2. Check multi-hop routes (ETH → WBTC → USDC)
  3. Score by: output amount, gas cost, price impact
  4. Select route with best net output after gas
```

Show route to user:
```
Swap Route (via swap-planner)
──────────────────────────────────────
Selling: 0.05 ETH
Route:   ETH → USDC (direct, 0.05% pool)
Output:  103.20 USDC
Impact:  0.08% ✅
Gas:     ~$0.12
──────────────────────────────────────
Best route found — 1 hop, minimal impact
```

If price impact > 1%: suggest splitting across multiple pools (Uniswap `swap-integration` logic).

---

### Step 5 — V4 Hook Re-Check

If rebalancing to a different pool or the pool has a hook:

Apply `v4-security-foundations` permission matrix:

```
If target pool has hook address (non-zero):
  → Check hook permission flags
  → CRITICAL (beforeSwapReturnDelta): BLOCK
  → HIGH (beforeRemoveLiquidity, beforeSwap): WARN
  → MEDIUM/LOW: Inform + proceed
If standard pool (no hook): ✅ Safe
```

---

### Step 6 — Calculate New Optimal Range

Fetch fresh 30-day price history:
```bash
onchainos market kline \
  --chain <chainId> \
  --token-address <tokenAddress> \
  --bar 1D \
  --limit 30
```

Recalculate volatility + optimal range:
```
daily_returns  = [(price[i] - price[i-1]) / price[i-1)]
std_dev        = standard deviation of daily_returns
weekly_vol     = std_dev × sqrt(7)
new_min        = currentPrice × (1 - weekly_vol × 1.5)
new_max        = currentPrice × (1 + weekly_vol × 1.5)
```

**Show comparison:**
```
Range Comparison
──────────────────────────────────────
Old Range:  $1,750 – $2,400  (stale, based on old price)
New Range:  $2,200 – $2,850  (based on current volatility)
──────────────────────────────────────
Current price $2,510 is IN new range ✅
Recommended: rebalance to new range
```

---

### Step 7 — Auto-Rebalance Flow

**Step 7a — Token ratio for new range:**
```
ratio = (sqrt(currentPrice × newMax) - currentPrice) /
        (currentPrice - sqrt(currentPrice × newMin))
tokenA_needed = totalValue × ratio / (1 + ratio)
tokenB_needed = totalValue / (1 + ratio)
```

**Step 7b — Swap to correct ratio (OKX DEX):**
```bash
onchainos swap execute \
  --from <excess_token> \
  --to <needed_token> \
  --readable-amount <deficit_amount> \
  --chain <chainId> \
  --wallet <address> \
  --gas-level average
```

**Step 7c — Generate new Uniswap deep link:**

Build pre-filled position URL (Uniswap `liquidity-planner` logic):
```
https://app.uniswap.org/positions/create
  ?currencyA=<tokenA>
  &currencyB=<tokenB>
  &chain=<chain>
  &fee={%22feeAmount%22:<amount>,%22tickSpacing%22:<spacing>,%22isDynamic%22:false}
  &priceRangeState={%22priceInverted%22:false,%22fullRange%22:false,%22minPrice%22:%22<newMin>%22,%22maxPrice%22:%22<newMax>%22,%22initialPrice%22:%22%22,%22inputMode%22:%22price%22}
  &depositState={%22exactField%22:%22TOKEN0%22,%22exactAmounts%22:{%22TOKEN0%22:%22<amount>%22}}
  &step=1
```

**Rebalance Summary:**
```
Rebalance Complete
──────────────────────────────────────────────────────
Old Range:     $1,750 – $2,400  (out of range)
New Range:     $2,200 – $2,850  (current: $2,510 ✅)
Swap done:     0.02 ETH → 41.20 USDC
New deposit:   0.03 ETH + 61.80 USDC

📊 Data: OKX 30d kline (fresh volatility)
──────────────────────────────────────────────────────
🔗 Opening Uniswap with new position pre-filled...
```

---

### Step 8 — Fee Collection

When user wants to collect earned fees:

```
Fees earned are collected automatically when you remove/modify liquidity on Uniswap.

To collect:
1. Go to app.uniswap.org/positions
2. Select your position
3. Click "Collect fees"

Or remove and re-add liquidity with new range (Step 7) — fees are collected automatically.
```

Show estimated uncollected fees:
```
Estimated Uncollected Fees
──────────────────────────────────────
ETH fees:   0.000082 ETH  (~$0.17)
USDC fees:  0.34 USDC     (~$0.34)
Total:      ~$0.51
──────────────────────────────────────
Note: exact amounts shown on Uniswap UI
```

---

### Step 9 — Exit Position

When user wants to fully exit:

```
To exit your LP position:
1. Go to app.uniswap.org/positions
2. Select your position → "Remove Liquidity" → 100%
3. Confirm transaction

After exit, your tokens return to wallet.
Want me to:
  A. Auto-swap returned tokens to a single asset (e.g. all → USDC)
  B. Find the best new yield opportunity for the funds
  C. Set up a new LP position with fresh range
```

If A: use `okx-dex-swap` to consolidate
If B: hand off to `okx-yield-optimizer`
If C: hand off to `okx-uniswap-strategy`

---

### Step 10 — Monitoring

After rebalance, set up position monitor:

```
CronCreate: every 2 hours
→ onchainos market price --chain <chainId> --token-address <addr>
→ if price < newMin OR price > newMax:
    notify: "⚠️ Your ETH/USDC LP is OUT OF RANGE again
             Current: $X | Range: $newMin–$newMax
             Run okx-lp-position-manager to rebalance"
```

---

## Risk Rules

| Situation | Action |
|---|---|
| Out of range > 7 days | Strongly recommend rebalance — fees = $0 |
| IL > fee income | Warn — net negative, consider exiting or widening range |
| Price impact on rebalance swap > 2% | Warn — split swap or wait |
| V4 hook CRITICAL | Block — do not rebalance to this pool |
| New range TVL < $500K | Warn — thin pool |
| Volatile token (weekly_vol > 20%) | Suggest wider range or full range |

---

## Amount Display Rules

- Token amounts in UI units (`0.03 ETH`, `61.80 USDC`)
- IL and fee income with 2 decimal USD (`$8.20`)
- APY as percentage with 1 decimal (`18.3%`)
- Always note: *"Fee estimates based on current pool share and 24h volume — actual amounts vary"*
- IL calculations are estimates — exact amounts depend on on-chain position data
