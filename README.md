# XLayer Skills Arena

A suite of **12 agentic DeFi skills** built on OKX Onchain OS. Each skill is a standalone Claude agent that understands natural language, fetches live onchain data, analyzes it, and executes — combining OKX onchainos CLI, Uniswap AI skills, OKX DEX Signal, DexScreener, and DeFi Llama into complete end-to-end workflows.

Built for the OKX Onchain OS Hackathon — targeting **Best Skills Arena**, **Best Data Analyst**, and **Best Uniswap Integration** tracks.

---

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/Nith567/xlayer-skills-arena.git
cd xlayer-skills-arena

# 2. Install all skills (copies to ~/.claude/skills/)
chmod +x install.sh && ./install.sh

# 3. Open Claude Code and start using
```

> `onchainos` CLI is auto-installed on first run via the shared preflight check.
> You need an OKX Agentic Wallet set up for execution. [Get started →](https://web3.okx.com/onchain-os)

---

## Skills Overview

| Skill | One-liner | Prize Target |
|---|---|---|
| [`okx-auto-rebalance`](#okx-auto-rebalance) | Natural language portfolio rebalancer | Skills Arena |
| [`okx-yield-optimizer`](#okx-yield-optimizer) | Best APY finder + auto-deposit across 43 protocols | Skills Arena |
| [`okx-yield-compounder`](#okx-yield-compounder) | Auto-collect + reinvest DeFi rewards for compounded APY | Skills Arena |
| [`okx-liquidation-guard`](#okx-liquidation-guard) | Health factor monitor + auto-repay before liquidation | Skills Arena |
| [`okx-uniswap-strategy`](#okx-uniswap-strategy) | Data-driven LP creator with volatility-based ranges | Uniswap + Data Analyst |
| [`okx-lp-position-manager`](#okx-lp-position-manager) | LP health checker, IL calculator, range rebalancer | Uniswap |
| [`okx-onchain-analyst`](#okx-onchain-analyst) | Portfolio PnL, Sharpe ratio, correlation, signals | Data Analyst |
| [`okx-token-screener`](#okx-token-screener) | Smart money + RSI + volume spike token scanner | Data Analyst |
| [`okx-copy-trader`](#okx-copy-trader) | Mirror smart money / whale / KOL trades automatically | Most Innovative |
| [`okx-smart-dca`](#okx-smart-dca) | RSI-adjusted DCA with automated scheduling | Most Innovative |
| [`okx-risk-guard`](#okx-risk-guard) | Stop-loss / take-profit with auto-swap execution | Most Innovative |
| [`okx-meme-scout`](#okx-meme-scout) | pump.fun scanner — filters 800+ launches to safe buys via dev + bundle checks | Most Innovative |

---

## System Architecture

```
User Prompt (natural language)
          │
          ▼
  Claude Agent reads SKILL.md
  └─ parses intent, extracts params
          │
     ┌────┴───────────────────────────────────────────────────┐
     │                                                        │
     ▼                                                        ▼
OKX Onchain OS (onchainos CLI)                  External Data APIs
  ├─ wallet balance                               ├─ DexScreener
  ├─ swap execute / quote                         │   └─ pool discovery, TVL, volume
  ├─ defi search / invest / withdraw / collect    ├─ DeFi Llama
  ├─ market kline / price                         │   └─ 17k+ pools, APY context
  ├─ security token-detection                     ├─ Uniswap AI Skills
  ├─ defi positions                               │   ├─ liquidity-planner
  ├─ signal list / signal chains                  │   ├─ v4-security-foundations
  ├─ tracker activities                           │   ├─ swap-planner
  └─ leaderboard list                             │   └─ swap-integration
                                                  └─ _shared/
                                                      ├─ preflight.md
                                                      └─ chain-support.md
          │
          ▼
  Plan shown to user → confirmed → executed onchain
  (X Layer / Base / Ethereum / Arbitrum / Solana / ...)
          │
          ▼
  CronCreate → background automation (risk-guard, dca, LP alerts, copy trading)
