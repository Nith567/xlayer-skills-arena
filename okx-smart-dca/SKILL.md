---
name: okx-smart-dca
description: "Use this skill when the user wants to dollar cost average, set up recurring buys, buy tokens on a schedule, automate periodic investments, or asks things like 'DCA into ETH every week', 'buy $50 of BTC every day', 'set up auto-buy for SOL', 'invest $100 every Monday', 'smart DCA with market timing', 'buy more when price dips', 'accumulate ETH over time', 'recurring investment strategy', 'auto-invest weekly'. Implements volatility-adjusted DCA: buys more when RSI is oversold and price is below 30d average (good entry), buys less when overbought, skips when momentum is extremely negative. Uses OKX 30d kline for RSI and volatility scoring, CronCreate for scheduling, and onchainos swap execute for automated purchases. Works on all chains."
license: MIT
metadata:
  author: okx
  version: "1.0.0"
  homepage: "https://web3.okx.com"
---

# OKX Smart DCA

Volatility-aware dollar cost averaging. Uses OKX onchain market data to calculate RSI and price position, then dynamically adjusts buy size — more when the market dips (oversold), less when it's running hot (overbought). Scheduled via CronCreate for fully automated recurring execution.

## Pre-flight Checks

> Read `../okx-agentic-wallet/_shared/preflight.md`. If that file does not exist, read `_shared/preflight.md` instead.

## Chain Support

> Read `../okx-agentic-wallet/_shared/chain-support.md` for the full list of supported chain names and chainIndex values. If that file does not exist, read `_shared/chain-support.md` instead.

## Skill Routing

| Need | Skill/Tool |
|---|---|
| Wallet balance check | `okx-agentic-wallet` → `onchainos wallet balance` |
| Price history + RSI | `okx-dex-market` → `onchainos market kline` |
| Current price | `okx-dex-market` → `onchainos market price` |
| Execute buy | `okx-dex-swap` → `onchainos swap execute` |
| Schedule recurring runs | `CronCreate` |

---

## Execution Flow

### Step 1 — Parse DCA Intent

Extract from user message:

| Parameter | How to get |
|---|---|
| Target token | From message (e.g. ETH, SOL, WBTC) |
| Base currency | From message, default USDC |
| Budget per cycle | From message (e.g. "$50") |
| Frequency | daily / weekly / monthly → cron expression |
| Chain | Infer from message, default Base |
| Strategy | `smart` (volatility-adjusted) or `fixed` (flat amount) |

**If missing:**
- Token missing → ask
- Amount missing → check wallet balance, suggest a % of stablecoin holdings
- Frequency missing → default weekly

**Cron mapping:**
| Frequency | Cron |
|---|---|
| Daily | `0 9 * * *` |
| Weekly (Monday) | `0 9 * * 1` |
| Bi-weekly | `0 9 * * 1/2` |
| Monthly (1st) | `0 9 1 * *` |

---

### Step 2 — Market Analysis (Smart Sizing)

Fetch 14-day price history for RSI:
```bash
onchainos market kline \
  --chain <chainId> \
  --token-address <tokenAddress> \
  --bar 1D \
  --limit 30
```

**Calculate RSI (14-day):**
```
daily_returns = [(p[i] - p[i-1]) / p[i-1] for each day]
gains  = [max(r, 0) for r in returns[-14:]]
losses = [abs(min(r, 0)) for r in returns[-14:]]
RS     = mean(gains) / mean(losses)
RSI    = 100 - (100 / (1 + RS))
```

**Calculate price position vs 30d average:**
```
sma_30          = mean(all 30 close prices)
price_now       = latest close
price_vs_avg    = (price_now - sma_30) / sma_30 × 100   ← % above/below average
```

**Weekly volatility:**
```
std_dev    = standard_deviation(daily_returns)
weekly_vol = std_dev × sqrt(7)
```

---

### Step 3 — Dynamic Buy Size (Smart Multiplier)

Adjust the base budget based on market conditions:

```
Smart Multiplier Logic:

RSI < 25  → extreme oversold  → multiplier = 2.0  (double down)
RSI 25–35 → oversold          → multiplier = 1.5  (buy more)
RSI 35–50 → neutral-low       → multiplier = 1.2  (slight boost)
RSI 50–65 → neutral           → multiplier = 1.0  (standard)
RSI 65–75 → overbought        → multiplier = 0.7  (reduce)
RSI > 75  → extreme overbought→ multiplier = 0.5  (minimal)

Price below 30d avg by >10% → add +0.3 to multiplier
Price above 30d avg by >10% → subtract -0.2 from multiplier

final_buy = base_budget × multiplier
Cap: final_buy never exceeds 3× base or less than 0.25× base
```

**Show sizing decision:**
```
Smart DCA Sizing
──────────────────────────────────────
Token:        ETH
Current RSI:  34  (Oversold)
vs 30d avg:   -8.2%  (below average)
──────────────────────────────────────
Base budget:     $50.00
RSI multiplier:  1.5× (oversold)
Price bonus:     +0.2× (below avg)
──────────────────────────────────────
This cycle buy:  $85.00  (1.7× base)
Reason: ETH is oversold and below its 30-day average — good entry point
```

---

### Step 4 — Pre-Buy Check

Before executing:

