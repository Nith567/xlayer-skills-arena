# XLayer Skills Arena

A suite of 7 agentic DeFi skills built on OKX Onchain OS. Each skill is a standalone Claude agent that understands natural language, fetches live onchain data, analyzes it, and executes — combining OKX onchainos CLI, Uniswap AI skills, DexScreener, and DeFi Llama into complete end-to-end workflows.

Built for the OKX Onchain OS Hackathon — targeting **Best Skills Arena**, **Best Data Analyst**, and **Best Uniswap Integration** tracks.

---

## Skills Overview

| Skill | One-liner | Prize Target |
|---|---|---|
| [`okx-auto-rebalance`](#okx-auto-rebalance) | Natural language portfolio rebalancer | Skills Arena |
| [`okx-yield-optimizer`](#okx-yield-optimizer) | Best APY finder + auto-deposit across 43 protocols | Skills Arena |
| [`okx-uniswap-strategy`](#okx-uniswap-strategy) | Data-driven LP creator with volatility-based ranges | Uniswap + Data Analyst |
| [`okx-lp-position-manager`](#okx-lp-position-manager) | LP health checker, IL calculator, range rebalancer | Uniswap |
| [`okx-onchain-analyst`](#okx-onchain-analyst) | Portfolio PnL, Sharpe ratio, correlation, signals | Data Analyst |
| [`okx-smart-dca`](#okx-smart-dca) | RSI-adjusted DCA with automated scheduling | Most Innovative |
| [`okx-risk-guard`](#okx-risk-guard) | Stop-loss / take-profit with auto-swap execution | Most Innovative |

---

## System Architecture

```
User Prompt (natural language)
          │
          ▼
  Claude Agent reads SKILL.md
  └─ parses intent, extracts params
          │
     ┌────┴──────────────────────────────────────────────┐
     │                                                   │
     ▼                                                   ▼
OKX Onchain OS (onchainos CLI)              External Data APIs
  ├─ onchainos wallet balance                 ├─ DexScreener
  ├─ onchainos swap execute/quote             │   └─ pool discovery, TVL, volume
  ├─ onchainos defi search/invest/withdraw    ├─ DeFi Llama
  ├─ onchainos market kline/price             │   └─ 17k+ pools, APY context
  ├─ onchainos security token-detection       └─ Uniswap AI Skills
  └─ onchainos defi positions                     ├─ liquidity-planner
                                                  ├─ v4-security-foundations
                                                  ├─ swap-planner
                                                  └─ swap-integration
          │
          ▼
  Plan shown to user → confirmed → executed onchain
  (X Layer / Base / Ethereum / Arbitrum / Solana / ...)
          │
          ▼
  CronCreate → background monitoring (risk-guard, dca, LP alerts)
```

Every skill follows the same 6-step pattern:
1. **Parse** — extract token, chain, amount, intent from natural language
2. **Fetch** — live onchain data (price, balance, kline history)
3. **Analyze** — score, rank, calculate (APY, volatility, IL, RSI)
4. **Plan** — show the user what will happen before doing it
5. **Execute** — run onchainos commands with confirmation
6. **Monitor** — optionally schedule CronCreate for ongoing alerts

---

## OKX Onchain OS Usage

| onchainos Command | Skills Using It |
|---|---|
| `wallet balance` | all 7 skills |
| `swap execute` | auto-rebalance, uniswap-strategy, lp-position-manager, risk-guard, smart-dca |
| `swap quote` | smart-dca, risk-guard |
| `market kline` | uniswap-strategy, lp-position-manager, onchain-analyst, smart-dca, risk-guard |
| `market price` | risk-guard, lp-position-manager, smart-dca |
| `defi search` | yield-optimizer |
| `defi invest` | yield-optimizer |
| `defi withdraw` | yield-optimizer |
| `defi positions` | yield-optimizer, lp-position-manager |
| `security token-detection` | uniswap-strategy, auto-rebalance |
| `token search` | auto-rebalance, onchain-analyst |

## Uniswap AI Skills Usage

| Uniswap Skill | Skills Using It | What it does |
|---|---|---|
| `liquidity-planner` | uniswap-strategy, lp-position-manager | Builds pre-filled `app.uniswap.org/positions/create` deep links |
| `v4-security-foundations` | uniswap-strategy, lp-position-manager | Hook permission matrix — blocks CRITICAL flags like `beforeSwapReturnDelta` |
| `swap-planner` | lp-position-manager | Finds best multi-hop swap route for rebalancing |
| `swap-integration` | lp-position-manager | Splits large swaps across multiple pools to reduce price impact |

---

## Skill Details

---

### okx-auto-rebalance

Rebalance your entire portfolio to any target allocation by just describing it in plain English. Handles all the math, ordering, and execution automatically.

**Trigger prompts:**
```
"rebalance my portfolio: 70% ETH, 20% USDT, 10% USDC on Base"
"put 50% into OKB and keep the rest in stablecoins"
"go 100% ETH"
"rebalance 25% to OKB, remaining to ETH on X Layer"
```

**What happens when you say `"rebalance 70% ETH, 20% USDT, 10% USDC on Base"`:**

```
Step 1 — Wallet read
  onchainos wallet balance --chain 8453
  → Found: 0.05 ETH ($103), 200 USDC, 50 USDT
  → Total portfolio: $357

Step 2 — Target calculation
  Target:  ETH  = 70% = $250  (need +$147 ETH)
           USDT = 20% = $71   (need +$21 USDT)
           USDC = 10% = $36   (need to sell $164 USDC)

Step 3 — Trade plan shown to user
  ┌─────────────────────────────────────────┐
  │ SELL: 164 USDC                          │
  │ BUY:  0.0713 ETH  with 143 USDC        │
  │ BUY:  21 USDT     with 21 USDC         │
  └─────────────────────────────────────────┘
  "Confirm? (yes/no)"

Step 4 — Execution (after confirm)
  onchainos swap execute --from usdc --to eth --readable-amount 143 ...
  onchainos swap execute --from usdc --to usdt --readable-amount 21 ...

Step 5 — Final report
  ✅ ETH:  0.1207 ETH  (70.1%)  Tx: 0xabc...
  ✅ USDT: 71.00 USDT  (19.9%)  Tx: 0xdef...
  ✅ USDC: 35.80 USDC  (10.0%)  (unchanged)
```

**Default chain:** X Layer (chainIndex 196) — zero gas fees

---

### okx-yield-optimizer

Scans 43 DeFi platforms for the best yield on your token, cross-references DeFi Llama for market context, scores every option, and auto-deposits into the winner.

**Trigger prompts:**
```
"find best yield for my USDC"
"where should I stake my ETH for max APY"
"highest APY for USDT on Arbitrum"
"auto-invest my 500 USDC into best DeFi"
"compare lending rates for USDC across protocols"
```

**What happens when you say `"find best yield for my USDC"`:**

```
Step 1 — Wallet read
  onchainos wallet balance
  → Found: 847.20 USDC on Base

Step 2 — Scan all protocols
  onchainos defi search --token USDC
  → Returns: Aave V3, Morpho, Spark, Fluid, Compound V3, ...
  (43 platforms checked in one call)

Step 3 — DeFi Llama cross-reference
  GET https://yields.llama.fi/pools
  → Filter: USDC, TVL > $5M, APY 0.5–50%
  → Shows broader market (17k+ pools) for context

Step 4 — Scoring each option
  score = (APY × 0.50) + (TVL × 0.30) + (platform reputation × 0.20)

  Results:
  ┌──────────────────────────────────────────────────────┐
  │ #1  Fluid      Ethereum   4.63%   $206M   Score: 94 │ ← RECOMMENDED
  │ #2  Syrup      Ethereum   4.63%   $1.7B   Score: 96 │
  │ #3  Morpho     Base       3.89%   $272M   Score: 88 │
  │ #4  Spark      Ethereum   3.72%   $395M   Score: 85 │
  └──────────────────────────────────────────────────────┘
  "How much USDC to deposit into Fluid?"

Step 5 — Execute (after user says "500")
  onchainos defi detail --investment-id <id>   ← get decimals
  onchainos defi invest --investment-id <id> --amount 500000000 ...

Step 6 — Summary
  ✅ 500 USDC deposited into Fluid (Ethereum)
  Expected APY: 4.63%  |  Est. monthly: $1.93  |  Tx: 0x...
```

---

### okx-uniswap-strategy

The data analyst LP strategist. Uses 30 days of real onchain price data to calculate the statistically optimal LP range, scores every available pool by actual fee APY, runs security checks on both the tokens and the V4 hook, then generates a pre-filled Uniswap deep link.

**Trigger prompts:**
```
"create ETH/USDC LP on Base"
"best fee tier for WBTC/ETH pool"
"add liquidity to Uniswap with my tokens"
"which Uniswap pool gives highest APY right now"
"is now a good time to LP ETH? show me the data"
"I have 0.05 ETH and 100 USDC, open a Uniswap position"
"scan this pool before I add liquidity"
```

**What happens when you say `"create ETH/USDC LP on Base"`:**

```
Step 1 — Wallet read
  onchainos wallet balance --chain 8453
  → ETH: 0.05 ($103)  USDC: 100 ($100)

Step 2 — 30-day volatility analysis (Data Analyst layer)
  onchainos market kline --chain 8453 --token-address <WETH> --bar 1D --limit 30
  → Calculates daily returns over 30 days
  → std_dev = 0.028  (2.8% daily)
  → weekly_vol = 0.028 × √7 = 7.4%
  → Suggested range = $2,060 × (1 ± 7.4% × 1.5) = $1,831 – $2,289

Step 3 — Pool discovery + scoring
  GET https://api.dexscreener.com/token-pairs/v1/base/<USDC>
  → Finds all Uniswap ETH/USDC pools on Base

  Scoring: fee_apy = (volume24h × fee_rate × 365) / TVL
  ┌───────────────────────────────────────────────────────┐
  │ V4  0.30%  $8.2M TVL   $3.1M vol   13.8% APY  91 pts│ ← BEST
  │ V3  0.05%  $5.1M TVL   $1.2M vol    4.3% APY  72 pts│
  │ V3  1.00%  $1.8M TVL   $800K vol   16.2% APY  68 pts│
  └───────────────────────────────────────────────────────┘

Step 4 — Security scan (parallel)
  onchainos security token-detection --token-addresses <ETH>,<USDC> --chain 8453
  + V4 hook check via v4-security-foundations skill
  → ETH: ✅ Safe  |  USDC: ✅ Safe  |  Hook: ✅ No custom hook

Step 5 — Token ratio auto-balance
  For range $1,831–$2,289 at current price $2,060:
  ratio = 0.55 → need 55% ETH, 45% USDC value
  Current: 51% ETH, 49% USDC → swap 0.00012 ETH → USDC
  onchainos swap execute --from eth --to usdc --readable-amount 0.00012 ...

Step 6 — Deep link (liquidity-planner logic)
  https://app.uniswap.org/positions/create
    ?currencyA=NATIVE&currencyB=0x833589f...
    &chain=base
    &fee={%22feeAmount%22:3000,%22tickSpacing%22:60,%22isDynamic%22:false}
    &priceRangeState={...%22minPrice%22:%221831%22,%22maxPrice%22:%222289%22...}
    &depositState={...%22TOKEN0%22:%220.049%22...}

Step 7 — Monitor setup
  CronCreate: hourly
  → checks ETH price, alerts if outside $1,831–$2,289
```

**Versions:** V4 on Ethereum, Base, Arbitrum — V3 fallback on Optimism, Polygon, BNB Chain

---

### okx-lp-position-manager

Manages everything after a Uniswap LP position is open. Tells you if your LP is actually profitable (fees vs IL), detects out-of-range positions, calculates a new optimal range from fresh volatility data, and rebalances.

**Trigger prompts:**
```
"is my ETH/USDC LP still in range"
"check my Uniswap position health"
"how much fees have I earned vs impermanent loss"
"is my LP making money or losing to IL"
"my LP is out of range, rebalance it"
"ETH pumped past my range — what do I do"
"exit my LP and find better yield"
"show my real APY including impermanent loss"
```

**What happens when you say `"is my ETH/USDC LP profitable"`:**

```
Step 1 — Fetch current state
  onchainos market price --chain 8453 --token-address <WETH>
  → Current ETH: $2,510

  User's position: entry $1,920, range $1,750–$2,400, opened 14 days ago

Step 2 — In-range check
  $2,510 > $2,400 → ⚠️ OUT OF RANGE — earning 0 fees right now

Step 3 — IL calculation
  k = 2510 / 1920 = 1.307
  concentration = √(2400/1750) = 1.17
  IL% = (2×√1.307 / (1+1.307) - 1) × 1.17 = -2.3%
  IL_usd = $-6.74

Step 4 — Fee income estimate
  poolShare × volume24h × feeRate × 14 days
  = ~$12.40 (while in range, position was active 10 of 14 days)

Step 5 — Net P&L display
  ┌──────────────────────────────────────────┐
  │ Status:    ⚠️ OUT OF RANGE               │
  │ Fee income: +$12.40                      │
  │ IL loss:    -$6.74                       │
  │ Net P&L:    +$5.66 ✅ Still profitable   │
  │ Net APY:    +6.2%                        │
  └──────────────────────────────────────────┘
  Options: rebalance range / exit / wait

Step 6 — If user says "rebalance":
  onchainos market kline ... → fresh 30d volatility
  new range = $2,200–$2,850 (current $2,510 is IN this range ✅)
  swap-planner: ETH→USDC route (direct 0.05% pool, 0.08% impact)
  onchainos swap execute ...
  → new Uniswap deep link with updated range
  → CronCreate: 2-hour monitor on new range
```

---

### okx-onchain-analyst

Pure data analysis skill. Pulls 30-day price history for every token in your wallet, calculates institutional-grade metrics, and turns them into plain-English portfolio intelligence.

**Trigger prompts:**
```
"analyze my portfolio"
"which token is my best performer this month"
"am I too concentrated in ETH"
"show my Sharpe ratio"
"give me a diversification report"
"which of my tokens are oversold right now"
"is my portfolio risky"
"what's my 30-day PnL"
```

**What happens when you say `"analyze my portfolio"`:**

```
Step 1 — Fetch all holdings
  onchainos wallet balance (all chains)
  → ETH $124, WBTC $89, SOL $32, USDC $48

Step 2 — 30-day kline for each token (parallel)
  onchainos market kline --bar 1D --limit 30 (per token)

Step 3 — Per-token metrics
  For each token:
  → 30d return:     ETH +18.3%  WBTC +22.1%  SOL -8.4%
  → Annualized vol: ETH 42%     WBTC 38%     SOL 71%
  → Sharpe ratio:   ETH 0.82    WBTC 1.14    SOL -0.22
  → RSI (14d):      ETH 61      WBTC 68      SOL 38

Step 4 — Portfolio-level stats
  Weighted return: +12.8%
  Portfolio vol:   38.2% annualized
  Portfolio Sharpe: 0.71 (Good)

Step 5 — Correlation matrix
  ETH ↔ WBTC: 0.84  ← highly correlated ⚠️
  ETH ↔ SOL:  0.61
  ETH ↔ USDC: 0.02

Step 6 — Health score
  Risk-adjusted returns: 78/100
  Diversification:       62/100  (ETH+WBTC overlap)
  Market momentum:       68/100
  Stablecoin hedge:      82/100
  ──────────────────────
  Portfolio Health: 71/100 — GOOD 🟢

Step 7 — 3 actionable insights
  1. WBTC is top performer (Sharpe 1.14) — consider taking 10–20% profit
  2. SOL oversold (RSI 38, bearish) — watch for bounce before adding
  3. ETH + WBTC 84% correlated — reduce overlap for better diversification
```

---

### okx-smart-dca

Dollar cost averaging that actually thinks. Checks RSI and price vs 30-day average before every buy, adjusts the purchase size up or down accordingly, then schedules all future buys automatically via CronCreate.

**Trigger prompts:**
```
"DCA $50 into ETH every week"
"buy $100 of BTC every Monday"
"set up smart DCA into SOL daily"
"accumulate ETH with $30 per week, buy more on dips"
"auto-invest $200/month into ETH"
"start aggressive DCA into WBTC"
```

**What happens when you say `"DCA $50 into ETH every week"`:**

```
Step 1 — Market analysis
  onchainos market kline --bar 1D --limit 30
  → RSI (14d) = 34  ← Oversold
  → Current: $2,060  |  30d avg: $2,240  |  -8.2% below average

Step 2 — Smart sizing
  RSI 34 (oversold)    → multiplier 1.5×
  Price -8.2% vs avg   → bonus +0.2×
  ──────────────────────────────────────
  Base budget: $50
  This week:   $85  (1.7× — good entry signal)

Step 3 — Pre-buy check
  onchainos swap quote --from usdc --to eth --readable-amount 85
  → Output: 0.04123 ETH  |  Impact: 0.06%  |  No honeypot ✅

Step 4 — Execute
  onchainos swap execute --from usdc --to eth --readable-amount 85 ...
  ✅ Bought 0.04123 ETH at $2,061  |  Tx: 0xabc...

Step 5 — Schedule future buys
  CronCreate: "0 9 * * 1"  (every Monday 9am)
  → Repeat: fetch RSI → calculate size → swap → report

Step 6 — Cost basis tracking
  ┌────────────────────────────────────────────────────┐
  │ Cycle 1  RSI 34  1.7×  $85    0.04123 ETH         │
  │ Cycle 2  RSI 51  1.0×  $50    0.02381 ETH         │
  │ ─────────────────────────────────────────────────  │
  │ Total: $135 invested  |  0.065 ETH  |  avg $2,077 │
  └────────────────────────────────────────────────────┘
```

**Modes:** `smart` (RSI-adjusted) / `fixed` / `aggressive` / `conservative`

---

### okx-risk-guard

Sets price-triggered protection on any token. Monitors in the background via CronCreate, and auto-executes a protective swap the moment your threshold is hit — no manual watching required.

**Trigger prompts:**
```
"set stop-loss on ETH at $1,800"
"alert me if SOL drops 20%"
"take profit on WBTC at $95,000"
"set 10% trailing stop on my ETH"
"protect my portfolio if it drops 25% overall"
"sell half my ETH if it hits $3,000"
"set a flash crash guard on SOL"
```

**What happens when you say `"set stop-loss on ETH at $1,800, take profit at $2,500"`:**

```
Step 1 — Market context
  onchainos market price → ETH current: $2,060
  onchainos market kline → 30d low: $1,820  |  30d high: $2,510
  daily vol: 3.2%

Step 2 — Validation + probability
  Stop $1,800 = -12.6% from now  ← below 30d low ✅ (reasonable)
  Take $2,500 = +21.4% from now  ← near 30d high

  Probability of stop-loss in 30 days: 38.4% (based on volatility)

Step 3 — Guard summary shown
  ┌────────────────────────────────────────────┐
  │ Stop-Loss:   $1,800 → sell 100% to USDC   │
  │ Take-Profit: $2,500 → sell 50% to USDC    │
  │ Check every: 30 minutes                   │
  └────────────────────────────────────────────┘
  "Confirm? (yes/no)"

Step 4 — Activate (CronCreate every 30 min)
  → onchainos market price
  → if price < 1800: swap ETH → USDC (100%), delete guard, notify
  → if price > 2500: swap ETH → USDC (50%), notify, keep stop-loss active

Step 5 — On trigger (example: stop-loss hits)
  🚨 STOP-LOSS TRIGGERED
  ETH dropped to $1,792 (below $1,800)
  Sold: 0.1234 ETH → $220.92 USDC  |  Tx: 0xabc...
  Guard deactivated.

  What next?
  → Hold USDC and wait
  → DCA back in with okx-smart-dca
  → Deploy to yield with okx-yield-optimizer
```

**Guard types:** fixed stop-loss, fixed take-profit, trailing stop, flash crash (4h drop%), portfolio-level

---

## Skill Composition — Full DeFi Lifecycle

Skills are standalone but designed to hand off to each other:

```
1. okx-onchain-analyst
   "analyze my portfolio"
   → discovers SOL is -8.4% (worst), ETH/WBTC over-correlated
        │
        ▼
2. okx-auto-rebalance
   "rebalance: reduce WBTC 10%, add to SOL and stables"
   → executes the allocation shift
        │
        ├──────────────────────────────────────┐
        ▼                                      ▼
3. okx-yield-optimizer              4. okx-uniswap-strategy
   "deploy USDC to best yield"         "open ETH/USDC LP on Base"
   → Morpho 3.89% APY                  → V4 0.30% pool, range $1,831–$2,289
        │                                      │
        │                             5. okx-lp-position-manager
        │                                "monitor my LP, rebalance if out of range"
        │                                → hourly CronCreate guard
        │                                      │
        └──────────────────┬───────────────────┘
                           ▼
                  6. okx-risk-guard
                     "stop-loss on ETH at $1,700"
                     → 30-min CronCreate monitor
                           │
                           ▼
                  7. okx-smart-dca
                     "DCA $30/week back into ETH if it dips"
                     → weekly CronCreate, RSI-adjusted sizing
```

---

## CronCreate — Automated Background Actions

| Skill | Schedule | What it does |
|---|---|---|
| `okx-uniswap-strategy` | Every hour | Alerts if LP goes out of price range |
| `okx-lp-position-manager` | Every 2 hours | Suggests rebalance when out of range |
| `okx-risk-guard` | Every 30 min | Executes stop-loss or take-profit swap |
| `okx-smart-dca` | Daily / Weekly | Executes scheduled RSI-adjusted buy |

---

## Deployment & Chain Support

### X Layer (Primary Chain — Chain ID 196)

Zero gas fees make X Layer ideal for the automation-heavy skills:

- `okx-risk-guard` — checks price every 30 min. On Ethereum: hundreds in gas/month. On X Layer: free.
- `okx-smart-dca` — $10 weekly buys. Gas would destroy returns on mainnet. On X Layer: viable.
- `okx-auto-rebalance` — multi-hop sell + buy. Complex rebalances are economically feasible only at zero gas.

`okx-auto-rebalance` and `okx-yield-optimizer` default to X Layer. Aave V3 USDG available via `onchainos defi search --token USDG --chain 196`.

### All Chains

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
| OKX Onchain OS (`onchainos`) | Wallet balance, swaps, DeFi invest/withdraw, market kline/price, security scan |
| DexScreener (`api.dexscreener.com`) | Uniswap pool discovery, TVL, 24h volume, fee tiers |
| DeFi Llama (`yields.llama.fi`) | 17,000+ pool APY context, market-wide comparison |
| Uniswap AI (`github.com/Uniswap/uniswap-ai`) | LP deep links, V4 hook security, swap route planning |

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
├── okx-lp-position-manager/     ← LP lifecycle manager (IL, rebalance)
│   └── SKILL.md
├── okx-onchain-analyst/         ← Portfolio analytics (Sharpe, RSI, correlation)
│   └── SKILL.md
├── okx-smart-dca/               ← RSI-adjusted DCA with scheduling
│   └── SKILL.md
├── okx-risk-guard/              ← Stop-loss / take-profit automation
│   └── SKILL.md
│
├── okx-agentic-wallet/          ← OKX wallet base skill
├── okx-dex-swap/                ← Swap primitives
├── okx-dex-market/              ← Market data primitives
├── okx-security/                ← Token security scanning
└── [+ 8 more OKX base skills]
```

---

## Team

| Name | Role |
|---|---|
| Nithin | Builder |

---

## License

MIT