```

Every skill follows the same 6-step pattern:
1. **Parse** — extract intent, token, chain, amount from natural language
2. **Fetch** — live onchain data via onchainos (price, balance, kline, signals)
3. **Analyze** — score, rank, calculate (APY, volatility, IL, RSI, health factor)
4. **Plan** — show the user what will happen before doing it
5. **Execute** — run onchainos commands with confirmation
6. **Monitor** — schedule CronCreate for ongoing automation

---

## OKX Onchain OS Usage

| onchainos Command | Skills Using It |
|---|---|
| `wallet balance` | all 11 skills |
| `swap execute` | auto-rebalance, uniswap-strategy, lp-position-manager, risk-guard, smart-dca, copy-trader, liquidation-guard |
| `swap quote` | smart-dca, risk-guard |
| `market kline` | uniswap-strategy, lp-position-manager, onchain-analyst, smart-dca, risk-guard, token-screener |
| `market price` | risk-guard, lp-position-manager, smart-dca, liquidation-guard |
| `defi search` | yield-optimizer |
| `defi invest` | yield-optimizer, yield-compounder, liquidation-guard |
| `defi withdraw` | yield-optimizer |
| `defi collect` | yield-compounder |
| `defi positions` | yield-optimizer, lp-position-manager, yield-compounder, liquidation-guard |
| `security token-detection` | uniswap-strategy, auto-rebalance, copy-trader, token-screener |
| `token search` | auto-rebalance, onchain-analyst |
| `signal list` | copy-trader, token-screener |
| `signal chains` | copy-trader, token-screener |
| `tracker activities` | copy-trader, token-screener |
| `leaderboard list` | copy-trader, token-screener |
| `leaderboard supported-chains` | copy-trader, token-screener |
| `memepump tokens` | meme-scout |
| `memepump token-dev-info` | meme-scout |
| `memepump token-bundle-info` | meme-scout |
| `memepump token-details` | meme-scout |
| `memepump aped-wallet` | meme-scout |
| `memepump chains` | meme-scout |

## Uniswap AI Skills Usage

| Uniswap Skill | Skills Using It | What it does |
|---|---|---|
| `liquidity-planner` | uniswap-strategy, lp-position-manager | Builds pre-filled `app.uniswap.org/positions/create` deep links |
| `v4-security-foundations` | uniswap-strategy, lp-position-manager | Hook permission matrix — blocks CRITICAL flags |
| `swap-planner` | lp-position-manager | Finds best multi-hop swap route for rebalancing |
| `swap-integration` | lp-position-manager | Splits large swaps across pools to reduce price impact |

---

## Skill Details

---

### okx-auto-rebalance

Rebalance your entire portfolio to any target allocation by describing it in plain English.

**Trigger prompts:**
```
"rebalance my portfolio: 70% ETH, 20% USDT, 10% USDC on Base"
"put 50% into OKB and keep the rest in stablecoins"
"go 100% ETH"
"rebalance 25% to OKB, remaining to ETH on X Layer"
```

**What happens step by step:**
```
Step 1 — Wallet read
  onchainos wallet balance --chain 8453
  → Found: 0.05 ETH ($103), 200 USDC, 50 USDT  |  Total: $357

Step 2 — Target calculation
  ETH  = 70% = $250  → need +$147
  USDT = 20% = $71   → need +$21
  USDC = 10% = $36   → sell $164 USDC

Step 3 — Trade plan shown
  ┌────────────────────────────────────┐
  │ SELL  164 USDC                     │
  │ BUY   0.0713 ETH  with $143 USDC  │
  │ BUY   21 USDT     with $21 USDC   │
  └────────────────────────────────────┘
  "Confirm? (yes/no)"

Step 4 — Execute (after confirm)
  onchainos swap execute --from usdc --to eth  ...
  onchainos swap execute --from usdc --to usdt ...

Step 5 — Result
  ✅ ETH:  0.1207 ETH  70.1%  Tx: 0xabc...
  ✅ USDT: 71.00 USDT  19.9%  Tx: 0xdef...
  ✅ USDC: 35.80 USDC  10.0%  (unchanged)
