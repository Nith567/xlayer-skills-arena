---
name: okx-risk-guard
description: "Use this skill when the user wants to protect their portfolio, set stop-loss or take-profit orders, get alerts when price hits a target, auto-sell if price crashes, set price alerts, protect their LP position, or asks things like 'alert me if ETH drops below $1800', 'auto sell if SOL hits $200', 'set stop loss on my WBTC', 'protect my portfolio from crash', 'take profit at $3000', 'set price alert', 'sell half if ETH drops 20%', 'protect my Uniswap LP', 'trailing stop loss', 'notify me when BTC hits 100k', 'auto-exit if market crashes'. Sets up price-triggered automation using CronCreate monitoring + OKX market price checks. Executes protective swaps via onchainos swap execute when triggers are hit. Works on all chains."
license: MIT
metadata:
  author: okx
  version: "1.0.0"
  homepage: "https://web3.okx.com"
---

# OKX Risk Guard

Automated stop-loss and take-profit protection for any token or LP position. Sets price triggers using CronCreate monitoring, checks live prices via OKX market data, and auto-executes protective swaps when your thresholds are hit — so you're protected even when you're not watching.

## Pre-flight Checks

> Read `../okx-agentic-wallet/_shared/preflight.md`. If that file does not exist, read `_shared/preflight.md` instead.

## Chain Support

> Read `../okx-agentic-wallet/_shared/chain-support.md` for the full list of supported chain names and chainIndex values. If that file does not exist, read `_shared/chain-support.md` instead.

## Skill Routing

| Need | Skill/Tool |
|---|---|
| Current price | `okx-dex-market` → `onchainos market price` |
| Price history (trailing stop) | `okx-dex-market` → `onchainos market kline` |
| Execute protective swap | `okx-dex-swap` → `onchainos swap execute` |
| Wallet balance | `okx-agentic-wallet` → `onchainos wallet balance` |
| Schedule monitoring | `CronCreate` |
| LP position check | DexScreener API |

---

## Execution Flow

### Step 1 — Parse Guard Intent

Identify the type of guard:

| Intent | Guard Type |
|---|---|
| "alert me if ETH drops below $X" | Price alert (notify only) |
| "sell if ETH drops below $X" | Stop-loss (auto-sell) |
| "take profit at $X" | Take-profit (auto-sell) |
| "sell 50% if ETH hits $X" | Partial exit |
| "trailing stop 10%" | Trailing stop-loss |
| "protect my LP" | LP out-of-range guard |
| "alert if ETH drops 15% in a day" | Flash crash guard |

Extract:

| Parameter | How to get |
|---|---|
| Token | From message |
| Chain | Infer from message, default Base |
| Trigger price | From message (e.g. "$1,800") |
| Trigger type | stop-loss / take-profit / alert / trailing |
| Exit size | From message (e.g. "50%", "all"), default 100% |
| Exit to | From message (e.g. "USDC"), default USDC |

---

### Step 2 — Current Market Context

Fetch current price and 30d context:
```bash
onchainos market price --chain <chainId> --token-address <tokenAddress>

onchainos market kline \
  --chain <chainId> \
  --token-address <tokenAddress> \
  --bar 1D \
  --limit 30
```

Calculate key levels:
```
support_30d   = min(kline.low[-30:])         ← 30d low
resistance_30d = max(kline.high[-30:])       ← 30d high
volatility_1d = std_dev(daily_returns[-7:])  ← recent daily vol
```

**Validate trigger against current price:**
```
If stop-loss trigger > current price → warn: "Stop price is above current price — this would trigger immediately"
If take-profit trigger < current price → warn: "Take-profit is below current price — already triggered"
```

**Suggest levels if user didn't specify:**
```
Stop-loss suggestions:
  Tight:    current_price × 0.92   (−8%)
  Standard: current_price × 0.85   (−15%)
  Wide:     support_30d            (30d support level)

Take-profit suggestions:
  Conservative: current_price × 1.15  (+15%)
  Moderate:     current_price × 1.30  (+30%)
  Aggressive:   resistance_30d        (30d resistance)
```