```bash
# Check available balance
onchainos wallet balance --chain <chainId>

# Get swap quote
onchainos swap quote \
  --from <stablecoin_address> \
  --to <tokenAddress> \
  --readable-amount <buy_amount> \
  --chain <chainId>
```

Check:
- Sufficient stablecoin balance for this cycle
- Price impact < 1% (warn if higher)
- Token not flagged as honeypot (`isHoneyPot` in quote response)

If insufficient balance: skip this cycle, notify user, continue next scheduled run.

---

### Step 5 — Execute Buy

```bash
onchainos swap execute \
  --from <stablecoin_address> \
  --to <tokenAddress> \
  --readable-amount <final_buy_amount> \
  --chain <chainId> \
  --wallet <walletAddress> \
  --gas-level average
```

Show result:
```
✅ DCA Buy Executed
──────────────────────────────────────
Token:      ETH
Spent:      $85.00 USDC
Received:   0.04123 ETH
Price:      $2,061.38/ETH
Tx Hash:    0xabc...def
──────────────────────────────────────
This cycle: 1.7× (oversold entry)
All-time avg cost: $1,943.20/ETH
Total accumulated: 0.312 ETH ($643.16)
```

---

### Step 6 — Track Cost Basis

Maintain running DCA statistics across cycles (in session):

```
DCA Progress — ETH
──────────────────────────────────────────────────────
Cycle  Date       RSI   Multiplier  Spent     Bought
──────────────────────────────────────────────────────
1      Apr 7      34    1.7×        $85.00    0.04123 ETH
2      Apr 14     51    1.0×        $50.00    0.02381 ETH
3      Apr 21     71    0.7×        $35.00    0.01594 ETH
──────────────────────────────────────────────────────
Total spent:      $170.00
Total acquired:   0.08098 ETH
Avg cost basis:   $2,099.28/ETH
Current value:    $175.40  (+$5.40 / +3.2%)
```

---

### Step 7 — Schedule Recurring Runs

After first buy, set up automated future cycles:

```
CronCreate: <frequency_cron>
Prompt: "Run Smart DCA for <token> on <chain>:
  1. Fetch 30d kline for <tokenAddress>
  2. Calculate RSI and price vs 30d avg
  3. Apply smart multiplier to base budget $<amount>
  4. Check wallet balance for <stablecoin>
  5. Execute swap if sufficient funds
  6. Report result"
```

Confirm to user:
```
✅ Smart DCA scheduled
──────────────────────────────────────
Token:      ETH
Frequency:  Every Monday at 9am
Base buy:   $50 USDC
Strategy:   Smart (volatility-adjusted)
Chain:      Base

Next run:   Monday Apr 14
To pause:   tell me "pause my ETH DCA"
To stop:    tell me "stop my ETH DCA"
To adjust:  tell me "change my ETH DCA to $100"
```

---

### Step 8 — Pause / Stop / Modify

| Command | Action |
|---|---|
| "pause my DCA" | `CronDelete` the job, save settings for resume |
| "stop my DCA" | `CronDelete` + clear settings |
| "resume my DCA" | Re-create cron with saved settings |
| "change to $100" | `CronDelete` + recreate with new amount |
| "switch to weekly" | `CronDelete` + recreate with new schedule |
| "show my DCA status" | Show cost basis table + next run time |

---

## Smart vs Fixed Mode

| Mode | Description | When to use |
|---|---|---|
| `smart` | Adjusts size based on RSI + price position | Default — best for accumulation |
| `fixed` | Always buys exact base amount | When user wants predictability |
| `aggressive` | 3× on RSI < 30, skips on RSI > 70 | High conviction, volatile tokens |
| `conservative` | Max 1.2× multiplier | Low risk tolerance |

User can specify: "smart DCA" / "fixed DCA" / "aggressive DCA"

---

## Multi-Token DCA

User can DCA into multiple tokens:

```
"DCA $30 into ETH and $20 into SOL every week"
```

→ Create separate CronCreate jobs per token
→ Show combined cost basis table

```
Multi-Token DCA Portfolio
──────────────────────────────────────────────────────
Token   Weekly   Total Spent   Avg Cost   Current    P&L
──────────────────────────────────────────────────────
ETH     $30      $120.00       $2,099     $2,140     +2.0%
SOL     $20      $80.00        $148.20    $152.40    +2.8%
──────────────────────────────────────────────────────
Total invested: $200.00  |  Current value: $207.20  |  +3.6%
```

---

## Risk Rules

| Situation | Action |
|---|---|
| RSI > 80 (extreme overbought) | Skip cycle, notify: "Market very hot, skipping this week" |
| Insufficient balance | Skip cycle, notify user |
| Price impact > 2% | Warn — reduce buy amount or try again later |
| Token honeypot flag | Block + alert |
| 3 consecutive skips (no balance) | Alert: "DCA paused — low stablecoin balance" |

---

## Amount Display Rules

- Amounts in UI units (`$50.00 USDC`, `0.04123 ETH`)
- Cost basis to 2 decimals (`$2,099.28/ETH`)
- P&L as both absolute and percentage (`+$5.40 / +3.2%`)
- Always note: *"Smart sizing based on RSI — not financial advice. Past RSI patterns don't guarantee future performance."*
