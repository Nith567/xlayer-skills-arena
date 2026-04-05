---
name: okx-copy-trader
description: "Use this skill when the user wants to copy trades from smart money, whales, KOLs, top leaderboard traders, or a specific wallet address. Triggers on: 'copy smart money trades', 'follow whale buys', 'copy top trader', 'mirror this wallet', 'what are smart money buying right now', 'copy KOL signals', 'copy the #1 trader', 'auto-copy trades from 0xabc...', 'follow whale activity', 'copy trade leaderboard winner', 'mirror smart money buys', 'set up copy trading'. Tracks live DEX activity via okx-dex-signal (tracker activities, signal list, leaderboard), mirrors trades proportionally using onchainos swap execute, and schedules automated copy via CronCreate. Works on all chains — X Layer default for zero-gas execution."
license: MIT
metadata:
  author: okx
  version: "1.0.0"
  homepage: "https://web3.okx.com"
---

# OKX Copy Trader

Mirror the trades of smart money, whales, KOLs, top leaderboard traders, or any specific wallet — automatically and proportionally. Uses OKX DEX Signal for live trade intelligence, the leaderboard to find the best traders to copy, and onchainos swap execute to mirror every move in real time.

## Pre-flight Checks

> Read `../okx-agentic-wallet/_shared/preflight.md`. If that file does not exist, read `_shared/preflight.md` instead.

## Chain Support

> Read `../okx-agentic-wallet/_shared/chain-support.md` for the full list of supported chain names and chainIndex values. If that file does not exist, read `_shared/chain-support.md` instead.

## Skill Routing

| Need | Skill/Tool |
|---|---|
| Live smart money / KOL trades | `okx-dex-signal` → `onchainos tracker activities` |
| Aggregated whale buy signals | `okx-dex-signal` → `onchainos signal list` |
| Find best traders to copy | `okx-dex-signal` → `onchainos leaderboard list` |
| Target wallet balance snapshot | `okx-agentic-wallet` → `onchainos wallet balance` |
| Execute copy trade | `okx-dex-swap` → `onchainos swap execute` |
| Token security check | `okx-security` → `onchainos security token-detection` |
| Token price context | `okx-dex-market` → `onchainos market price` |
| Schedule monitoring | `CronCreate` |

---

## Copy Mode Selection

There are 4 copy modes — detect from user message:

| Mode | Trigger words | Source |
|---|---|---|
| **Smart Money** | "copy smart money", "follow smart money" | `tracker activities --tracker-type smart_money` |
| **KOL / Influencer** | "copy KOL", "follow influencer", "KOL signals" | `tracker activities --tracker-type kol` |
| **Top Leaderboard** | "copy top trader", "copy #1", "best performer" | `leaderboard list` → pick #1 → `tracker activities --tracker-type multi_address` |
| **Specific Wallet** | "copy 0xabc...", "mirror this wallet" | `tracker activities --tracker-type multi_address --wallet-address <addr>` |

---

## Execution Flow

### Step 1 — Identify Copy Mode + Chain

Extract from user message:
- **Mode**: smart_money / kol / leaderboard / specific wallet
- **Chain**: default Base (8453), infer from message
- **Budget**: how much of your portfolio to allocate (default 20%)
- **Filter**: min trade size to copy (default $50 — ignore dust trades)

---

### Step 2 — Find Who/What to Copy

**Mode: Smart Money / KOL**
```bash
# Get live trades from smart money right now
onchainos tracker activities \
  --tracker-type smart_money \
  --chain <chainName> \
  --trade-type 1          # buy-only

# Or KOL
onchainos tracker activities \
  --tracker-type kol \
  --chain <chainName> \
  --trade-type 1
```

**Mode: Leaderboard (find best trader to copy)**
```bash
# First check supported chains
onchainos leaderboard supported-chains

# Get top traders by ROI (7 days)
onchainos leaderboard list \
  --chain <chainName> \
  --time-frame 3 \        # 7 days
  --sort-by 5             # sort by ROI

# Pick #1 trader address
# Then track their specific trades
onchainos tracker activities \
  --tracker-type multi_address \
  --wallet-address <top_trader_address> \
  --chain <chainName>
```

