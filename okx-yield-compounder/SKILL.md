---
name: okx-yield-compounder
description: "Use this skill when the user wants to auto-compound DeFi yields, reinvest earned rewards back into the position, maximize APY through compounding, collect and reinvest staking rewards, or asks things like 'auto-compound my Aave rewards', 'reinvest my yield', 'compound my DeFi position', 'collect rewards and redeposit', 'maximize my APY by compounding', 'set up auto-compound', 'compound my yield daily', 'keep reinvesting my earnings'. Collects DeFi rewards via onchainos defi collect, reinvests them back into the same or higher-APY position, and schedules automatic compounding via CronCreate. Shows effective compounded APY vs base APY. Works on X Layer, Base, Ethereum, Arbitrum."
license: MIT
metadata:
  author: okx
  version: "1.0.0"
  homepage: "https://web3.okx.com"
---

# OKX Yield Compounder

Automatically collect and reinvest your DeFi rewards to maximize compounded returns. Turns a static 8% APY into a higher effective yield by reinvesting earnings daily, weekly, or at the optimal compounding frequency based on gas costs vs reward size.

## Pre-flight Checks

> Read `../okx-agentic-wallet/_shared/preflight.md`. If that file does not exist, read `_shared/preflight.md` instead.

## Chain Support

> Read `../okx-agentic-wallet/_shared/chain-support.md` for the full list of supported chain names and chainIndex values. If that file does not exist, read `_shared/chain-support.md` instead.

## Skill Routing

| Need | Skill/Tool |
|---|---|
| Active yield positions | `okx-defi-portfolio` → `onchainos defi positions` |
| Collect pending rewards | `okx-defi-invest` → `onchainos defi collect` |
| Reinvest into position | `okx-defi-invest` → `onchainos defi invest` |
| Swap reward token to deposit token | `okx-dex-swap` → `onchainos swap execute` |
| Best reinvestment opportunity | `okx-yield-optimizer` → `onchainos defi search` |
| Schedule compounding | `CronCreate` |

---

## Execution Flow

### Step 1 — Scan Active Yield Positions

```bash
onchainos defi positions \
  --address <walletAddress> \
  --chains <chain1,chain2>
```

For each position extract:
- Protocol + platform name
- Deposited token + amount
- Current APY
- Pending rewards (claimable amount + token)
- Investment ID for collect + reinvest

---

### Step 2 — Display Positions + Pending Rewards

```
Active Yield Positions
──────────────────────────────────────────────────────────────────
Protocol    Chain     Deposited         APY    Pending Rewards
──────────────────────────────────────────────────────────────────
Aave V3     X Layer   500 USDG          4.2%   0.58 USDG ($0.58)
Morpho      Base      300 USDC          3.9%   0.31 USDC ($0.31)
Aave V3     Ethereum  0.05 ETH          2.1%   0.000021 ETH ($0.04)
──────────────────────────────────────────────────────────────────
Total deposited: $920   |  Total pending: $0.93
```

---

### Step 3 — Compounding Math

Show what compounding does for each position:

```
Compounding Analysis — Aave V3 X Layer (4.2% APY)
──────────────────────────────────────────────────────
Deposit: 500 USDG

Without compounding (simple interest):
  1 month:  $501.75   (+$1.75)
  1 year:   $521.00   (+$21.00)
  Effective APY: 4.2%

Daily compounding:
  1 month:  $501.76   (+$1.76)
  1 year:   $521.47   (+$21.47)
  Effective APY: 4.28%  (+0.08% boost)

Weekly compounding (recommended for this position):
  Effective APY: 4.27%
  Gas cost per compound: ~$0.00 (X Layer)
  Monthly reward: ~$1.75  → worth compounding weekly ✅

On Ethereum (gas $3 per tx):
  Daily compound: NOT worth it (gas > reward for small positions)
  Weekly compound: break-even at $500+ deposit
  Monthly compound: worth it at $100+ deposit
──────────────────────────────────────────────────────
```

**Optimal compounding frequency:**
```
# Calculate if compounding is worth it
gas_cost_usd = estimate from chain
reward_per_period = deposit × apy / periods_per_year

if gas_cost_usd < reward_per_period × 0.10:   # gas < 10% of reward
  → compound
else:
  → wait for larger reward accumulation

X Layer: always worth it (gas = $0)
Base/Arbitrum: weekly for positions > $200
Ethereum: monthly for positions > $500
```