```

**Default chain:** X Layer (chainIndex 196) — zero gas fees

---

### okx-yield-optimizer

Scans 43 DeFi platforms for the best yield, cross-references DeFi Llama for market context, scores every option, and auto-deposits.

**Trigger prompts:**
```
"find best yield for my USDC"
"where should I stake my ETH for max APY"
"highest APY for USDT on Arbitrum"
"auto-invest my 500 USDC into best DeFi"
```

**What happens step by step:**
```
Step 1 — Wallet read
  onchainos wallet balance → Found: 847.20 USDC on Base

Step 2 — Scan all protocols
  onchainos defi search --token USDC
  → 43 platforms checked: Aave V3, Morpho, Spark, Fluid, Compound V3...

Step 3 — DeFi Llama cross-reference
  GET https://yields.llama.fi/pools
  → Filter: USDC, TVL > $5M  → 17k+ pools for context

Step 4 — Score each option (APY 50% + TVL 30% + reputation 20%)
  ┌─────────────────────────────────────────────────────┐
  │ #1  Fluid      Ethereum   4.63%   $206M   Score: 94 │ ← BEST
  │ #2  Morpho     Base       3.89%   $272M   Score: 88 │
  │ #3  Spark      Ethereum   3.72%   $395M   Score: 85 │
  └─────────────────────────────────────────────────────┘

Step 5 — Deposit (user says "500 into Fluid")
  onchainos defi invest --investment-id <id> --amount 500000000 ...
  ✅ 500 USDC → Fluid  |  APY: 4.63%  |  Est. monthly: $1.93
```

---

### okx-yield-compounder

Auto-collect and reinvest DeFi rewards to maximize compounded APY. Turns a flat 4.2% into a higher effective yield.

**Trigger prompts:**
```
"auto-compound my Aave rewards"
"reinvest my DeFi earnings daily"
"compound everything"
"set up weekly auto-compound for my Morpho position"
"maximize my APY by compounding"
```

**What happens step by step:**
```
Step 1 — Scan positions
  onchainos defi positions --address <addr> --chains 196,8453
  → Aave V3 X Layer:  500 USDG, 4.2% APY, 0.58 USDG pending ($0.58)
  → Morpho Base:      300 USDC, 3.9% APY, 0.31 USDC pending ($0.31)

Step 2 — Compounding math
  Aave V3 X Layer — gas = $0.00
  Daily compound:  4.2% → 4.28% effective APY  ✅ worth it
  Morpho Base — gas ~$0.12 per tx
  Weekly compound: 3.9% → 3.93% effective APY  ✅ worth it

Step 3 — Collect + reinvest
  onchainos defi collect --investment-id <aave_id>
  → 0.58 USDG collected
  onchainos defi invest --investment-id <aave_id> --amount 580000
  → 0.58 USDG reinvested into Aave V3
  ✅ New balance: 500.58 USDG

Step 4 — Schedule (CronCreate weekly)
  Every Monday 9am:
  → collect + reinvest all eligible positions
  → skip if gas > 10% of reward (Ethereum positions)
```

**X Layer advantage:** Zero gas = compound daily for free. Even $0.01 in rewards is worth collecting.

---

### okx-liquidation-guard

Monitors DeFi borrow positions and auto-repays before the protocol liquidates you at a penalty.

**Trigger prompts:**
```
"protect my Aave position from liquidation"
"alert me if health factor drops below 1.2"
"auto-repay my loan before I get liquidated"
"at what price will I get liquidated"
"is my borrow position safe"
"watch my collateral ratio on Base"
```

**What happens step by step:**
```
Step 1 — Scan borrow positions
  onchainos defi positions --address <addr> --chains 8453,1
  → Aave V3 Base: 0.05 WBTC collateral ($4,200), $2,800 USDC debt

Step 2 — Health factor calculation
  HF = (collateral × liq_threshold) / debt
     = ($4,200 × 0.80) / $2,800 = 1.20  ⚠️ WARNING ZONE

