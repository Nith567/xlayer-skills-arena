---
name: okx-onchain-analyst
description: "Use this skill when the user wants deep portfolio analytics, PnL tracking, token performance comparison, volatility analysis, portfolio diversification score, onchain market intelligence, or asks things like 'analyze my portfolio', 'how is my wallet performing', 'which token is my best performer', 'am I diversified enough', 'show my 30 day PnL', 'what is my portfolio risk', 'token correlation in my wallet', 'market momentum for my holdings', 'best time to buy based on data', 'portfolio health check', 'show me my gains and losses', 'which chain has my best assets'. Fetches 30-day kline history for every token in the wallet, calculates individual and portfolio-level metrics: PnL, volatility, Sharpe ratio, correlation, momentum score, chain distribution. Targets Best Data Analyst prize. Works on all chains."
license: MIT
metadata:
  author: okx
  version: "1.0.0"
  homepage: "https://web3.okx.com"
---

# OKX Onchain Analyst

Deep portfolio intelligence powered by OKX onchain market data. Fetches 30-day price history for every token in your wallet, calculates real PnL, volatility, Sharpe ratio, token correlations, and portfolio health score — turning raw onchain data into actionable insights.

## Pre-flight Checks

> Read `../okx-agentic-wallet/_shared/preflight.md`. If that file does not exist, read `_shared/preflight.md` instead.

## Skill Routing

| Need | Skill/Tool |
|---|---|
| Wallet holdings | `okx-agentic-wallet` → `onchainos wallet balance` |
| 30d price history per token | `okx-dex-market` → `onchainos market kline` |
| Current price | `okx-dex-market` → `onchainos market price` |
| DeFi positions | `okx-defi-portfolio` → `onchainos defi positions` |
| Token metadata | `okx-dex-token` → `onchainos token search` |

---

## Execution Flow

### Step 1 — Parse Intent

Identify what analysis the user wants:

| Intent | Analysis |
|---|---|
| "analyze my portfolio" | Full analysis (all steps) |
| "best/worst performers" | Steps 2–4 (returns only) |
| "am I diversified" | Steps 2, 6 (correlation + chain dist) |
| "portfolio risk" | Steps 2–5 (volatility + Sharpe) |
| "market momentum" | Steps 2, 7 (momentum + signals) |
| "30 day PnL" | Steps 2–3 (PnL only) |

Extract:
- Chain (default: all chains)
- Wallet address (from pre-flight)
- Time window (default: 30 days)

---

### Step 2 — Fetch Portfolio Holdings

```bash
# All chains
onchainos wallet balance

# Specific chain
onchainos wallet balance --chain <chainId>
```

For each token with USD value > $1:
```bash
# Get 30-day daily price history
onchainos market kline \
  --chain <chainId> \
  --token-address <tokenAddress> \
  --bar 1D \
  --limit 30
```

Also fetch DeFi positions:
```bash
onchainos defi positions --address <addr> --chains <chain1,chain2>
```

> Fetch all kline data in parallel for speed.

---

### Step 3 — Individual Token Analytics

For each token, calculate from 30-day kline:

**Returns:**
```
price_30d_ago  = kline[0].close
price_now      = kline[29].close
return_30d     = (price_now - price_30d_ago) / price_30d_ago × 100
```

**Volatility:**
```
daily_returns = [(p[i] - p[i-1]) / p[i-1] for each day]
std_dev       = standard_deviation(daily_returns)
annualized_vol = std_dev × sqrt(365) × 100   ← as %
```

**Sharpe Ratio (simplified, risk-free = 0):**
```
mean_daily_return = mean(daily_returns)
sharpe = (mean_daily_return × 365) / (std_dev × sqrt(365))
```

**Momentum Score (0–100):**
```
# Price position within 30d range
high_30d   = max(kline.high)
low_30d    = min(kline.low)
momentum   = (price_now - low_30d) / (high_30d - low_30d) × 100

# Trend direction (10-day vs 30-day SMA)
sma_10     = mean(last 10 closes)
sma_30     = mean(all 30 closes)
trend      = "bullish" if sma_10 > sma_30 else "bearish"
```

**RSI (14-day):**
```
gains = [max(r, 0) for r in daily_returns[-14:]]
losses = [abs(min(r, 0)) for r in daily_returns[-14:]]
RS = mean(gains) / mean(losses)
RSI = 100 - (100 / (1 + RS))
```

---

### Step 4 — Portfolio-Level PnL Table

Display ranked performance:

```
Portfolio Performance — Last 30 Days
─────────────────────────────────────────────────────────────────────
Token    Chain      Value      30d Return   Volatility   Sharpe   RSI
─────────────────────────────────────────────────────────────────────
ETH      Base       $124.50    +18.3% ↑     42% ann      0.82     61
USDC     Base       $48.20     0.0%  —       0.1% ann     —        —
WBTC     Ethereum   $89.10     +22.1% ↑     38% ann      1.14     68
SOL      Solana     $31.80     -8.4% ↓      71% ann      -0.22    38
─────────────────────────────────────────────────────────────────────
Total:              $293.60    +12.8% (weighted avg)
─────────────────────────────────────────────────────────────────────
Best performer:   WBTC  +22.1%
Worst performer:  SOL   -8.4%
```

**Portfolio-level weighted return:**
```
weighted_return = sum(token_return × (token_value / total_value))
```

---

### Step 5 — Risk Profile

**Portfolio Volatility (weighted):**
```
portfolio_vol = sqrt(sum((weight_i × vol_i)^2))  ← simplified (ignores correlation)
```

**Portfolio Sharpe:**
```
portfolio_sharpe = weighted_return_annualized / portfolio_vol
```

