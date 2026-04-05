---
name: okx-meme-scout
description: "Use this skill when the user wants to find new meme coins, scan pump.fun launches, check if a dev has rugged before, detect snipers/bundles, find safe meme tokens to buy, or asks things like 'scan pump.fun', 'find new meme coins', 'check this token dev', 'has this dev rugged', 'are there snipers in this token', 'find good meme launches today', 'scan trenches', 'any good memes launching', 'check bundle analysis', 'who else bought this token', 'find alpha meme coins', 'safe meme to buy on Solana', 'scan new launches', 'meme coin screener', 'check rug history', 'show bonding curve progress', 'find clean launches no bundles'. Scans pump.fun and other Solana launchpads via onchainos memepump commands, filters by dev reputation, bundle detection, bonding curve progress, and holder count, scores each token 0-100, and executes Solana buy via onchainos swap execute when user confirms. No API keys required — all through onchainos CLI."
license: MIT
metadata:
  author: okx
  version: "1.0.0"
  homepage: "https://web3.okx.com"
---

# OKX Meme Scout

Scans pump.fun and Solana launchpads for new token launches, filters out rugs and bundles using dev reputation checks and sniper detection, scores every token 0–100, and executes a buy when you say go — all through onchainos with no API keys needed.

## Pre-flight Checks

> Read `../okx-agentic-wallet/_shared/preflight.md`. If that file does not exist, read `_shared/preflight.md` instead.

## Chain Support

> Read `../okx-agentic-wallet/_shared/chain-support.md` for the full list of supported chain names and chainIndex values. If that file does not exist, read `_shared/chain-support.md` instead.

## Skill Routing

| Need | Skill/Tool |
|---|---|
| New token launches | `okx-dex-trenches` → `onchainos memepump tokens` |
| Dev rug history | `okx-dex-trenches` → `onchainos memepump token-dev-info` |
| Bundle / sniper detection | `okx-dex-trenches` → `onchainos memepump token-bundle-info` |
| Token details + holders | `okx-dex-trenches` → `onchainos memepump token-details` |
| Co-investor wallets | `okx-dex-trenches` → `onchainos memepump aped-wallet` |
| Honeypot check | `okx-security` → `onchainos security token-detection` |
| Execute Solana buy | `okx-dex-swap` → `onchainos swap execute` |
| Token price context | `okx-dex-market` → `onchainos market price` |

---

## Execution Flow

### Step 1 — Parse Intent

Identify what the user wants:

| Intent | Action |
|---|---|
| "scan new launches" / "find memes" | Full scan (Steps 2–5) |
| "check this token 0xabc..." | Single token deep dive (Steps 3–4) |
| "check dev of 0xabc..." | Dev reputation only (Step 3b) |
| "who bought this token" | Co-investor lookup (Step 3d) |
| "buy $X of token" | Skip to Step 6 (with security check) |

Extract:
- **Chain**: default `solana`, supports `bsc` (fourmeme)
- **Budget**: how much to spend if buying (ask if not provided)
- **Stage filter**: `NEW` / `MIGRATING` / `MIGRATED` — default `NEW,MIGRATING`
- **Protocol**: default pump.fun — detect from message (`bonk`, `believe`, `fourmeme`)

---

### Step 2 — Scan New Launches

```bash
# Get supported chains + protocol IDs first
onchainos memepump chains

# Scan new launches
onchainos memepump tokens \
  --chain solana \
  --stage NEW,MIGRATING \
  --protocol-id-list <pumpfun_id>
```

**Optional filters based on user message:**
```bash
# Has social presence (more legit)
--has-x           # has Twitter/X
--has-telegram    # has Telegram

# Size filters
--min-market-cap 10000    # at least $10k mcap
--max-market-cap 1000000  # not already too big
```

This returns a list of new token launches. For each token, move to Step 3.

---

### Step 3 — Filter Pipeline (runs in order, stop early if fails)

For each token from Step 2, run these checks in sequence:

#### Step 3a — Bonding Curve Filter

```
bondingCurveProgress = % of bonding curve filled

SKIP if: bondingCurveProgress < 5%     (too early, no interest yet)
SKIP if: bondingCurveProgress > 90%    (too late, about to migrate — slippage risk)
SWEET SPOT: 20%–70%                    ← momentum building, room to grow
```

Score contribution:
```
20–40% curve → +30 pts  (early momentum)
40–70% curve → +40 pts  (sweet spot) ← best
70–90% curve → +20 pts  (late but possible)
```

