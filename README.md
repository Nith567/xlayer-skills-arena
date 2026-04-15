# XLayer Skills Arena

A suite of **14 agentic DeFi skills** built on OKX Onchain OS. Each skill is a standalone Claude agent that understands natural language, fetches live onchain data, analyzes it, and executes — combining OKX onchainos CLI, Uniswap AI skills, OKX DEX Signal, DexScreener, and DeFi Llama into complete end-to-end workflows.

> **Live registry:** https://x-layer-skills.up.railway.app/skills — install any skill with one curl command, works on both Claude Code and OpenClaw.

---

## Quick Start

### Option A — Claude Code

```bash
# 1. Install skills from live registry (no clone needed)
curl -s https://x-layer-skills.up.railway.app/skills | python3 -c "
import json,sys,os,urllib.request
skills = json.load(sys.stdin)
for s in skills:
    folder = os.path.expanduser(f'~/.claude/skills/{s[\"id\"]}')
    os.makedirs(folder, exist_ok=True)
    urllib.request.urlretrieve(s['raw_url'], f'{folder}/SKILL.md')
    print(f'✅ installed {s[\"id\"]}')
"

# 2. Open Claude Code
claude

# 3. Type any prompt — skills load automatically
```

### Option B — OpenClaw

```bash
# 1. Install skills from live registry
curl -s https://x-layer-skills.up.railway.app/skills | python3 -c "
import json,sys,os,urllib.request
skills = json.load(sys.stdin)
for s in skills:
    folder = os.path.expanduser(f'~/.openclaw/workspace/skills/{s[\"id\"]}')
    os.makedirs(folder, exist_ok=True)
    urllib.request.urlretrieve(s['raw_url'], f'{folder}/SKILL.md')
    print(f'✅ installed {s[\"id\"]}')
"

# 2. Restart OpenClaw and start using
openclaw gateway restart
```

### Option C — Clone & install locally

```bash
git clone https://github.com/Nith567/xlayer-skills-arena.git
cd xlayer-skills-arena
chmod +x install.sh && ./install.sh   # installs to ~/.claude/skills/
```