---

### Step 4 — Execute Compound

**Collect rewards:**
```bash
onchainos defi collect \
  --investment-id <id> \
  --chain <chainId>
```

**If reward token == deposit token → reinvest directly:**
```bash
onchainos defi invest \
  --investment-id <id> \
  --amount <reward_amount_in_decimals> \
  --chain <chainId>
```

**If reward token != deposit token → swap first:**
```bash
# Swap reward token to deposit token
onchainos swap execute \
  --from <reward_token> \
  --to <deposit_token> \
  --readable-amount <reward_amount> \
  --chain <chainId> \
  --wallet <address>

# Then reinvest
onchainos defi invest \
  --investment-id <id> \
  --amount <swapped_amount> \
  --chain <chainId>
```

**Result:**
```
✅ Compounded — Aave V3 X Layer
──────────────────────────────────────────────────
Collected:   0.58 USDG
Reinvested:  0.58 USDG back into Aave V3
New balance: 500.58 USDG (was 500.00)
Collect tx:  0xabc...
Invest tx:   0xdef...
──────────────────────────────────────────────────
Effective APY with weekly compounding: 4.27%
Total compounded this month: +$1.75
```

---

### Step 5 — Smart Reinvestment (Optional)

Instead of reinvesting into the same position, check if a better yield exists:

```
"compound into the best available yield instead of same pool"
```

```bash
# Find best current yield for this token
onchainos defi search --token USDC --chain <chainId>
```

```
Smart Compound — Best Yield Check
──────────────────────────────────────────────────
Current:    Morpho Base    3.9% APY
Best now:   Fluid Ethereum 4.6% APY (+0.7% better)
──────────────────────────────────────────────────
Upgrade compound to Fluid? (+$3.50/year on $500)
(yes = collect Morpho rewards + move to Fluid)
(no  = reinvest back into Morpho)
```

---

### Step 6 — Schedule Auto-Compounding

```
CronCreate: <frequency>
→ onchainos defi positions (check pending rewards)
→ For each position where reward > gas cost threshold:
    onchainos defi collect
    onchainos defi invest (or swap + invest)
    log: "Compounded $X into Protocol Y — new balance $Z"
```

Frequency options:
- Daily: `0 9 * * *`
- Weekly: `0 9 * * 1`
- Monthly: `0 9 1 * *`

```
✅ Auto-Compound Scheduled
──────────────────────────────────────────────────
Positions:    Aave V3 X Layer + Morpho Base
Frequency:    Weekly (every Monday 9am)
Min compound: only if reward > $0.10
Strategy:     Reinvest into same pool

Next run:     Monday Apr 14
Projected:    +$0.08/week additional from compounding
To stop:      "stop auto-compound"
```

---

### Step 7 — Compound All Positions

When user says "compound everything":

```
Processing all positions...

Position 1: Aave V3 X Layer
  Pending: 0.58 USDG → ✅ Collected + Reinvested
Position 2: Morpho Base
  Pending: 0.31 USDC → ✅ Collected + Reinvested
Position 3: Aave V3 Ethereum
  Pending: $0.04 ETH → ⏭️ Skipped (gas > reward on Ethereum)

──────────────────────────────────────────────────
Total compounded:  $0.89
Gas saved by skip: $3.00 (Ethereum tx)
New total deposit: $920.89
```

---

## X Layer — Primary Compound Chain

X Layer zero gas = compound as frequently as you want for free:

```
On X Layer:
  Aave V3 USDG — compound daily (gas = $0)
  Even $1 pending reward is worth compounding
  Effective APY boost from daily: +0.1% on 4.2% base
```

---

## Compounding Frequency Guide

| Chain | Position Size | Recommended Frequency |
|---|---|---|
| X Layer | Any | Daily (gas free) |
| Base / Arbitrum | > $100 | Weekly |
| Base / Arbitrum | > $1,000 | Daily |
| Ethereum | > $500 | Monthly |
| Ethereum | > $5,000 | Weekly |

---

## Risk Rules

| Situation | Action |
|---|---|
| Gas > 10% of reward | Skip compound, wait for bigger accumulation |
| Reward token is unknown/risky | Security check before swapping |
| Position APY dropped > 1% since deposit | Suggest moving to better yield instead |
| Collect tx fails | Retry once, then alert user |
| No reward to collect | Skip silently, check again next cycle |