#### Step 3b — Dev Reputation Check

```bash
onchainos memepump token-dev-info \
  --token-address <tokenAddress> \
  --chain solana
```

Key fields:
- `rugCount` — number of times dev has rugged
- `totalLaunched` — total tokens this dev has launched
- `successRate` — % of their tokens that didn't rug

```
BLOCK if: rugCount > 0           (dev has rugged before — hard no)
WARN if:  totalLaunched > 20     (serial launcher — lower quality)
BONUS if: totalLaunched < 5      (fresh dev — no rug history)

Score contribution:
  rugCount = 0, launched < 5   → +30 pts  ← cleanest
  rugCount = 0, launched 5–20  → +20 pts
  rugCount = 0, launched > 20  → +10 pts
  rugCount > 0                 → REMOVE from list
```

#### Step 3c — Bundle / Sniper Detection

```bash
onchainos memepump token-bundle-info \
  --token-address <tokenAddress> \
  --chain solana
```

Key fields:
- `bundleCount` — number of bundle transactions at launch
- `sniperCount` — number of sniper wallets
- `bundleHoldingPct` — % of supply held by bundlers

```
BLOCK if: bundleHoldingPct > 20%   (insiders hold too much — dump risk)
WARN if:  bundleCount > 3          (coordinated buy — artificial pump)
CLEAN if: bundleCount = 0          (organic launch)

Score contribution:
  No bundles, no snipers           → +20 pts
  1–2 small bundles (<5% holding)  → +10 pts
  3+ bundles OR >10% holding       → REMOVE from list
```

#### Step 3d — Token Details + Holders

```bash
onchainos memepump token-details \
  --token-address <tokenAddress> \
  --chain solana
```

Key fields:
- `holderCount` — number of unique holders
- `top10HoldingPct` — % held by top 10 wallets
- `volume24h` — 24h trading volume

```
SKIP if: holderCount < 30        (no one buying — dead launch)
WARN if: top10HoldingPct > 50%   (too concentrated — whale dump risk)

Score contribution:
  holders > 200                  → +10 pts
  holders 100–200                → +7 pts
  holders 30–100                 → +5 pts
  top10 < 30%                    → bonus +5 pts
```

#### Step 3e — Security Check

```bash
onchainos security token-detection \
  --token-addresses <tokenAddress> \
  --chain 501   # Solana chainIndex
```

```
BLOCK if: isHoneypot = true
BLOCK if: riskLevel = critical
WARN if:  riskLevel = high

Score contribution:
  riskLevel = low    → +10 pts
  riskLevel = medium → +5 pts
  riskLevel = high   → 0 pts (warn)
```

---

### Step 4 — Score + Rank

**Total score formula:**
```
score =
  bonding_curve_score  (0–40 pts)
  + dev_score          (0–30 pts)
  + bundle_score       (0–20 pts)
  + holder_score       (0–10 pts)
  + security_bonus     (0–10 pts)

Max: 110 pts (normalized to 100)
```

**Score labels:**
```
85–100 → 🔥 Strong Buy   (passes all filters cleanly)
70–84  → ✅ Good          (minor concerns, worth watching)
50–69  → ⚠️ Caution       (some yellow flags)
< 50   → ❌ Skip          (too risky)
```

---

### Step 5 — Display Ranked Results

```
Meme Scout — pump.fun / Solana
New Launches (last 2 hours) — filtered from 847 tokens
──────────────────────────────────────────────────────────────────────
#  Token    Curve  Dev Rugs  Bundles  Holders  Score  Signal
──────────────────────────────────────────────────────────────────────
1  DOGCAT   52%    0 rugs    None     312      94     🔥 Strong Buy
2  SOLAPE   38%    0 rugs    1 small  89       81     ✅ Good
3  MOONCAT  61%    0 rugs    None     47       76     ✅ Good
4  PUMPDOG  71%    0 rugs    3 found  201      48     ❌ Bundles detected
5  FROGGY   29%    1 rug     None     —        0      ❌ Dev rugged before
──────────────────────────────────────────────────────────────────────
Scanned: 847 tokens  |  Passed filters: 3  |  Blocked: 844

Top pick: DOGCAT — clean launch, dev fresh, curve 52% (sweet spot)

"Say 'buy $X of DOGCAT' or 'deep dive DOGCAT'"
```

---

