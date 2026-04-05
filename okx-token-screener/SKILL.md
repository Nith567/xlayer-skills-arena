---
name: okx-token-screener
description: "Use this skill when the user wants to scan tokens for trading opportunities, find tokens with volume spikes, momentum, oversold RSI, smart money buying activity, or asks things like 'find tokens with volume spike', 'show oversold tokens', 'what are smart money buying', 'screen tokens on Base', 'find trending tokens', 'show tokens with bullish momentum', 'scan for breakout tokens', 'which tokens have most whale activity', 'find tokens with RSI under 30', 'what should I be watching', 'token scanner', 'find alpha on Base', 'show me high momentum tokens'. Combines OKX DEX Signal (smart money + whale activity via onchainos signal list + tracker activities) with market kline data (RSI, momentum, volume) to screen and rank tokens by opportunity score. The data analyst skill for token discovery."
license: MIT
metadata:
  author: okx
  version: "1.0.0"
  homepage: "https://web3.okx.com"
---

# OKX Token Screener

A data-driven token scanner that combines OKX DEX Signal intelligence (what smart money and whales are buying) with technical indicators (RSI, momentum, volume spike) to surface the highest-opportunity tokens on any chain. The analyst layer behind every trade.

## Pre-flight Checks

> Read `../okx-agentic-wallet/_shared/preflight.md`. If that file does not exist, read `_shared/preflight.md` instead.

## Skill Routing

| Need | Skill/Tool |
|---|---|
| Smart money buy signals | `okx-dex-signal` → `onchainos signal list` |
| Live smart money trades | `okx-dex-signal` → `onchainos tracker activities` |
| Top traders (alpha source) | `okx-dex-signal` → `onchainos leaderboard list` |
| Token price + volume history | `okx-dex-market` → `onchainos market kline` |
| Current price | `okx-dex-market` → `onchainos market price` |
| Token security scan | `okx-security` → `onchainos security token-detection` |
| Execute buy after screen | `okx-dex-swap` → `onchainos swap execute` |

---

## Screen Modes

Detect from user message:

| Mode | Trigger | Source |
|---|---|---|
| **Smart Money Screen** | "what are smart money buying", "whale signals" | `onchainos signal list --wallet-type 1,3` |
| **KOL Screen** | "KOL picks", "influencer buys" | `onchainos signal list --wallet-type 2` |
| **Technical Screen** | "oversold tokens", "volume spike", "RSI screen" | `onchainos market kline` for each token |
| **Combined Screen** | "best opportunities", "find alpha", "full scan" | signal list + kline for each result |
| **Trend Screen** | "trending tokens", "hot right now" | `onchainos tracker activities` (most traded) |

---

## Execution Flow

### Step 1 — Parse Screen Intent

Extract:
- **Mode**: smart_money / kol / technical / combined / trend
- **Chain**: from message, default Base
- **Filters**: RSI threshold, min volume, min market cap, min holders
- **Output**: how many tokens to show (default top 10)

---

### Step 2A — Signal Screen (Smart Money / KOL / Whale)

```bash
# Check chain support first
onchainos signal chains

# Fetch buy signals
onchainos signal list \
  --chain <chainName> \
  --wallet-type 1,3         # 1=Smart Money, 2=KOL, 3=Whale
```

For each signal, key fields:
- `token` — token address + symbol
- `walletType` — who's buying (smart money / KOL / whale)
- `amountUsd` — how much they bought
- `addressCount` — how many wallets buying (consensus signal)
- `soldRatioPercent` — % already sold (low = still holding = bullish)

---

### Step 2B — Technical Screen