**Show context:**
```
Market Context — ETH (Base)
──────────────────────────────────────
Current price:   $2,060
30d high:        $2,510
30d low:         $1,820
Daily volatility: 3.2%
──────────────────────────────────────
Your stop-loss:  $1,800  (−12.6% from now)
Your take-profit: $2,500  (+21.4% from now)

Probability of stop-loss hit (30d vol):
  1 day:  4.2%
  7 days: 18.1%
 30 days: 38.4%  ← moderate risk
```

---

### Step 3 — Configure Guard

**Guard types in detail:**

**A. Fixed Stop-Loss:**
```
If price < stop_price → execute swap (sell % to stablecoin)
```

**B. Fixed Take-Profit:**
```
If price > take_price → execute swap (sell % to stablecoin)
```

**C. Trailing Stop-Loss:**
```
Track highest price since guard was set (peak)
trailing_stop = peak × (1 - trail_pct / 100)
If price < trailing_stop → execute swap

Example: 10% trailing stop
  Peak: $2,200 → stop = $1,980
  Peak rises to $2,400 → stop updates to $2,160
  Price drops to $2,100 → still above stop
  Price drops to $2,150 → trigger!
```

**D. Flash Crash Guard:**
```
Calculate 4-hour change:
  price_4h_ago = kline with --bar 4H
  change_4h = (current - price_4h_ago) / price_4h_ago × 100
  If change_4h < -threshold → trigger
```

**E. LP Out-of-Range Guard:**
```
If price < lp_min OR price > lp_max → notify + suggest rebalance
(integrates with okx-lp-position-manager)
```

---

### Step 4 — Show Guard Summary

Before setting up:

```
Risk Guard Setup
──────────────────────────────────────────────────────
Token:         ETH on Base
Current price: $2,060

Guards configured:
  Stop-Loss:   $1,800  (−12.6%)  → Sell 100% to USDC
  Take-Profit: $2,500  (+21.4%)  → Sell 50% to USDC

Check frequency: Every 30 minutes
──────────────────────────────────────────────────────
⚠️  Note: Auto-sell executes at market price when triggered.
    Actual exit price may differ slightly due to price movement.
──────────────────────────────────────────────────────
Confirm? (yes/no)
```

---

### Step 5 — Activate Guard (CronCreate)

```
CronCreate: every 30 minutes
Prompt: "Risk Guard Check for <token> on <chain>:
  1. Fetch current price: onchainos market price --chain <chainId> --token-address <tokenAddress>
  2. Check stop-loss: if price < <stop_price>:
       → Execute: onchainos swap execute --from <tokenAddress> --to <usdc_address> --readable-amount <exit_amount> --chain <chainId> --wallet <walletAddress> --gas-level fast
       → Notify: '🚨 STOP-LOSS TRIGGERED: ETH sold at $X (stop was $<stop_price>)'
       → CronDelete this guard
  3. Check take-profit: if price > <take_price>:
       → Execute swap (partial if configured)
       → Notify: '✅ TAKE-PROFIT TRIGGERED: sold <pct>% ETH at $X'
       → CronDelete if full exit
  4. If trailing stop: update peak price if current > peak, recalculate trailing stop level"
```

Confirm:
```
✅ Risk Guard Active
──────────────────────────────────────
Token:       ETH (Base)
Stop-Loss:   $1,800 → sell 100% to USDC
Take-Profit: $2,500 → sell 50% to USDC
Monitoring:  Every 30 minutes

To view:   "show my guards"
To cancel: "cancel my ETH guard"
To adjust: "move my ETH stop-loss to $1,700"
```

---

### Step 6 — Guard Triggered

When stop-loss fires:

```
🚨 STOP-LOSS TRIGGERED — ETH/Base
──────────────────────────────────────
Trigger:    Price $1,792 crossed below stop $1,800
Sold:       0.1234 ETH
Received:   $220.92 USDC
Tx Hash:    0xabc...def
Time:       Apr 7, 14:32 UTC
──────────────────────────────────────
Guard is now deactivated.
Your ETH position has been converted to USDC.

What next?
  1. Hold USDC and wait for ETH to stabilize
  2. Set up Smart DCA to re-accumulate ETH at lower prices
  3. Deposit USDC into yield (okx-yield-optimizer)
```

When take-profit fires:

```
✅ TAKE-PROFIT TRIGGERED — ETH/Base
──────────────────────────────────────
Trigger:    Price $2,507 crossed above target $2,500
Sold:       50% of ETH holdings (0.0617 ETH)
Received:   $154.68 USDC
Tx Hash:    0xdef...abc
──────────────────────────────────────
Remaining: 0.0617 ETH still held
Stop-loss guard remains active at $1,800
```

---

### Step 7 — Portfolio-Wide Guard

User can set a portfolio-level crash guard:

```
"Alert me if my total portfolio drops more than 20%"
```

```
CronCreate: every 1 hour
→ onchainos wallet balance (all chains)
→ Calculate total USD value
→ If value < portfolio_peak × (1 - threshold):
    notify: "⚠️ Portfolio down 22% from peak ($293 → $228)
             Consider: reduce risk, collect profits, or hold"
```

---

### Step 8 — Manage Guards

| Command | Action |
|---|---|
| "show my guards" | List all active guards with current vs trigger prices |
| "cancel my ETH guard" | `CronDelete` the ETH guard |
| "cancel all guards" | `CronDelete` all active guards |
| "move stop to $1,700" | Update trigger price in guard config |
| "tighten my stop to 8%" | Recalculate stop = current × 0.92 |
| "add take-profit at $3,000" | Add second trigger to existing guard |

**Show active guards:**
```
Active Guards
──────────────────────────────────────────────────────
#  Token  Chain  Type          Trigger    Current  Distance
──────────────────────────────────────────────────────────
1  ETH    Base   Stop-Loss     $1,800     $2,060   −12.6%
2  ETH    Base   Take-Profit   $2,500     $2,060   +21.4%
3  SOL    Sol    Stop-Loss     $120       $152     −21.1%
──────────────────────────────────────────────────────────
```

---

## Trailing Stop Implementation

```
Every check cycle:
  current_price = onchainos market price

  // Update peak
  if current_price > stored_peak:
    stored_peak = current_price
    trailing_stop = stored_peak × (1 - trail_pct / 100)
    log: "Peak updated to $X, trailing stop now $Y"

  // Check trigger
  if current_price < trailing_stop:
    execute stop-loss swap
    notify user
    CronDelete
```

Show trailing stop status:
```
Trailing Stop — ETH (10%)
──────────────────────────────────────
Current:        $2,060
Peak since set: $2,180
Current stop:   $1,962  (10% below peak)
Distance:       −4.8%  to trigger
```

---

## Risk Rules

| Situation | Action |
|---|---|
| Stop-loss above current price | Block — would trigger immediately, ask user to confirm |
| Exit amount > wallet balance | Use available balance, notify of shortfall |
| Price impact > 3% on exit | Use `--slippage 2` and warn user |
| Token has low liquidity | Warn — exit may cause significant slippage |
| Guard triggers during low liquidity hours | Still executes but adds slippage warning |
| Multiple guards on same token | Allow, but warn about conflicting triggers |

---

## Amount Display Rules

- Trigger prices with 0 decimals for large values (`$1,800`)
- Distance to trigger as percentage with 1 decimal (`−12.6%`)
- Exit amounts in token units (`0.1234 ETH`)
- Always note: *"Auto-execution happens at market price — actual exit price may differ from trigger price"*
- Never guarantee exact exit price