### Step 6 — Deep Dive on Any Token

User can ask "tell me more about DOGCAT" or "deep dive #1":

```
Deep Dive — DOGCAT (Solana)
──────────────────────────────────────────────────────
Contract:     <address>
Bonding Curve: 52%  (sweet spot ✅)
Market Cap:   $28,400
24h Volume:   $14,200

Dev Info:
  Address:    <dev_address>
  Launched:   2 tokens before (0 rugs) ✅
  History:    Both previous tokens survived migration

Bundle Analysis:
  Bundles:    0  ✅ Completely clean launch
  Snipers:    0  ✅ No insider activity
  Top 10 hold: 24%  ✅ Not concentrated

Holders:      312  ✅ Good traction
Security:     ✅ Low risk, no honeypot

Co-investors (wallets that aped in):
  onchainos memepump aped-wallet → 12 smart wallets detected

Score: 94/100 🔥
──────────────────────────────────────────────────────
"Buy $20 of DOGCAT?"
```

---

### Step 7 — Execute Buy

When user confirms:

```bash
# Check Solana wallet balance
onchainos wallet balance --chain solana

# Get swap quote
onchainos swap quote \
  --from So11111111111111111111111111111111111111112 \  # SOL
  --to <tokenAddress> \
  --readable-amount <sol_amount> \
  --chain solana

# Execute
onchainos swap execute \
  --from So11111111111111111111111111111111111111112 \
  --to <tokenAddress> \
  --readable-amount <sol_amount> \
  --chain solana \
  --wallet <solanaAddress> \
  --gas-level fast              # fast = important for memes (price moves quick)
```

**Result:**
```
✅ Bought DOGCAT
──────────────────────────────────────────────────────
Spent:      0.12 SOL ($18.20)
Received:   1,624,107 DOGCAT
Price:      $0.0000112/DOGCAT
Tx:         <solana_tx_hash>
──────────────────────────────────────────────────────
Entry at curve 52% — room to grow to migration (100%)
Set a take-profit? → try okx-risk-guard
```

---

### Step 8 — Auto-Scout Mode (Optional)

For users who want continuous scanning:

```
"auto-scan pump.fun every 30 minutes, alert me on 85+ score tokens"
```

```
CronCreate: every 30 minutes
→ onchainos memepump tokens (new launches)
→ Run full filter pipeline per token
→ If score >= 85:
    notify: "🔥 New high-score meme: DOGCAT (94/100)
             Curve: 52% | Dev: clean | Bundles: none
             Say 'buy $X of DOGCAT' to ape in"
```

---

## Supported Launchpads

| Platform | Chain | Stage Filter |
|---|---|---|
| pump.fun | Solana | NEW, MIGRATING, MIGRATED |
| Bonk launchpad | Solana | NEW, MIGRATING |
| Believe.app | Solana | NEW, MIGRATING |
| fourmeme | BNB Chain | NEW, MIGRATING |

To use a specific platform: `"scan believe.app launches"` or `"check fourmeme on BNB"`

---

## Filter Presets

| Preset | Settings | Best for |
|---|---|---|
| `safe` | No rugs, no bundles, holders > 100 | Conservative buyers |
| `early` | Curve 10–40%, holders > 30 | High risk / high reward |
| `sweet-spot` | Curve 40–70%, no bundles | Default — balanced |
| `trending` | Highest volume + holders | Already moving tokens |
| `clean-dev` | Dev launched < 3 tokens, 0 rugs | Trust-first filter |

---

## Risk Rules

| Situation | Action |
|---|---|
| Dev has ANY rug history | Hard block — never show in results |
| Bundles hold > 20% supply | Hard block — coordinated dump risk |
| Honeypot detected | Hard block |
| Curve > 90% | Skip — migration slippage too high |
| Curve < 5% | Skip — no momentum yet |
| Top 10 hold > 60% | Warn — whale concentration |
| Score < 50 | Never show in results |
| Insufficient SOL balance | Alert before attempting buy |

---

## Amount Display Rules

- Bonding curve as % (`52%`)
- Token amounts as full integers (`1,624,107 DOGCAT`)
- SOL amounts to 4 decimals (`0.1200 SOL`)
- Market cap in USD with k/M suffix (`$28.4k`, `$1.2M`)
- Always note: *"Meme coins are extremely high risk. Never invest more than you can afford to lose. This is not financial advice."*
- Always show how many tokens were scanned vs passed filters to show filtering power