For each token from signals (or user's watchlist):

```bash
onchainos market kline \
  --chain <chainId> \
  --token-address <addr> \
  --bar 1D \
  --limit 14
```

**Calculate per token:**

```
RSI (14-day):
  gains  = [max(r, 0) for r in returns[-14:]]
  losses = [abs(min(r, 0)) for r in returns[-14:]]
  RS     = mean(gains) / mean(losses)
  RSI    = 100 - (100 / (1 + RS))

Volume spike:
  avg_vol_7d = mean(volume[-7:])
  today_vol  = volume[-1]
  vol_spike  = today_vol / avg_vol_7d        # >2.0 = significant spike

Momentum (price vs 7d avg):
  sma_7      = mean(closes[-7:])
  momentum   = (price_now - sma_7) / sma_7 × 100

7d return:
  return_7d  = (price_now - price[-7]) / price[-7] × 100
```

---

### Step 3 — Score Each Token (Opportunity Score)

```
opportunity_score =
  (smart_money_score  × 0.35)   ← is smart money buying?
  + (rsi_score        × 0.25)   ← is it oversold?
  + (volume_score     × 0.20)   ← is volume picking up?
  + (momentum_score   × 0.10)   ← price trend direction
  + (safety_score     × 0.10)   ← not a rug

smart_money_score:
  addressCount >= 5  → 100
  addressCount 3–4   → 75
  addressCount 1–2   → 50
  no signal          → 0

  soldRatioPercent < 10% → +20 bonus (still holding)
  soldRatioPercent > 50% → -30 penalty (exiting)

rsi_score:
  RSI < 25  → 100  (extreme oversold = opportunity)
  RSI 25–35 → 80
  RSI 35–45 → 60
  RSI 45–55 → 40
  RSI 55–65 → 20
  RSI > 65  → 0   (overbought)

volume_score:
  vol_spike > 5×  → 100  (massive volume)
  vol_spike 3–5×  → 80
  vol_spike 2–3×  → 60
  vol_spike 1–2×  → 30
  vol_spike < 1×  → 0

momentum_score:
  momentum > +5%  → 100
  momentum 0–5%   → 60
  momentum -5–0%  → 40
  momentum < -5%  → 20

safety_score:
  no risk flags + holders > 10k → 100
  minor risk + holders 1k–10k   → 60
  risk flags present             → 20
  honeypot / critical            → 0  (filtered out)
```

---

### Step 4 — Security Filter

Remove dangerous tokens before showing results:

```bash
onchainos security token-detection \
  --token-addresses <addr1,addr2,addr3...> \
  --chain <chainId>
```

**Auto-remove from results:**
- `isHoneypot == true`
- `riskLevel == critical`
- Token age < 24 hours (too new)
- Holders < 100

---

### Step 5 — Display Ranked Results

```
Token Screener Results — Base (Smart Money + Technical)
──────────────────────────────────────────────────────────────────────────
#   Token   Price     RSI   Vol Spike  SM Signal     Sold%  Score  Action
──────────────────────────────────────────────────────────────────────────
1   PEPE    $0.0000112  32   3.2×      3 wallets $42k  6%   91    🔥 Strong
2   TOKEN_X $0.0042     28   2.1×      2 wallets $8k   0%   84    📈 Watch
3   DOGE    $0.1014     41   1.8×      5 wallets $91k  12%  79    ✅ Active
4   SHIB    $0.0000183  38   1.4×      1 wallet  $4k   0%   71    ⚠️ Weak SM
5   LINK    $14.20      44   1.2×      0 wallets       —    52    📊 Tech only
──────────────────────────────────────────────────────────────────────────

Legend:
🔥 Strong — smart money active + oversold + volume spike (high confidence)
📈 Watch  — good technicals, emerging signal
✅ Active  — established smart money activity
⚠️ Weak   — limited signal, proceed cautiously
📊 Tech   — technical setup only, no smart money confirmation
```

---

### Step 6 — Deep Dive on Any Token

User can ask: "tell me more about PEPE" or "deep dive #1"

```
Token Deep Dive — PEPE (Base)
──────────────────────────────────────────────────────
Price:        $0.0000112   7d: +24.3%  30d: +67.2%
Market Cap:   $4.7B        Holders: 847,000
Liquidity:    $22.4M       (high — easy to exit)

Smart Money Activity:
  3 wallets bought $42,000 total in last 2 hours
  Avg entry: $0.0000109
  Sold ratio: 6% — still holding ✅

RSI (14d):    32 — Oversold (buy signal territory)
Volume spike: 3.2× average (increasing interest)
Momentum:     +2.1% vs 7d avg (slight uptrend)

Security:
  Honeypot:   ✅ No
  Risk level: ✅ Low
  Verified:   ✅ Yes

30d price chart (ASCII):
  0.0000180 ┤    ╭╮
  0.0000140 ┤   ╭╯╰╮
  0.0000100 ┤───╯   ╰──────── ← now
  0.0000060 ┘

Opportunity Score: 91/100 🔥

"Want to buy PEPE? Say 'buy $20 of PEPE'"
→ Routes to okx-dex-swap
```

---

### Step 7 — Watchlist Screening

User can set up a personal watchlist and screen it:

```
"add ETH, WBTC, SOL, PEPE to my watchlist and screen daily"
```

```
CronCreate: daily at 8am
→ For each token in watchlist:
    onchainos market kline → RSI, momentum, volume
    onchainos signal list → any smart money activity?
→ Report tokens crossing thresholds:
    "📊 Daily Watchlist Alert:
     PEPE: RSI dropped to 28 (oversold) — smart money entered 2h ago
     ETH:  RSI 61, no new signals — hold"
```

---

### Step 8 — One-Click Buy After Screen

After showing results, offer direct execution:

```
"buy $30 of #1 (PEPE)"
→ onchainos swap execute --from usdc --to <PEPE_addr> --readable-amount 30 ...

"buy $10 each of top 3"
→ Execute 3 swaps proportionally
```

---

## Preset Screen Filters

| Preset | Description | Filters |
|---|---|---|
| `oversold` | Technically oversold tokens | RSI < 35 |
| `smart-money` | Smart money consensus buys | addressCount >= 3, soldRatio < 20% |
| `volume-spike` | Unusual volume activity | vol_spike > 2.5× |
| `fresh-signal` | Very recent smart money entry | signal < 1 hour old |
| `whale-only` | Only whale-sized buys | wallet-type 3, amount > $10k |
| `full-scan` | All of the above combined | All filters, ranked by score |

---

## Risk Rules

| Situation | Action |
|---|---|
| Honeypot token | Remove from results entirely |
| Sold ratio > 50% | Label "SM EXITING ⚠️" — deprioritize |
| Token < 24h old | Filter out or label "NEW — extreme risk" |
| Score < 40 | Exclude from default results |
| Single wallet signal (no consensus) | Label "weak signal — low confidence" |

---

## Amount Display Rules

- Scores as integers out of 100
- Volume spike as multiplier (`3.2×`)
- Smart money totals in USD (`$42,000`)
- RSI as integer (`32`)
- Always note: *"Signals are based on onchain data. Not financial advice."*