Step 3 — Display + liquidation price
  ┌──────────────────────────────────────────────┐
  │ Aave V3 Base    HF: 1.20  ⚠️  WARNING       │
  │ Liquidation at: WBTC = $70,000 (-16.7%)     │
  │ Repay $560 USDC → HF goes to 1.50 ✅        │
  └──────────────────────────────────────────────┘

Step 4 — Auto-repay (HF < 1.2 threshold)
  onchainos wallet balance → 1,200 USDC available ✅
  onchainos defi invest --investment-id <repay_id> --amount 560000000
  ✅ Repaid $560 USDC | HF: 1.20 → 1.52 | Tx: 0xabc...

Step 5 — CronCreate monitor (hourly)
  HF < 1.5 → warning notification
  HF < 1.2 → auto-repay to 1.5
  HF < 1.05 → emergency max repay
```

**X Layer:** Aave V3 USDG available — hourly health checks are free (zero gas).

---

### okx-uniswap-strategy

Creates optimal Uniswap V3/V4 LP positions using real onchain volatility data to set statistically-grounded price ranges.

**Trigger prompts:**
```
"create ETH/USDC LP on Base"
"best fee tier for WBTC/ETH pool"
"add liquidity to Uniswap with my tokens"
"which Uniswap pool gives highest APY right now"
"is now a good time to LP ETH? show me the data"
```

**What happens step by step:**
```
Step 1 — Wallet read
  onchainos wallet balance --chain 8453
  → ETH: 0.05 ($103)  USDC: 100 ($100)

Step 2 — 30-day volatility (Data Analyst layer)
  onchainos market kline --bar 1D --limit 30
  → std_dev = 2.8% daily  →  weekly_vol = 2.8% × √7 = 7.4%
  → Optimal range = $2,060 × (1 ± 7.4% × 1.5) = $1,831–$2,289

Step 3 — Pool discovery + scoring
  GET https://api.dexscreener.com/token-pairs/v1/base/<USDC>
  fee_apy = volume24h × fee_rate × 365 / TVL
  ┌────────────────────────────────────────────────────────┐
  │ V4  0.30%  $8.2M TVL   $3.1M vol   13.8% APY  ← BEST │
  │ V3  0.05%  $5.1M TVL   $1.2M vol    4.3% APY          │
  └────────────────────────────────────────────────────────┘

Step 4 — Security scan
  onchainos security token-detection → ✅ Safe
  V4 hook check → ✅ No custom hook

Step 5 — Ratio balance + deep link
  Swap 0.00012 ETH → USDC to hit 55/45 ratio
  🔗 app.uniswap.org/positions/create?...minPrice=1831&maxPrice=2289...

Step 6 — CronCreate hourly range monitor
```

**Versions:** V4 on Ethereum, Base, Arbitrum — V3 fallback on Optimism, Polygon, BNB Chain

---

### okx-lp-position-manager

Manages the full LP lifecycle after creation — profitability check, IL calculation, out-of-range rebalancing.

**Trigger prompts:**
```
"is my ETH/USDC LP still in range"
"how much fees vs impermanent loss have I made"
"my LP is out of range, rebalance it"
"exit my LP and find better yield"
"show my real APY including IL"
```

**What happens step by step:**
```
Step 1 — Current price
  onchainos market price → ETH: $2,510
  User range: $1,750–$2,400  →  ⚠️ OUT OF RANGE

Step 2 — IL vs fees
  Fees earned (14 days in range): +$12.40
  Concentrated IL at $2,510:      -$6.74
  Net P&L:                        +$5.66 ✅ still profitable

Step 3 — Rebalance (if user confirms)
  Fresh 30d kline → new optimal range: $2,200–$2,850
  swap-planner: ETH→USDC best route (direct, 0.08% impact)
  onchainos swap execute → rebalance token ratio
  🔗 New Uniswap deep link with updated range
  CronCreate: 2-hour monitor on new range