> `onchainos` CLI is auto-installed on first run via the shared preflight check.
> You need an OKX Agentic Wallet set up for execution. [Get started →](https://web3.okx.com/onchain-os)

### Try these prompts after installing
```
"swap 0.032 USDC from Base to Arbitrum"
"scan pump.fun for safe meme coins"
"analyze my portfolio and show Sharpe ratio"
"rebalance 70% ETH 30% USDC on X Layer"
"set stop-loss on ETH at $1800"

# Uniswap V4 skills (live on Base):
"deploy ETH/USDC V4 pool with our XLayer hook and add LP with 0.0003 ETH on Base"
"rebalance V4 position #2159358 on Base atomically"
"analyze my ETH/USDC V4 LP position #2159358 on Base — is it still earning fees?"
```

---

## Skills Overview

> All 14 skills below are **custom-built** on top of the OKX Onchain OS base modules. Each SKILL.md contains original logic — scoring formulas, financial algorithms, multi-step orchestration — not just wrappers around CLI commands.

| Skill | What We Built (Custom Logic) |
|---|---|
| [`okx-auto-rebalance`](#okx-auto-rebalance) | NL % parser → multi-hop swap sequencer, slippage-aware routing |
| [`okx-yield-optimizer`](#okx-yield-optimizer) | APY scorer across DeFi Llama 17k pools: risk-adjusted rank, gas payback calc |
| [`okx-yield-compounder`](#okx-yield-compounder) | Reward→reinvest loop + gas efficiency gate (skip if gas > 10% of reward) |
| [`okx-liquidation-guard`](#okx-liquidation-guard) | HF formula + 3-tier alert system (warn/repay/emergency) via CronCreate |
| [`okx-uniswap-strategy`](#okx-uniswap-strategy) | 30d volatility → optimal tick range + DexScreener pool scoring |
| [`okx-lp-position-manager`](#okx-lp-position-manager) | Concentrated liquidity IL formula + range drift detection + auto-rebalance |
| [`okx-onchain-analyst`](#okx-onchain-analyst) | Sharpe ratio, RSI, correlation matrix, health score (5-factor weighted formula) |
| [`okx-token-screener`](#okx-token-screener) | Opportunity score: SM consensus(35%) + RSI(25%) + vol spike(20%) + momentum(10%) + safety(10%) |
| [`okx-copy-trader`](#okx-copy-trader) | 4-mode copy engine: proportional sizing + auto-exit on smart money 30% sell |
| [`okx-smart-dca`](#okx-smart-dca) | RSI multiplier table (RSI<25 → 2×, RSI>75 → 0.5×) + cost basis tracker |
| [`okx-risk-guard`](#okx-risk-guard) | Trailing stop + flash crash guard + portfolio-level circuit breaker, 30min cron |
| [`okx-meme-scout`](#okx-meme-scout) | 4-stage rug filter: bonding curve + dev history + bundle pct + holder count → score/100 |
| [`okx-v4-deposit`](#okx-v4-deposit) | Mint V4 LP position end-to-end: 30d vol range calc → MINT_POSITION calldata → execute → returns NFT ID |
| [`okx-v4-pool-launcher`](#okx-v4-pool-launcher) | Deploy V4 hook via CREATE2 + init pool + mint LP — full 3-step flow, no private key needed |
| [`okx-v4-rebalancer`](#okx-v4-rebalancer) | Atomic DECREASE→MINT→CLOSE_CURRENCY in 1 tx via V4 flash accounting, 3× cheaper than V3 |
| [`okx-crosschain-swap`](#okx-crosschain-swap) | LI.FI routing (no API key) + full approve→bridge→poll status flow with explorer links |

---

## Base OKX Skills Used (not built by us)

These are the OKX Onchain OS foundation modules our skills are built on top of:

`okx-agentic-wallet` · `okx-dex-swap` · `okx-dex-market` · `okx-dex-signal` · `okx-dex-trenches` · `okx-security` · `okx-defi-invest` · `okx-defi-portfolio` · `okx-wallet-portfolio` · `okx-onchain-gateway`

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
| `wallet balance` | all skills |
| `wallet contract-call` | v4-deposit, v4-pool-launcher, v4-rebalancer, crosschain-swap |
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
| `liquidity-planner` | uniswap-strategy, lp-position-manager, **v4-deposit** | 30d vol → TIGHT/MEDIUM/WIDE tick range presets |
| `viem-integration` | v4-rebalancer, **v4-deposit** | Encode MINT_POSITION / DECREASE_LIQUIDITY calldata for V4 PositionManager |
| `configurator` | v4-rebalancer, **v4-deposit**, **v4-pool-launcher** | Pool key construction, tick spacing, sqrtPriceX96 calculation |
| `deployer` | **v4-pool-launcher** | Hook CREATE2 deployment via onchainos contract-call |

---

## Skill Details

---

### okx-auto-rebalance

Rebalance your entire portfolio to any target allocation by describing it in plain English.

**Architecture:**
```
User prompt (NL % targets)
    │
    ├─ okx-agentic-wallet  → fetch live balances
    ├─ okx-dex-market      → current prices
    │
    ▼
[CUSTOM] NL parser → extract token/% pairs
[CUSTOM] Delta calculator → current vs target
[CUSTOM] Swap sequencer → sell-first ordering (avoids insufficient balance)
    │
    ├─ okx-dex-swap        → execute each swap
    └─ okx-security        → token safety check
    │
    ▼
Summary: token | old% | new% | tx hash
```
**Custom logic:** Natural language % parser, sell-first sequencing to avoid balance conflicts, slippage-aware multi-hop ordering.

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

**Architecture:**
```
User prompt (token + amount)
    │
    ├─ okx-agentic-wallet  → balance check
    ├─ okx-defi-invest     → search all protocols
    ├─ DeFi Llama API      → 17k pool APY context
    │
    ▼
[CUSTOM] Risk-adjusted scorer:
         APY(50%) + TVL(30%) + protocol_reputation(20%)
[CUSTOM] Gas payback calculator:
         skip if gas_cost > 3months_yield_gain
    │
    ├─ okx-defi-invest     → deposit to winner
    └─ okx-defi-portfolio  → confirm position
    │
    ▼
Ranked table: rank | protocol | APY | TVL | score
```
**Custom logic:** Multi-source APY scorer, gas-adjusted ROI gate, TVL-weighted risk rating.

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

**Architecture:**
```
CronCreate (daily/weekly) OR manual trigger
    │
    ├─ okx-defi-portfolio  → scan all positions + pending rewards
    │
    ▼
[CUSTOM] Gas efficiency gate:
         skip if gas_cost > 10% of reward_value
[CUSTOM] Compounding APY math:
         effective_apy = (1 + flat_apy/n)^n - 1
    │
    ├─ okx-defi-invest (collect) → harvest rewards
    └─ okx-defi-invest (invest)  → reinvest same protocol
    │
    ▼
Report: collected | reinvested | new balance | effective APY
```
**Custom logic:** Gas efficiency gate (skip tiny rewards on Ethereum), compounding frequency optimizer, X Layer special path (gas=$0 → compound daily always).

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

**Architecture:**
```
CronCreate (hourly) OR manual trigger
    │
    ├─ okx-defi-portfolio  → fetch all borrow positions
    ├─ okx-dex-market      → current collateral prices
    │
    ▼
[CUSTOM] Health Factor formula:
         HF = (collateral × liq_threshold) / debt
[CUSTOM] Liquidation price calculator
[CUSTOM] 3-tier alert system:
         HF < 1.5 → warn
         HF < 1.2 → auto-repay to HF 1.5
         HF < 1.05 → emergency max repay
    │
    ├─ okx-agentic-wallet  → check repay funds available
    └─ okx-defi-invest     → repay debt
    │
    ▼
Status: HF before | HF after | amount repaid | tx hash
```
**Custom logic:** HF formula per protocol (Aave V3 uses per-asset thresholds), liquidation price projection, tiered auto-repay with target HF of 1.5.

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

**Architecture:**
```
User prompt (token pair + chain)
    │
    ├─ okx-agentic-wallet   → balance check
    ├─ okx-dex-market       → 30d kline data
    ├─ DexScreener API      → pool TVL, volume, fee APY per tier
    ├─ DeFi Llama API       → market-wide APY context
    │
    ▼
[CUSTOM] Volatility engine:
         daily_vol = std_dev(30d close returns)
         weekly_vol = daily_vol × √7
         range = current_price × (1 ± vol × 1.5)
[CUSTOM] Fee tier scorer:
         fee_apy = volume24h × fee_rate × 365 / TVL
         score = fee_apy(60%) + TVL_stability(40%)
    │
    ├─ Uniswap AI: liquidity-planner  → tick range deep link
    ├─ Uniswap AI: v4-security-foundations → hook check
    ├─ okx-security  → token safety check
    └─ okx-dex-swap  → ratio balance swap if needed
    │
    ▼
Uniswap deep link with pre-filled range + CronCreate monitor
```
**Custom logic:** 30d historical volatility → tick range calculation, fee tier ranking by real yield, token ratio balancer before LP creation.

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

**Architecture:**
```
User prompt (check / rebalance / exit LP)
    │
    ├─ okx-defi-portfolio  → fetch open LP positions
    ├─ okx-dex-market      → current price + 30d kline
    │
    ▼
[CUSTOM] Concentrated IL formula:
         il = 2√(price_ratio) / (1 + price_ratio) - 1
         amplified by sqrt(maxPrice/minPrice) for range width
[CUSTOM] Net P&L = fees_earned - IL_cost
[CUSTOM] Out-of-range drift detector → flag stale positions
    │
    if rebalance needed:
    ├─ Uniswap AI: swap-planner  → best swap route
    ├─ okx-dex-swap              → rebalance token ratio
    └─ Uniswap AI: liquidity-planner → new range deep link
    │
    ▼
Position health: in-range✅/out❌ | fees | IL | net P&L | action
```
**Custom logic:** Concentrated liquidity IL formula (not standard 50/50 IL), net profitability = fees − IL, range drift detection.

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

**Architecture:**
```
User prompt (analyze portfolio)
    │
    ├─ okx-agentic-wallet  → all token holdings
    ├─ okx-dex-market      → 30d kline per token (parallel)
    ├─ okx-dex-signal      → smart money signal overlay
    │
    ▼
[CUSTOM] Per-token metrics engine:
         PnL = (current - entry) / entry
         annualized_vol = std_dev(daily_returns) × √365
         sharpe = (annualized_return - 0.05) / annualized_vol
         RSI(14) = 100 - 100/(1 + avg_gain/avg_loss)

[CUSTOM] Correlation matrix:
         pearson_r(token_A_returns, token_B_returns) for all pairs

[CUSTOM] Portfolio health score (5-factor):
         sharpe(30%) + diversification(25%) + momentum(20%)
         + stablecoin_hedge(15%) + pnl(10%)
    │
    ▼
Score /100 + ranked tokens + correlation heatmap + 3 action items
```
**Custom logic:** Full quant finance stack built from kline data — Sharpe, RSI, Pearson correlation, 5-factor portfolio health score.

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

**Architecture:**
```
User prompt (chain + preset: oversold/smart-money/volume-spike/etc.)
    │
    ├─ okx-dex-signal   → signal list (smart money, whale buys)
    ├─ okx-dex-signal   → tracker activities (recent wallet moves)
    │
    ▼
[CUSTOM] Opportunity scorer per token:
         smart_money_consensus (35%) — how many SM wallets bought
         RSI_oversold           (25%) — lower RSI = higher score
         volume_spike           (20%) — vol vs 7d avg
         price_momentum         (10%) — 24h / 7d direction
         safety_score           (10%) — from security check
    │
    ├─ okx-security     → filter honeypots + critical risk
    ├─ okx-dex-market   → RSI + volume for each token
    │
    ▼
Ranked table: token | RSI | vol spike | SM wallets | score | buy?
```
**Custom logic:** 5-factor opportunity score combining OKX signal intelligence with classic technical indicators, 6 preset scan modes.

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

**Architecture:**
```
User prompt (mode: smart_money / kol / leaderboard / specific wallet)
    │
    ├─ okx-dex-signal     → signal list + tracker activities
    ├─ okx-dex-signal     → leaderboard list (sorted by ROI)
    │
    ▼
[CUSTOM] Target resolver — 4 modes:
         smart_money  → top signal wallets by consensus
         kol          → verified KOL activity feed
         leaderboard  → #1 by 7d ROI auto-selected
         specific     → user-provided wallet address

[CUSTOM] Proportional sizing:
         their_trade_pct = trade_size / their_portfolio
         your_copy = their_trade_pct × your_portfolio × copy_budget%

[CUSTOM] Auto-exit engine (CronCreate 30min):
         if target_wallet sells > 30% → auto-sell your position
    │
    ├─ okx-security  → block honeypots before copying
    └─ okx-dex-swap  → execute mirror trade
    │
    ▼
Copy confirmation + CronCreate exit watcher
```
**Custom logic:** 4-mode target resolver, proportional position sizing, smart money exit detection + auto-sell trigger.

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

**Architecture:**
```
User prompt (token + base_amount + frequency)
    │
    ├─ okx-dex-market  → 30d kline for RSI + price vs avg
    ├─ okx-agentic-wallet → USDC balance check
    │
    ▼
[CUSTOM] RSI multiplier table:
         RSI < 25  → 2.0× (extreme oversold, buy double)
         RSI < 35  → 1.5× (oversold)
         RSI < 50  → 1.2× (below midline)
         RSI < 65  → 1.0× (neutral, base amount)
         RSI > 75  → 0.5× (overbought, buy half)

[CUSTOM] Cost basis tracker:
         avg_cost = total_spent / total_tokens_bought
    │
    └─ okx-dex-swap → execute sized buy
    │
    CronCreate (weekly/daily/monthly)
    │
    ▼
DCA report: RSI | multiplier | amount | avg cost basis | total accumulated
```
**Custom logic:** RSI multiplier sizing table, below-average price bonus (+0.2×), rolling cost basis tracker across all DCA cycles.

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

**Architecture:**
```
User prompt (token + stop price / take-profit / trailing %)
    │
    ├─ okx-dex-market  → current price + 30d kline + volatility
    │
    ▼
[CUSTOM] Guard types:
         fixed stop-loss      → sell all if price < X
         fixed take-profit    → sell % if price > Y
         trailing stop        → sell if drops Z% from peak
         flash crash guard    → sell if drops W% in 4h
         portfolio circuit    → sell all tokens if portfolio drops V%

[CUSTOM] Probability estimator:
         P(stop_hit) = based on historical vol × days_horizon

CronCreate every 30 min:
    ├─ okx-dex-market  → price check
    │
    ▼
[CUSTOM] Trigger evaluator → which guards are hit?
    │
    └─ okx-dex-swap → auto-execute sell to USDC
    │
    ▼
Alert: guard type | trigger price | amount sold | tx hash | next steps
```
**Custom logic:** 5 guard types, probability of trigger calculator, trailing stop peak tracker, portfolio-level circuit breaker.

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

### okx-crosschain-swap

Bridge and swap tokens across any chain using LI.FI routing. Finds the best bridge, shows full quote, executes in one tx, and tracks until confirmed on destination.

**Architecture:**
```
User prompt (token + from_chain + to_chain + amount)
    │
    ├─ LI.FI /v1/chains  → verify both chains supported
    ├─ LI.FI /v1/tokens  → resolve token addresses per chain
    ├─ okx-agentic-wallet → balance check on source chain
    │
    ▼
[CUSTOM] Quote fetcher + best route picker:
         GET /v1/quote → bridge options ranked by output
         show: send | receive | bridge | fee | time
    │
    ▼ (user confirms)
    │
[CUSTOM] Approve → Bridge flow:
         if ERC-20: build approve calldata (0x095ea7b3)
         onchainos wallet contract-call → approve tx
         onchainos wallet contract-call → bridge tx (transactionRequest.data)
    │
[CUSTOM] Status poller:
         GET /v1/status every 15s
         PENDING → PENDING → DONE ✅
    │
    ▼
✅ Sent | ✅ Received | Source tx link | Dest tx link | LI.FI scan link
```
**Custom logic:** ERC-20 approve calldata builder, LI.FI route executor via onchainos contract-call, status poller with explorer links for both chains.

**Live demo tx — 0.032 USDC Base → Arbitrum (<2s via Eco bridge):**
| | |
|---|---|
| Source tx (Base) | https://basescan.org/tx/0x9ce3b262d6fbcee6d72e6e17cca345366b51315f1453033003eecf255057adf4 |
| Destination tx (Arbitrum) | https://arbiscan.io/tx/0x506c89e4ad1c25680e22fdc5e696e912735091af216049430684ab119ac6b79c |
| LI.FI scan | https://scan.li.fi/tx/0x9ce3b262d6fbcee6d72e6e17cca345366b51315f1453033003eecf255057adf4 |

**Trigger prompts:**
```
"swap 100 USDC from Base to Arbitrum"
"bridge my ETH to Optimism"
"move 500 USDT from Ethereum to Base"
"cross-chain swap USDC to USDT Base → Arbitrum"
"cheapest way to move USDC to Polygon"
```

**What happens step by step:**
```
User: "swap 100 USDC from Base to Arbitrum USDT"

Step 1 — Check chain support
  GET https://li.quest/v1/chains
  → Base (8453) ✅  |  Arbitrum (42161) ✅

Step 2 — Resolve token addresses
  GET https://li.quest/v1/tokens?chains=8453,42161
  → USDC on Base:    0x833589f... (6 decimals)
  → USDT on Arbitrum: 0xFd086b... (6 decimals)

Step 3 — Check wallet balance
  onchainos wallet balance --chain 8453
  → 245.80 USDC ✅ (enough for 100 + gas)

Step 4 — Get quote
  GET https://li.quest/v1/quote?fromChain=8453&toChain=42161
    &fromToken=0x833589f...&toToken=0xFd086b...
    &fromAmount=100000000&fromAddress=0xYourWallet

  ┌──────────────────────────────────────────────┐
  │ Send:    100.00 USDC  (Base)                 │
  │ Receive: 99.24 USDT  (Arbitrum)              │
  │ Min out: 98.72 USDT  (0.5% slippage)        │
  │ Bridge:  Stargate V2                         │
  │ Fee:     $0.48 bridge + $0.09 gas = $0.57   │
  │ Time:    ~3 minutes                          │
  └──────────────────────────────────────────────┘
  "Confirm? (yes/no)"

Step 5 — Execute
  onchainos wallet contract-call
    --contract 0xRouterAddress
    --calldata 0x<transactionRequest.data>
    --value 0
  ✅ Source tx: 0xabc...def (Base)

Step 6 — Track status (poll every 15s)
  GET https://li.quest/v1/status?txHash=0xabc...
  → PENDING... → PENDING... → DONE ✅

Step 7 — Confirm arrival
  onchainos wallet balance --chain 42161
  → 99.24 USDT on Arbitrum ✅
```

**No API key required** — LI.FI public endpoint used. Supports 30+ chains, 20+ bridges.

---

### okx-v4-deposit

Add liquidity to a Uniswap V4 pool in a single transaction. Handles tick range calculation from 30d volatility, native ETH handling, USDC approval, and MINT_POSITION calldata encoding via `onchainos wallet contract-call`. **Returns NFT token ID** so you can reference it for rebalancing later.

**Architecture:**
```
User prompt (token pair + amount + chain)
    │
    ├─ okx-dex-market    → current price + 30d klines
    ├─ okx-agentic-wallet → balance check
    │
    ▼
[CUSTOM] liquidity-planner logic:
         daily_vol = std_dev(30d returns)
         weekly_vol = daily_vol × √7
         TIGHT / MEDIUM / WIDE range presets
         tick_lower, tick_upper (rounded to tick spacing 60)

[CUSTOM] viem-integration calldata builder:
         Actions = [MINT_POSITION, SETTLE_PAIR, SWEEP]
         hookData offset = 0x180 (V4 custom CalldataDecoder)
         native ETH as msg.value (no WRAP action)
         PositionManager.modifyLiquidities(unlockData, deadline)
    │
    └─ onchainos wallet contract-call → execute
    │
    ▼
✅ Returns: TX (basescan link) + NFT Token ID + range + "💾 To rebalance: say 'rebalance V4 position #ID'"
```

**Live Deployed Pool (Base mainnet):**
```
Hook:     0xA5F8bdB306774B6068aC8e73eAAd53B3649d5000
Pool:     ETH/USDC · 0.30% · tick spacing 60
Pool ID:  0xf13ad8e14ce05706f14160709144a36e309b9f4a2c6e4be0940dc386aed8b77f
PositionManager: 0x7C5f5A4bBd8fD63184577525326123B519429bDc
```

**Trigger prompts:**
```
"add LP with 0.0003 ETH to our XLayer V4 hook pool on Base"
"deposit ETH and USDC into V4"
"create a Uniswap V4 LP position"
"mint V4 position on Base"
"provide liquidity on Base V4"
"add LP to our XLayerHook pool"
```

**What happens step by step:**
```
Step 1 — Fetch price + balance
  onchainos market price → ETH: $2,363
  onchainos wallet balance → 0.0003 ETH available ✅

Step 2 — 30d volatility range (liquidity-planner)
  onchainos market kline --bar 1D --limit 30
  daily_vol = 2.8%  |  weekly_vol = 7.4%
  MEDIUM range: $2,363 × (1 ± 7.4% × 1.5)
  → price_lower = $2,100  |  price_upper = $2,630
  → tick_lower = -201,060  |  tick_upper = -198,480

Step 3 — Encode MINT_POSITION calldata (viem-integration)
  Actions: [MINT_POSITION, SETTLE_PAIR, SWEEP]
  Pool key: {0x0000...0000, 0x8335...2913, 3000, 60, 0xA5F8...5000}
  hookData offset = 0x180 (V4 CalldataDecoder requirement)
  msg.value = 0.0003 ETH (native, no WRAP)

Step 4 — Execute
  onchainos wallet contract-call
    --to 0x7C5f5A4bBd8fD63184577525326123B519429bDc
    --chain 8453 --amt 300000000000000 --gas-limit 400000

Step 5 — Confirm
  ✅ V4 Position Minted
  TX:           https://basescan.org/tx/0x...
  NFT Token ID: #2159358  ← save this!
  Range:        $2,100 – $2,630 ✅ in range
  Ticks:        -201,060 / -198,480

  💾 To rebalance later: "rebalance V4 position #2159358 on Base"
```

**Chains:** Base · Ethereum · Arbitrum

---

### okx-v4-pool-launcher

Deploy a complete Uniswap V4 pool from scratch — hook contract via CREATE2, pool initialization, and first LP position — all without a private key, via `onchainos wallet contract-call`.

**Architecture:**
```
User prompt (token pair + amount + chain)
    │
    ├─ okx-agentic-wallet → balance check
    │
    ▼
[CUSTOM] Step 1 — Hook deployment via CREATE2:
         HookMiner: iterate salts until address & 0x3FFF == flags
         flags = 1 << 12 (afterInitialize = 0x1000)
         CREATE2 factory: 0x4e59b44847b379578588920cA78FbF26c0B4956C
         onchainos wallet contract-call → deploy hook

[CUSTOM] Step 2 — Pool initialization:
         PoolManager.initialize(poolKey, sqrtPriceX96)
         selector: 0x6276cbbe
         sqrtPriceX96 = sqrt(price_usd / 10^12) × 2^96
         onchainos wallet contract-call → init pool

[CUSTOM] Step 3 — Mint first LP position:
         → routes to okx-v4-deposit for MINT_POSITION encoding
    │
    ▼
Hook address + Pool ID + NFT token ID — all from onchainos, no private key
```

**Live Deployed (Base mainnet):**
```
Hook deploy TX: 0x2372328c118afe68c6243986c03b8d65faae2f1fae1784da52adb28d4c356db6
Pool init TX:   0xe228a19dfedbad073627f1ddf0e5ff44e88fb78e116a36d5e6f4dbecc2d12e37
Hook address:   0xA5F8bdB306774B6068aC8e73eAAd53B3649d5000
Pool ID:        0xf13ad8e14ce05706f14160709144a36e309b9f4a2c6e4be0940dc386aed8b77f
```

**Trigger prompts:**
```
"deploy ETH/USDC V4 pool with our XLayer hook and add LP with 0.0003 ETH on Base"
"launch a new Uniswap V4 pool"
"create a V4 pool with a custom hook"
"deploy V4 hook and initialize pool"
```

**Chains:** Base · Ethereum · Arbitrum

---

### okx-v4-rebalancer

Atomic Liquidity Management for Uniswap V4. Executes a complete burn → swap → mint rebalance in **one single transaction** using V4 PoolManager flash accounting — 3× cheaper than V3-style rebalancing, zero price exposure between steps.

**Architecture:**
```
User prompt (V4 position out of range / rebalance)
    │
    ├─ okx-defi-portfolio  → fetch V4 LP position (tokenId, range, liquidity)
    ├─ okx-dex-market      → current price + 30d kline
    │
    ▼
[CUSTOM] New range calculator:
         weekly_vol = daily_std_dev × √7
         new_range = price × (1 ± vol × 1.5)
         tick_lower, tick_upper from price range

[CUSTOM] Atomic calldata builder (via viem-integration + configurator):
         poolKey = {currency0, currency1, fee, tickSpacing, hooks}
         Actions array = [
           DECREASE_LIQUIDITY,   ← burn old position
           COLLECT,              ← collect tokens into PoolManager
           SWAP_EXACT_IN_SINGLE, ← rebalance ratio (flash accounting)
           MINT_POSITION,        ← create new position
           SETTLE_ALL            ← net settle, only delta leaves
         ]
         → encoded as PositionManager multicall

    ├─ Uniswap AI: v4-security-foundations → hook safety check
    ├─ Uniswap AI: swap-planner  → optimal swap route inside V4
    │
    ▼
onchainos wallet contract-call → single tx execution
    │
    ▼
BURNED old | SWAPPED ratio | MINTED new range | gas saved vs V3
```
**Custom logic:** Full V4 flash accounting action sequence builder, atomic 5-step multicall encoder, V3 vs V4 gas comparison. Uses all 5 Uniswap AI skills in one flow.

**Live Deployed Infrastructure (Base mainnet):**
```
XLayerHook (our deployed V4 hook):
  Address:  0xA5F8bdB306774B6068aC8e73eAAd53B3649d5000
  Deploy TX: 0x2372328c118afe68c6243986c03b8d65faae2f1fae1784da52adb28d4c356db6
  Basescan: https://basescan.org/address/0xA5F8bdB306774B6068aC8e73eAAd53B3649d5000
  Deployed via: onchainos wallet contract-call → CREATE2 factory (no private key needed)
  Permission flag: afterInitialize (bit 12 = 0x1000)

ETH/USDC Pool with XLayerHook:
  Pool ID:  0xf13ad8e14ce05706f14160709144a36e309b9f4a2c6e4be0940dc386aed8b77f
  Init TX:  0xe228a19dfedbad073627f1ddf0e5ff44e88fb78e116a36d5e6f4dbecc2d12e37

Live LP Position:
  NFT:      #2159358  (ETH/USDC, ticks -198480 / -196680)
  Minted via onchainos wallet contract-call → PositionManager (no private key)
```

**Trigger prompts:**
```
"rebalance my V4 LP atomically"
"my Uniswap V4 position is out of range"
"atomic burn and remint my V4 liquidity"
"single tx LP rebalance on Base"
"rebalance V4 position #2159358"
"rebalance my ETH/USDC V4 position on Base atomically"
```

**Why V4 atomic is better than V3:**
```
V3-style (3 transactions):          V4 atomic (1 transaction):
  Tx1: burn position                  PoolManager.unlock() → {
  ↓ price can move                      burn liquidity
  Tx2: swap tokens                      swap to new ratio     } atomic
  ↓ price can move                      mint new range
  Tx3: mint new range                   settle (flash accounting)
                                      }
  3× gas, 3× failure points          1× gas, full revert or full success
  Gas (Base): ~$0.24                  Gas (Base): ~$0.08
```

**What happens step by step:**
```
Step 1 — Check position
  onchainos market price → ETH: $2,510
  Old range: $1,750–$2,400 → ⚠️ OUT OF RANGE, earning $0 fees

Step 2 — New range from OKX 30d data
  onchainos market kline --bar 1D --limit 30
  weekly_vol = 7.4% → new range: $2,200–$2,850
  tick_lower: 204,120  |  tick_upper: 209,400

Step 3 — Swap route (swap-planner)
  Need: sell 0.03 ETH → 61.80 USDC to hit new ratio
  Route: direct V4 0.30% pool | impact: 0.06% ✅

Step 4 — Hook security (v4-security-foundations)
  Pool hook = address(0) → ✅ standard pool, safe to mint

Step 5 — Build atomic calldata (viem-integration + configurator)
  poolKey = { currency0: WETH, currency1: USDC, fee: 3000, tickSpacing: 60 }
  Actions: [DECREASE_LIQUIDITY, COLLECT, SWAP_EXACT_IN, MINT_POSITION, SETTLE_ALL]
  → encoded as PositionManager multicall

Step 6 — Execute single tx
  onchainos wallet contract-call --calldata <atomic_encoded> --gas-limit 500000
  ✅ Tx: 0xabc...def

  BURNED:   Position #1234 (old range $1,750–$2,400)
  SWAPPED:  0.03 ETH → 61.80 USDC (inside PoolManager, flash accounting)
  MINTED:   Position #1235 (new range $2,200–$2,850 ✅)
  GAS:      418,243 units ($0.079) — 3× cheaper than V3 approach

Step 7 — CronCreate 2h monitor on new range
```

**Uniswap AI skills used:** `swap-planner` + `v4-security-foundations` + `viem-integration` + `configurator` + `deployer` — most comprehensive Uniswap V4 integration in the suite.

**Chains:** Ethereum (1), Base (8453), Arbitrum (42161), Unichain (1301)

---

### okx-meme-scout

Scans pump.fun and Solana launchpads every 30 minutes, filters hundreds of new launches down to safe buys using dev reputation, bundle detection, bonding curve analysis, and holder checks — then executes via Solana wallet.

**Architecture:**
```
User prompt (scan / check token / buy)
    │
    ├─ okx-dex-trenches  → memepump tokens (all new launches)
    │
    ▼
[CUSTOM] 4-stage filter pipeline (fail-fast, stops at first red flag):

  Stage 1 — Bonding curve gate:
            curve < 5%  → skip (dead)
            curve > 90% → skip (too late, devs already rich)

  Stage 2 — Dev reputation check:
            okx-dex-trenches: token-dev-info
            rugCount > 0 → ❌ BLOCKED

  Stage 3 — Bundle/sniper check:
            okx-dex-trenches: token-bundle-info
            bundleHoldingPct > 20% → ❌ BLOCKED

  Stage 4 — Holder + security check:
            okx-dex-trenches: token-details → holderCount < 30 → skip
            okx-security: token-detection → honeypot → ❌ BLOCKED

[CUSTOM] Score formula (0–100):
         curve_sweet_spot (40) + clean_dev (30) + no_bundles (20) + holders (10)
    │
    ▼
Ranked safe launches + optional:
    └─ okx-dex-swap → buy on Solana (--chain solana)
    │
    Optional CronCreate every 30min → auto-alert score 85+
```
**Custom logic:** 4-stage fail-fast rug filter, bonding curve sweet spot (20-70%), bundle holding percentage check, composite safety score/100.

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
EVM (Base / Ethereum / Arbitrum / X Layer): 0x6924bf1575922794776dfa95c695fe222b74e406
Solana: hzEixCiFH82gacDLi2L4hKjgNK6RAXTykLgBpmCkdkv
```

This wallet is the agent's onchain identity — all demo transactions (cross-chain swaps, LP creation, yield deposits) originate from this address.

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
├── okx-v4-rebalancer/           ← Atomic V4 burn→swap→mint (flash accounting)
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

| Name | GitHub | Role |
|---|---|---|
| Nithin Reddy | [@Nith567](https://github.com/Nith567) | Solo Builder — skill design, onchain execution, Uniswap V4 integration |

## Demo & Links

| | Link |
|---|---|
| 🎥 Demo Video | *(coming soon — recording in progress)* |
| 🐦 X Post | *(link after posting with #onchainos @XLayerOfficial)* |
| 📦 GitHub | https://github.com/Nith567/xlayer-skills-arena |
| 🌐 Live Registry | https://x-layer-skills.up.railway.app/skills |

---

## License

MIT