**Mode: Specific Wallet**
```bash
onchainos tracker activities \
  --tracker-type multi_address \
  --wallet-address <target_wallet> \
  --chain <chainName> \
  --trade-type 1
```

---

### Step 3 — Show Who You're Copying

Before executing any trades, show the user exactly what they're copying:

**For leaderboard mode:**
```
Top Trader Found — Copying #1
────────────────────────────────────────────────────
Address:    0x7f3a...9b2c
7d ROI:     +847%
Win Rate:   78%
Trades:     23 trades this week
PnL:        +$142,000 realized
────────────────────────────────────────────────────
Their recent buys (last 6 hours):
  PEPE    $4,200   6 hours ago  (still holding — 0% sold)
  SHIB    $8,100   2 hours ago  (still holding — 0% sold)
  DOGE    $2,800   1 hour ago   (still holding — 0% sold)
────────────────────────────────────────────────────
```

**For smart money / signal mode:**
```
Smart Money Signal Detected
────────────────────────────────────────────────────
Token:      PEPE  (0x6982...3045)
Signal:     3 smart money wallets bought in last 2h
Amount:     $42,000 total bought
Avg price:  $0.0000112
Still held: 94% (sold ratio 6%) ← bullish signal
────────────────────────────────────────────────────
```

---

### Step 4 — Security Check Before Copying

Always run token security check on the token being copied — never blindly follow:

```bash
onchainos security token-detection \
  --token-addresses <tokenAddress> \
  --chain <chainId>
```

**Block copy if:**
- `isHoneypot == true`
- `riskLevel == critical`
- Token is less than 24 hours old (too new, rug risk)
- `soldRatioPercent > 50%` — smart money already exited, don't follow late

**Warn but allow if:**
- `riskLevel == high`
- Token has < 500 holders
- Market cap < $1M

```
Security Check — PEPE
──────────────────────────────────────
Honeypot:     ✅ No
Risk level:   ✅ Low
Holders:      847,000
Market cap:   $420M
Smart money sold ratio: 6% ← still holding ✅
──────────────────────────────────────
Safe to copy ✅
```

---

### Step 5 — Calculate Copy Size (Proportional)

```
your_portfolio_value  = sum(onchainos wallet balance)
copy_budget           = your_portfolio_value × copy_allocation%

their_trade_usd       = trade amount from tracker
their_portfolio_est   = estimated from leaderboard volume data (or ask user)

copy_ratio            = copy_budget / their_portfolio_est
your_copy_amount      = their_trade_usd × copy_ratio

# Cap: never more than 10% of your portfolio in a single copy trade
max_single_trade      = your_portfolio_value × 0.10
your_copy_amount      = min(your_copy_amount, max_single_trade)
```

Show proportional sizing:
```
Copy Trade Sizing
──────────────────────────────────────────────────
Their trade:     $4,200 PEPE
Your portfolio:  $312
Copy budget:     20% = $62.40

Copy amount:     $15.80 USDC → PEPE
(25% proportional mirror of their $4,200)
──────────────────────────────────────────────────
Proceed? (yes/no)
```

---

### Step 6 — Execute Copy Trade

```bash
# Check available stablecoin balance
onchainos wallet balance --chain <chainId>

# Execute copy
onchainos swap execute \
  --from <usdc_address> \
  --to <token_address> \
  --readable-amount <copy_amount> \
  --chain <chainId> \
  --wallet <walletAddress> \
  --gas-level fast          # fast — copy trades are time-sensitive
```

**Result:**
```
✅ Copy Trade Executed
──────────────────────────────────────────────────
Copied:     Smart Money buy of PEPE
Spent:      $15.80 USDC
Received:   1,410,714 PEPE
Price:      $0.0000112/PEPE
Tx:         0xabc...def
──────────────────────────────────────────────────
Copying: Smart Money (3 wallets)
Their avg hold time: 4.2 hours
Auto-exit trigger: if smart money sells >50% → you sell
```