```

---

### okx-onchain-analyst

Deep portfolio analytics — 30-day PnL, Sharpe ratio, token correlation matrix, market signals.

**Trigger prompts:**
```
"analyze my portfolio"
"which token is my best performer this month"
"am I too concentrated in ETH"
"show my Sharpe ratio and risk profile"
"which of my tokens are oversold right now"
```

**What happens step by step:**
```
Step 1 — Fetch all holdings
  onchainos wallet balance → ETH $124, WBTC $89, SOL $32, USDC $48

Step 2 — 30-day kline for each token (parallel)
  onchainos market kline --bar 1D --limit 30 (per token)

Step 3 — Per-token metrics
  ETH:  +18.3%  vol 42%  Sharpe 0.82  RSI 61
  WBTC: +22.1%  vol 38%  Sharpe 1.14  RSI 68
  SOL:  -8.4%   vol 71%  Sharpe -0.22 RSI 38

Step 4 — Correlation matrix
  ETH ↔ WBTC: 0.84  ⚠️ highly correlated
  ETH ↔ SOL:  0.61
  ETH ↔ USDC: 0.02

Step 5 — Portfolio health score: 71/100
  Risk-adjusted returns: 78/100 ✅
  Diversification:       62/100 ⚠️ ETH+WBTC overlap
  Stablecoin hedge:      82/100 ✅

Step 6 — 3 data-driven actions
  1. WBTC top performer (Sharpe 1.14) → take partial profit
  2. SOL oversold (RSI 38) → watch for bounce
  3. Reduce ETH/WBTC correlation → diversify
```

---

### okx-token-screener

Smart money + technical indicator scanner. Finds the highest-opportunity tokens on any chain by combining OKX DEX Signal intelligence with RSI and volume data.

**Trigger prompts:**
```
"what are smart money buying right now on Base"
"find tokens with volume spike today"
"show oversold tokens with whale activity"
"screen for breakout opportunities"
"find alpha on Base"
"which tokens have RSI under 30 and smart money signal"
```

**What happens step by step:**
```
Step 1 — Pull smart money signals
  onchainos signal list --chain base --wallet-type 1,3
  → Smart Money + Whale buy alerts from last 2 hours

Step 2 — Technical scan for each signalled token
  onchainos market kline --bar 1D --limit 14 (per token)
  → RSI, volume spike vs 7d avg, momentum

Step 3 — Opportunity score (0–100)
  smart_money consensus (35%) + RSI oversold (25%)
  + volume spike (20%) + momentum (10%) + safety (10%)

Step 4 — Security filter
  onchainos security token-detection (batch)
  → remove honeypots, critical risk

Step 5 — Ranked results
  ┌───────────────────────────────────────────────────────────┐
  │ #1 PEPE   RSI 32  Vol 3.2×  3 SM wallets $42k  Score 91 │ 🔥
  │ #2 DOGE   RSI 41  Vol 1.8×  5 SM wallets $91k  Score 79 │ ✅
  │ #3 LINK   RSI 44  Vol 1.2×  0 signals          Score 52 │ 📊
  └───────────────────────────────────────────────────────────┘
  "Want to buy PEPE? Say 'buy $20 of PEPE'"
  → routes to okx-dex-swap
```

**Also supports:** watchlist screening, daily screener via CronCreate, deep-dive per token, one-click buy after screen.

---

### okx-copy-trader

Mirror the trades of smart money, whales, KOLs, top leaderboard traders, or any specific wallet — proportionally and automatically using OKX DEX Signal.

**Trigger prompts:**
```
"copy smart money trades on Base"
"follow what KOLs are buying"
"copy the #1 trader on the leaderboard"
"mirror this wallet: 0xabc..."
"auto-copy whale buys"
"set up copy trading for smart money"
```

**What happens step by step:**
```
Step 1 — Find who to copy (4 modes)
  Smart Money:  onchainos tracker activities --tracker-type smart_money
  KOL:          onchainos tracker activities --tracker-type kol
  Leaderboard:  onchainos leaderboard list --sort-by 5 (ROI)
                → pick #1 trader → track their wallet
  Specific:     onchainos tracker activities --tracker-type multi_address
                                             --wallet-address 0xabc...

