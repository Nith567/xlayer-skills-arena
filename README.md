# XLayer Skills Arena

A suite of 7 agentic DeFi skills built on OKX Onchain OS, targeting the full lifecycle of onchain portfolio management — from analytics and yield optimization to Uniswap LP strategy, risk protection, and automated DCA. Each skill is a standalone Claude agent that combines OKX onchainos CLI, Uniswap AI skills, and external market data APIs into intelligent, executable workflows.

Built for the OKX Onchain OS Hackathon — targeting Best Skills Arena, Best Data Analyst, and Best Uniswap Integration tracks.

---

## Skills Overview

| Skill | Description | Prize Target |
|---|---|---|
| [`okx-auto-rebalance`](#okx-auto-rebalance) | Natural language portfolio rebalancer across any token allocation | Skills Arena |
| [`okx-yield-optimizer`](#okx-yield-optimizer) | Scans 43 DeFi protocols, ranks by APY + TVL, auto-deposits | Skills Arena |
| [`okx-uniswap-strategy`](#okx-uniswap-strategy) | Data-driven Uniswap LP creator with volatility-based range selection | Uniswap + Data Analyst |
| [`okx-lp-position-manager`](#okx-lp-position-manager) | Monitors LP health, calculates IL vs fees, rebalances out-of-range positions | Uniswap |
| [`okx-onchain-analyst`](#okx-onchain-analyst) | Portfolio PnL, Sharpe ratio, token correlation matrix, market signals | Data Analyst |
| [`okx-smart-dca`](#okx-smart-dca) | RSI-adjusted dollar cost averaging with CronCreate scheduling | Most Innovative |
| [`okx-risk-guard`](#okx-risk-guard) | Stop-loss and take-profit automation with auto-swap execution | Most Innovative |

---

## Architecture Overview

```
User Message (natural language)
        │
        ▼
 Claude Agent (SKILL.md routing)
        │
   ┌────┴──────────────────────────────────────────┐
   │                                               │
   ▼                                               ▼
OKX Onchain OS (onchainos CLI)          External Data APIs
   ├── wallet balance                      ├── DexScreener (pool discovery)
   ├── swap execute / quote                ├── DeFi Llama (APY context)
   ├── defi search / invest                └── Uniswap AI Skills
   ├── market kline / price                    ├── liquidity-planner
   ├── security token-detection               ├── v4-security-foundations
   └── defi positions                         ├── swap-planner
                                              └── swap-integration
        │
        ▼
  Onchain Execution
  (X Layer / Base / Ethereum / Arbitrum / Solana / ...)
```

Each skill follows a consistent pattern:
1. Parse user intent from natural language
2. Fetch live onchain data (OKX kline, wallet balance, prices)
3. Analyze and score options (APY ranking, volatility calculation, security scan)
4. Present a clear plan to the user
5. Execute with confirmation
6. Set up monitoring via CronCreate

---

## Onchain OS & Uniswap Skill Usage

### OKX Onchain OS (onchainos CLI)

| Command | Used In |
|---|---|
| `onchainos wallet balance` | All skills — portfolio reads |
| `onchainos swap execute` | auto-rebalance, uniswap-strategy, risk-guard, smart-dca, lp-position-manager |
| `onchainos swap quote` | smart-dca, risk-guard (pre-execution checks) |
| `onchainos defi search` | yield-optimizer |
| `onchainos defi invest` | yield-optimizer |
| `onchainos defi withdraw` | yield-optimizer |
| `onchainos defi positions` | yield-optimizer, lp-position-manager |
| `onchainos market kline` | uniswap-strategy, onchain-analyst, smart-dca, risk-guard, lp-position-manager |
| `onchainos market price` | risk-guard, lp-position-manager, smart-dca |
| `onchainos security token-detection` | uniswap-strategy, auto-rebalance |
| `onchainos token search` | auto-rebalance, onchain-analyst |

### Uniswap AI Skills

| Uniswap Skill | Used In | Purpose |
|---|---|---|
| `liquidity-planner` | uniswap-strategy, lp-position-manager | Generate pre-filled `app.uniswap.org/positions/create` deep links |
| `v4-security-foundations` | uniswap-strategy, lp-position-manager | Hook permission risk matrix — blocks CRITICAL hooks |
| `swap-planner` | lp-position-manager | Multi-hop route optimization for rebalance swaps |
| `swap-integration` | lp-position-manager | Split swap execution across multiple pools |

---

## Skill Details

### okx-auto-rebalance

Rebalances your portfolio to any target allocation using natural language.

**Example prompts:**
- `"rebalance 70% ETH, 20% USDT, 10% USDC on Base"`
- `"put 50% into OKB and rest in USDC"`

**How it works:**
1. Fetches wallet balance via `onchainos wallet balance`
2. Calculates current vs target allocation
3. Generates a trade plan (shows what to sell/buy before executing)
4. Sells excess tokens first to maximize liquidity
5. Executes buys in priority order
6. Reports final allocation with tx hashes

**Default chain:** X Layer (chainIndex 196) — zero gas fees

---

### okx-yield-optimizer

Finds the highest-yield opportunity for any token and auto-deposits.

**Example prompts:**
- `"find best yield for my USDC"`
- `"where should I stake my ETH"`
- `"highest APY for USDT on Arbitrum"`

**How it works:**
1. Searches 43 DeFi platforms via `onchainos defi search`
2. Cross-references DeFi Llama (17,000+ pools) for market context
3. Scores each product: APY (50%) + TVL (30%) + platform reputation (20%)
4. Shows ranked table with executable vs reference-only options
5. Deposits via `onchainos defi invest` with proper decimal conversion

**Supported platforms:** Aave V3, Compound V3, Lido, Morpho, Spark, Kamino, Jito, Uniswap V3/V4, PancakeSwap, Raydium, Orca, and 32 more

---

### okx-uniswap-strategy

Creates optimal Uniswap V3/V4 LP positions using real onchain volatility data.

**Example prompts:**
- `"create ETH/USDC LP on Base"`
- `"best fee tier for WBTC/ETH"`
- `"add liquidity to Uniswap with my tokens"`

**How it works:**
1. Fetches 30-day kline via `onchainos market kline`
2. Calculates: `weekly_vol = stddev(daily_returns) × sqrt(7)` → optimal price range
3. Discovers all pools via DexScreener, scores by: `fee_apy = (volume24h × fee_rate × 365) / TVL`
4. Runs dual security check: OKX token-detection + Uniswap V4 hook permission scan
5. Auto-balances token ratio via OKX swap if needed
6. Generates pre-filled Uniswap deep link using `liquidity-planner` logic
7. Sets up hourly CronCreate monitor for out-of-range alerts

**Versions:** V4 default on Ethereum, Base, Arbitrum; V3 fallback on Optimism, Polygon, BNB Chain

---

### okx-lp-position-manager

Manages the full LP lifecycle after a position is created.

**Example prompts:**
- `"is my ETH/USDC LP profitable"`
- `"my LP is out of range, rebalance it"`
- `"how much IL have I suffered"`

**How it works:**
1. Calculates impermanent loss vs fees earned to determine if LP is net profitable
2. Checks position in-range status using current price vs user's range
3. If out of range: fetches fresh 30d volatility, calculates new optimal range
4. Plans rebalance swap via Uniswap `swap-planner` (best multi-hop route)
5. Executes via OKX swap + generates new Uniswap deep link
6. Sets up 2-hour CronCreate monitor

**IL formula:** Concentrated IL amplified by `sqrt(maxPrice/minPrice)` concentration factor

---

### okx-onchain-analyst

Deep portfolio analytics powered by 30-day onchain price data.

**Example prompts:**
- `"analyze my portfolio"`
- `"which token is my best performer"`
- `"am I diversified"`
- `"show my risk profile"`

**Metrics calculated:**
- 30-day PnL per token (weighted portfolio return)
- Annualized volatility per token
- Sharpe ratio (risk-adjusted return)
- RSI (14-day) + momentum score
- Token correlation matrix (2×2 to N×N)
- Diversification score (0–100)
- Portfolio health score combining all metrics
- Market signals: oversold/overbought flags per token

**Output:** Full ranked performance table + correlation heatmap + 3 actionable data-driven suggestions

---

### okx-smart-dca

Volatility-adjusted dollar cost averaging with automated scheduling.

**Example prompts:**
- `"DCA $50 into ETH every week"`
- `"buy $100 of BTC every Monday"`
- `"smart DCA into SOL daily"`

**How it works:**
1. Calculates RSI + price position vs 30d average
2. Applies dynamic multiplier: RSI < 25 → buy 2× base; RSI > 75 → buy 0.5× base
3. Executes via `onchainos swap execute` from stablecoin to target token
4. Schedules recurring runs via CronCreate
5. Tracks cost basis and accumulated position across cycles

**Modes:** smart (RSI-adjusted) / fixed / aggressive / conservative

---

### okx-risk-guard

Automated stop-loss and take-profit with onchain execution.

**Example prompts:**
- `"set stop-loss on ETH at $1,800"`
- `"alert me if SOL drops 20%"`
- `"take profit on WBTC at $95,000"`
- `"set 10% trailing stop on ETH"`

**How it works:**
1. Validates trigger levels against current price + 30d support/resistance
2. Shows probability of trigger based on historical volatility
3. Creates CronCreate monitor (every 30 min) checking `onchainos market price`
4. On trigger: executes protective swap to USDC via `onchainos swap execute`
5. Notifies user with tx hash and suggests next action

**Guard types:** Fixed stop-loss, fixed take-profit, trailing stop, flash crash guard, portfolio-level guard

---

## Working Mechanics

### Running a Skill

Each skill is a standalone Claude agent. Load by name and describe what you want in natural language:

```
# Example: Auto-rebalance
"rebalance my portfolio: 70% ETH, 20% USDC, 10% USDT on Base"

# Example: Yield optimizer
"find best APY for my 500 USDC"

# Example: Uniswap strategy
"create ETH/USDC LP on Base with my current holdings"

# Example: Risk guard
"set a 15% stop-loss on my ETH holdings"

# Example: Smart DCA
"DCA $30 into ETH every Monday"

# Example: Portfolio analytics
"analyze my portfolio and show my risk profile"
```

### Skill Composition

Skills hand off to each other naturally:

```
okx-onchain-analyst → identifies underperforming assets
      ↓
okx-auto-rebalance → rebalances to better allocation
      ↓
okx-yield-optimizer → deploys stablecoin portion to yield
      ↓
okx-uniswap-strategy → deploys ETH portion into LP
      ↓
okx-lp-position-manager → monitors LP health
      ↓
okx-risk-guard → stop-loss on underlying tokens
      ↓
okx-smart-dca → accumulates back in on dips
```

### CronCreate Monitoring

Three skills use CronCreate for automated background monitoring:

| Skill | Frequency | Action |
|---|---|---|
| `okx-uniswap-strategy` | Hourly | Alert if LP goes out of range |
| `okx-lp-position-manager` | Every 2 hours | Rebalance suggestion if out of range |
| `okx-risk-guard` | Every 30 minutes | Execute stop-loss / take-profit if triggered |
| `okx-smart-dca` | Daily / Weekly | Execute scheduled DCA buy |

---

## Deployment & Chain Support

### X Layer (Primary Chain)
**Chain ID:** 196
- Zero gas fees — ideal for automated strategies (DCA, rebalancing, monitoring)
- `okx-auto-rebalance` defaults to X Layer
- OKB token native

### All Supported Chains

| Chain | Chain ID | Skills Available |
|---|---|---|
| X Layer | 196 | auto-rebalance, yield-optimizer |
| Ethereum | 1 | all skills, Uniswap V4 |
| Base | 8453 | all skills, Uniswap V4 (primary demo chain) |
| Arbitrum | 42161 | all skills, Uniswap V4 |
| Optimism | 10 | all skills, Uniswap V3 |
| Polygon | 137 | all skills, Uniswap V3 |
| BNB Chain | 56 | auto-rebalance, yield-optimizer, Uniswap V3 |
| Solana | 501 | yield-optimizer, smart-dca, risk-guard |
| Avalanche | 43114 | yield-optimizer |

### Agentic Wallet
All skills use OKX Agentic Wallet as onchain identity. Wallet address used during development and demo:

```
Base / Ethereum / EVM: 0x... (your wallet address)
```

---

## X Layer Ecosystem Positioning

X Layer's zero gas fees make it the perfect chain for the automation-heavy skills in this suite:

- **okx-risk-guard** — monitors every 30 minutes. On Ethereum this would cost hundreds in gas per month. On X Layer: free.
- **okx-smart-dca** — weekly buys with tiny amounts ($10–50). Gas would eat returns on mainnet. On X Layer: viable at any size.
- **okx-auto-rebalance** — multi-step swaps (sell + buy). X Layer's zero gas means complex rebalances are economically feasible.
- **okx-yield-optimizer** — Aave V3 USDG on X Layer (investmentId available via `onchainos defi search --token USDG --chain 196`)

The suite is designed so that monitoring, automation, and small-amount operations run on X Layer by default, while Uniswap LP strategies target Base/Ethereum where Uniswap V4 liquidity is deepest.

---

## Data Sources

| Source | Used For | API |
|---|---|---|
| OKX Onchain OS | Wallet, swaps, DeFi, prices, security | `onchainos` CLI |
| DexScreener | Uniswap pool discovery, TVL, volume | `api.dexscreener.com` |
| DeFi Llama | APY market context (17k+ pools) | `yields.llama.fi` |
| Uniswap AI Skills | LP deep links, swap routing, V4 hook security | `github.com/Uniswap/uniswap-ai` |

---

## Repository Structure

```
xlayer-skills-arena/
├── okx-auto-rebalance/          # Portfolio rebalancer
│   ├── SKILL.md
│   └── references/cli-reference.md
├── okx-yield-optimizer/         # APY optimizer + auto-deposit
│   ├── SKILL.md
│   └── references/cli-reference.md
├── okx-uniswap-strategy/        # LP position creator
│   ├── SKILL.md
│   └── references/data-providers.md
├── okx-lp-position-manager/     # LP lifecycle manager
│   └── SKILL.md
├── okx-onchain-analyst/         # Portfolio analytics
│   └── SKILL.md
├── okx-smart-dca/               # Automated DCA
│   └── SKILL.md
├── okx-risk-guard/              # Stop-loss & take-profit
│   └── SKILL.md
├── okx-agentic-wallet/          # OKX wallet integration (base skill)
├── okx-dex-swap/                # DEX swap primitives
├── okx-dex-market/              # Market data primitives
├── okx-security/                # Token security scanning
└── [+ 5 more OKX base skills]
```

---

## Team

| Name | Role |
|---|---|
| Nithin | Builder |

---

## License

MIT