---

### Step 7 — Auto-Exit When They Exit

Set up exit monitoring — if the wallet you're copying starts selling, you exit too:

```
CronCreate: every 30 minutes
→ onchainos tracker activities --tracker-type <mode> --trade-type 2  (sell feed)
→ Check if copied token appears in sell feed
→ If target sells >30% of position:
    onchainos swap execute (sell your position back to USDC)
    notify: "🚨 Smart money exiting PEPE — auto-sold your position at $X"
```

---

### Step 8 — Scheduled Copy Trading (Automated)

For continuous copy trading (not just one-off):

```
CronCreate: every 1 hour
→ onchainos tracker activities --tracker-type <mode> --trade-type 1
→ For each new buy signal:
    1. Run security check
    2. Check if already holding this token (avoid double-buying)
    3. Calculate copy size
    4. Execute if passes checks
→ onchainos tracker activities --tracker-type <mode> --trade-type 2
→ Auto-exit any positions they're selling
```

Confirm setup:
```
✅ Auto Copy Trading Active
──────────────────────────────────────────────────
Copying:    Smart Money (all wallets)
Chain:      Base
Budget:     20% of portfolio per session
Min trade:  $50 (ignoring smaller signals)
Check:      Every hour
Security:   Auto-blocking honeypots + critical risks

To pause:   "pause copy trading"
To stop:    "stop copy trading"
To view:    "show copy trading positions"
```

---

### Step 9 — Copy Positions Dashboard

When user asks "show my copy trades" or "what am I copying":

```
Active Copy Positions
──────────────────────────────────────────────────────────────────
Token   Copied From      Entry     Current   PnL       Still held?
──────────────────────────────────────────────────────────────────
PEPE    Smart Money(3)   $0.0000112  $0.0000134  +19.6%  ✅ 94%
SHIB    KOL (whale_xyz)  $0.0000183  $0.0000171  -6.6%   ✅ 88%
──────────────────────────────────────────────────────────────────
Total copy P&L: +$2.10 / +6.2%
Smart money still holding: ✅ (safe to hold)
```

---

## Signal Mode — One-Shot (No Auto)

When user just wants to see what smart money is buying without auto-copying:

```
"what are smart money buying right now on Base?"
```

```bash
onchainos signal list --chain base --wallet-type 1,3
```

Display:
```
Smart Money + Whale Buy Signals — Base (last 2 hours)
──────────────────────────────────────────────────────────────
Token    Wallets  Total Bought  Price     Sold Ratio  Signal
──────────────────────────────────────────────────────────────
PEPE     3 SM     $42,000       $0.00001  6%          🔥 Strong
TOKEN_X  2 Whale  $8,400        $0.00042  0%          📈 Fresh
DOGE     5 SM     $91,000       $0.1014   12%         ✅ Active
──────────────────────────────────────────────────────────────
"Want to copy any of these trades? Say 'copy PEPE'"
```

---

## Risk Rules

| Situation | Action |
|---|---|
| Honeypot detected | Block — never copy into honeypot |
| Sold ratio > 50% | Block — smart money already exiting, too late |
| Token < 24h old | Warn strongly — extremely high rug risk |
| Single copy > 10% of your portfolio | Cap at 10% |
| No stablecoin balance | Alert — need USDC/USDT to copy trade |
| Price impact > 3% | Warn — token may be illiquid |
| Smart money sells > 30% | Auto-trigger exit of your copy position |

---

## Amount Display Rules

- Copy amounts in USD with 2 decimals (`$15.80`)
- Token amounts in full units (`1,410,714 PEPE`)
- PnL as both USD and % (`+$2.10 / +6.2%`)
- Sold ratio as % (`6% sold — still holding`)
- Always note: *"Copy trading does not guarantee profits. Smart money can be wrong. Always check security before copying."*