Step 2 — Show who you're copying
  Top Trader: 0x7f3a...9b2c
  7d ROI: +847%  |  Win Rate: 78%  |  23 trades this week
  Recent buys: PEPE $4,200 (6h ago, 6% sold — still holding ✅)

Step 3 — Security check before copying
  onchainos security token-detection → honeypot? risk level?
  Block if: honeypot / critical risk / sold ratio > 50%

Step 4 — Proportional sizing
  Their trade: $4,200 PEPE
  Your portfolio: $312  |  Copy budget: 20% = $62
  Your copy: $15.80 USDC → PEPE (proportional)

Step 5 — Execute
  onchainos swap execute --from usdc --to <PEPE> --gas-level fast
  ✅ Bought 1,410,714 PEPE at $0.0000112 | Tx: 0xabc...

Step 6 — Auto-exit when they exit (CronCreate every 30 min)
  Monitors sell feed → if smart money sells >30%:
  auto-sell your position back to USDC
  "🚨 Smart money exiting PEPE — auto-sold at $X"
```

**X Layer advantage:** Zero gas = copy every trade for free, no matter how small.

---

### okx-smart-dca

Volatility-adjusted DCA. Buys more when RSI is oversold (dips), less when overbought — automated via CronCreate.

**Trigger prompts:**
```
"DCA $50 into ETH every week"
"buy $100 of BTC every Monday"
"smart DCA into SOL daily with RSI sizing"
"accumulate ETH, buy more on dips"
```

**What happens step by step:**
```
Step 1 — Market analysis
  onchainos market kline --bar 1D --limit 30
  → RSI 34 (oversold)  |  Price -8.2% below 30d avg

Step 2 — Smart sizing
  RSI 34 → 1.5× multiplier
  Below avg → +0.2× bonus
  Base $50 × 1.7 = $85 this week

Step 3 — Execute
  onchainos swap execute --from usdc --to eth --readable-amount 85
  ✅ 0.04123 ETH at $2,061 | Tx: 0xabc...

Step 4 — CronCreate weekly
  Every Monday: fetch RSI → calculate size → swap → report
  Tracks cost basis across all cycles
```

**Modes:** smart (RSI-adjusted) / fixed / aggressive / conservative

---

### okx-risk-guard

Automated stop-loss and take-profit. Monitors every 30 minutes via CronCreate, auto-swaps when your trigger price is hit.

**Trigger prompts:**
```
"set stop-loss on ETH at $1,800"
"take profit on WBTC at $95,000"
"set 10% trailing stop on ETH"
"alert me if SOL drops 20%"
"protect my portfolio if it drops 25% overall"
```

**What happens step by step:**
```
Step 1 — Market context
  onchainos market price → ETH: $2,060
  onchainos market kline → 30d low $1,820, vol 3.2%/day
  Probability of stop hit in 30 days: 38.4%

Step 2 — Guard summary
  Stop-Loss:   $1,800 → sell 100% to USDC  (-12.6%)
  Take-Profit: $2,500 → sell 50% to USDC   (+21.4%)
  "Confirm?"

Step 3 — CronCreate every 30 min
  onchainos market price → check vs triggers
  if price < 1800: swap ETH → USDC (100%), notify, delete guard
  if price > 2500: swap ETH → USDC (50%), notify

Step 4 — On trigger
  🚨 ETH dropped to $1,792
  Sold 0.1234 ETH → $220.92 USDC | Tx: 0xabc...
  → "Want to DCA back in? Try okx-smart-dca"
```

**Guard types:** fixed stop-loss, fixed take-profit, trailing stop, flash crash (4h drop%), portfolio-level guard

---

### okx-meme-scout

Scans pump.fun and Solana launchpads every 30 minutes, filters hundreds of new launches down to safe buys using dev reputation, bundle detection, bonding curve analysis, and holder checks — then executes via Solana wallet.

**Trigger prompts:**
```
"scan pump.fun for new meme coins"
"find safe meme launches today"
"has this dev rugged before? 0xabc..."
"are there snipers in this token"
"find clean launches on Solana"
"auto-scan memes, alert me on score 85+"
"buy $20 of DOGCAT"
```

**What happens step by step:**
```
Step 1 — Scan all new launches
  onchainos memepump tokens --chain solana --stage NEW,MIGRATING
  → Returns 847 new launches in last 2 hours