**Risk Label:**
```
portfolio_vol < 20%  → Conservative
20–40%               → Moderate
40–60%               → Aggressive
> 60%                → High Risk
```

Display:
```
Risk Profile
──────────────────────────────────────
Portfolio Volatility:  38.2% annualized
Portfolio Sharpe:      0.71
Risk Label:            Moderate ⚖️
──────────────────────────────────────
Sharpe > 1.0 = excellent risk-adjusted returns
Sharpe 0.5–1.0 = good
Sharpe < 0 = losing money on risk taken
```

---

### Step 6 — Diversification Analysis

**Token Correlation Matrix:**

For each pair of tokens, calculate 30-day return correlation:
```
corr(A, B) = covariance(returns_A, returns_B) / (std_A × std_B)
```

Display heatmap (text):
```
Correlation Matrix (30d)
─────────────────────────────────
         ETH    WBTC   SOL    USDC
ETH      1.00   0.84   0.61   0.02
WBTC     0.84   1.00   0.55   0.01
SOL      0.61   0.55   1.00  -0.01
USDC     0.02   0.01  -0.01   1.00
─────────────────────────────────
⚠️ ETH and WBTC highly correlated (0.84)
   Portfolio moves mostly together
```

**Chain Distribution:**
```
Chain Distribution
──────────────────────────────────────
Base:      42.5%  ████████░░
Ethereum:  30.4%  ██████░░░░
Solana:    10.8%  ██░░░░░░░░
Stables:   16.4%  ████░░░░░░  ← 16.4% hedge
──────────────────────────────────────
```

**Diversification Score (0–100):**
```
score = 100 - (avg_correlation × 50) - (top_token_concentration × 30)
        + (stablecoin_pct × 20)
```

```
Diversification Score: 62/100 — Moderate
Suggestion: ETH and WBTC move together 84% of the time.
Consider adding uncorrelated assets (SOL, stablecoins) to reduce portfolio risk.
```

---

### Step 7 — Market Signals

For each token, generate actionable signal:

```
Signal Logic:
RSI < 30  → Oversold → Potential BUY signal
RSI > 70  → Overbought → Potential SELL/TAKE PROFIT signal
RSI 30–70 → Neutral → Hold

Momentum > 70 + Bullish trend → Strong bullish momentum
Momentum < 30 + Bearish trend → Weak, caution
```

Display:
```
Market Signals (Data-Driven, Not Financial Advice)
──────────────────────────────────────────────────────
Token    RSI    Momentum   Trend      Signal
──────────────────────────────────────────────────────
ETH      61     72         Bullish    📈 Hold/Add
WBTC     68     78         Bullish    📈 Hold (near overbought)
SOL      38     31         Bearish    ⚠️  Weak — wait for reversal
USDC     —      —          Stable     💰 Stablecoin hedge active
──────────────────────────────────────────────────────
⚠️ Signals based on 30d onchain data only. Not financial advice.
```

---

### Step 8 — Portfolio Health Score

Combine all metrics into a single score:

```
health_score =
  (sharpe_score × 0.30)          ← risk-adjusted returns
  + (diversification × 0.25)     ← not too correlated
  + (momentum_score × 0.20)      ← current market position
  + (stablecoin_hedge × 0.15)    ← % in stables (0–20% ideal)
  + (positive_pnl × 0.10)        ← are you up overall?

sharpe_score       = min(sharpe / 2, 1) × 100
stablecoin_hedge   = min(stable_pct / 20, 1) × 100
positive_pnl       = 100 if weighted_return > 0 else 0
```

```
Portfolio Health Score: 71/100 — GOOD 🟢

Breakdown:
  Risk-Adjusted Returns:  78/100  ✅ Good Sharpe
  Diversification:        62/100  ⚠️  Correlated assets
  Market Momentum:        68/100  ✅ Bullish trend
  Stablecoin Hedge:       82/100  ✅ 16% in stables
  PnL Status:             100/100 ✅ Portfolio up 12.8%

Top suggestions:
  1. Reduce ETH/WBTC overlap — both move the same direction
  2. SOL showing weakness (RSI 38) — consider trimming
  3. Strong overall — current momentum favors holding
```

---

### Step 9 — Actionable Summary

Always end with 3 clear actions based on data:

```
Data-Driven Actions
──────────────────────────────────────────────────────
1. 🏆 WBTC is your top performer (+22.1%, Sharpe 1.14)
   → Consider taking 10–20% profit or adding more

2. ⚠️ SOL is underperforming (−8.4%, RSI 38, bearish)
   → Watch for RSI bounce above 40 before adding

3. 📊 Portfolio is 84% correlated (ETH + WBTC move together)
   → Swap some WBTC to a less-correlated asset for better diversification

──────────────────────────────────────────────────────
Data sources: OKX 30d kline, onchainos wallet balance
All metrics are historical and do not predict future returns.
```

---

### Step 10 — Optional: Rebalance to Optimal

If user wants to act on the analysis:

```
"Want me to rebalance based on these insights?
 e.g. take 10% profit from WBTC, add to SOL on dip, increase stablecoin hedge"
```

If yes → hand off to `okx-auto-rebalance` with the suggested allocation.

---

## Display Rules

- Returns as percentage with 1 decimal (`+18.3%`)
- Correlation as 2 decimal (`0.84`)
- Volatility as annualized % (`42%`)
- Sharpe to 2 decimals (`0.82`)
- Health score as integer out of 100 (`71/100`)
- Always note: *"All metrics based on 30-day historical data. Past performance does not predict future returns."*
- Never recommend specific buy/sell without RSI + momentum confirmation