Step 2 — Filter pipeline (runs per token, stops early on fail)

  Bonding curve: skip < 5% (no momentum) and > 90% (too late)
  → Sweet spot: 20–70%

  Dev check:
  onchainos memepump token-dev-info --token-address <addr>
  → rugCount > 0? ❌ BLOCKED immediately

  Bundle check:
  onchainos memepump token-bundle-info --token-address <addr>
  → bundleHoldingPct > 20%? ❌ BLOCKED (insiders hold too much)

  Holder check:
  onchainos memepump token-details --token-address <addr>
  → holderCount < 30? ❌ SKIP (dead launch)

  Security:
  onchainos security token-detection --chain 501
  → honeypot? ❌ BLOCKED

Step 3 — Score remaining tokens (0–100)
  curve sweet spot  → up to 40 pts
  clean dev         → up to 30 pts
  no bundles        → up to 20 pts
  holders           → up to 10 pts

Step 4 — Show ranked results
  ┌──────────────────────────────────────────────────────────────┐
  │ Scanned: 847 tokens  |  Passed: 3  |  Blocked: 844          │
  │                                                              │
  │ #1 DOGCAT  Curve 52%  0 rugs  No bundles  312 holders  94 🔥│
  │ #2 SOLAPE  Curve 38%  0 rugs  1 small     89 holders   81 ✅│
  │ #3 MOONCAT Curve 61%  0 rugs  No bundles  47 holders   76 ✅│
  └──────────────────────────────────────────────────────────────┘

Step 5 — User says "buy $20 of DOGCAT"
  onchainos swap execute --from SOL --to <DOGCAT> --chain solana --gas-level fast
  ✅ Bought 1,624,107 DOGCAT for 0.12 SOL | Tx: <hash>

Step 6 — Optional: CronCreate auto-scout every 30 min
  → alerts on score 85+ tokens automatically
```

**No API keys needed** — all through `onchainos` CLI. Requires Solana wallet in OKX agentic wallet for buy step.

---

## Skill Composition — Full DeFi Lifecycle

```
okx-token-screener       ← find opportunities (smart money signals + RSI)
      │
      ▼
okx-onchain-analyst      ← analyze your current portfolio first
      │
      ▼
okx-auto-rebalance       ← shift allocation based on analysis
      │
      ├──────────────────────────────────────────┐
      ▼                                          ▼
okx-yield-optimizer              okx-uniswap-strategy
deploy stablecoins to yield      deploy ETH to Uniswap LP
      │                                          │
okx-yield-compounder             okx-lp-position-manager
auto-compound rewards            monitor IL, rebalance range
      │                                          │
      └──────────────────┬───────────────────────┘
                         ▼
               okx-liquidation-guard    ← protect borrows
                         │
               okx-risk-guard           ← stop-loss on tokens
                         │
               okx-smart-dca            ← accumulate on dips
                         │
               okx-copy-trader          ← follow smart money
```

---

## CronCreate — Automated Background Actions

| Skill | Schedule | What it does |
|---|---|---|
| `okx-uniswap-strategy` | Hourly | Alerts if LP goes out of price range |
| `okx-lp-position-manager` | Every 2 hours | Suggests rebalance when out of range |
| `okx-risk-guard` | Every 30 min | Executes stop-loss or take-profit swap |
| `okx-smart-dca` | Daily / Weekly | RSI-adjusted scheduled buy |
| `okx-copy-trader` | Every 30 min | Mirrors new buys, auto-exits when target sells |
| `okx-liquidation-guard` | Hourly | Health factor check + auto-repay |
| `okx-yield-compounder` | Daily / Weekly | Collect rewards + reinvest |
| `okx-token-screener` | Daily 8am | Watchlist RSI + smart money morning report |

---

## Deployment & Chain Support

### X Layer (Primary Chain — Chain ID 196)

Zero gas fees make X Layer the default for all automation-heavy skills:

- `okx-risk-guard` — 30-min monitoring is free. On Ethereum: hundreds in gas/month.
- `okx-copy-trader` — copy every trade for free, even small ones.
- `okx-smart-dca` — $10 weekly buys. Gas would destroy returns on mainnet.
- `okx-yield-compounder` — compound daily for free. Even $0.01 rewards worth collecting.
- `okx-liquidation-guard` — hourly health checks at zero cost.
- `okx-auto-rebalance` — default chain, zero gas multi-hop rebalancing.

### All Supported Chains

| Chain | Chain ID | Notes |
|---|---|---|
| X Layer | 196 | Zero gas, default for automation |
| Ethereum | 1 | Uniswap V4, deepest liquidity |
| Base | 8453 | Uniswap V4, primary demo chain |
| Arbitrum | 42161 | Uniswap V4, low fees |
| Optimism | 10 | Uniswap V3 |
| Polygon | 137 | Uniswap V3 |
| BNB Chain | 56 | Uniswap V3 |
| Solana | 501 | Jito, Kamino, Raydium, Orca |
| Avalanche | 43114 | BENQI, yield protocols |

### Agentic Wallet

All skills use OKX Agentic Wallet as onchain identity.

```
EVM (Base / Ethereum / Arbitrum / X Layer): 0x<your-address>
```

---

## Data Sources

| Source | Used For |
|---|---|
| OKX Onchain OS (`onchainos`) | Wallet, swaps, DeFi, market data, security, signals, leaderboard |
| OKX DEX Signal | Smart money tracking, whale signals, KOL activity, top trader leaderboard |
| DexScreener (`api.dexscreener.com`) | Uniswap pool discovery, TVL, 24h volume |
| DeFi Llama (`yields.llama.fi`) | 17k+ pool APY context, market-wide comparison |
| Uniswap AI (`github.com/Uniswap/uniswap-ai`) | LP deep links, V4 hook security, swap routing |

---

## Repository Structure

```
xlayer-skills-arena/
├── okx-auto-rebalance/          ← Portfolio rebalancer (X Layer default)
│   ├── SKILL.md
│   └── references/cli-reference.md
├── okx-yield-optimizer/         ← APY scanner + auto-deposit
│   ├── SKILL.md
│   └── references/cli-reference.md
├── okx-uniswap-strategy/        ← LP creator (volatility-based ranges)
│   ├── SKILL.md
│   └── references/data-providers.md
├── okx-lp-position-manager/     ← LP lifecycle (IL, rebalance)
│   └── SKILL.md
├── okx-onchain-analyst/         ← Portfolio analytics (Sharpe, RSI, correlation)
│   └── SKILL.md
├── okx-token-screener/          ← Smart money + technical token scanner
│   └── SKILL.md
├── okx-copy-trader/             ← Mirror smart money / whale / KOL trades
│   └── SKILL.md
├── okx-smart-dca/               ← RSI-adjusted DCA with scheduling
│   └── SKILL.md
├── okx-risk-guard/              ← Stop-loss / take-profit automation
│   └── SKILL.md
├── okx-liquidation-guard/       ← Borrow health monitor + auto-repay
│   └── SKILL.md
├── okx-yield-compounder/        ← Auto-compound DeFi rewards
│   └── SKILL.md
├── okx-meme-scout/              ← pump.fun scanner + rug filter + Solana buy
│   └── SKILL.md
│
├── okx-agentic-wallet/          ← OKX wallet base skill
│   └── _shared/
│       ├── preflight.md         ← onchainos install + version check
│       └── chain-support.md     ← chain name → chainIndex mapping
├── okx-dex-swap/                ← Swap primitives
├── okx-dex-market/              ← Market data primitives
├── okx-dex-signal/              ← Smart money signals + leaderboard
├── okx-dex-trenches/            ← pump.fun / meme launchpad data
├── okx-security/                ← Token security scanning
└── [+ 6 more OKX base skills]
```

---

## Team

| Name | Role |
|---|---|
| Nithin | Builder |

---

## License

MIT
