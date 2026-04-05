---
name: okx-liquidation-guard
description: "Use this skill when the user wants to protect their DeFi borrow positions from liquidation, monitor health factor on Aave or Compound, auto-repay debt before getting liquidated, or asks things like 'protect my Aave position', 'alert me if health factor drops below 1.2', 'auto-repay my loan before liquidation', 'monitor my borrow position', 'I dont want to get liquidated', 'watch my collateral ratio', 'Aave health check', 'is my position safe', 'set liquidation protection', 'repay if health factor critical'. Monitors DeFi borrow positions via onchainos defi positions, tracks health factor every hour via CronCreate, and auto-repays using available wallet balance when health factor approaches danger zone. Works on X Layer (Aave V3), Base, Ethereum, Arbitrum."
license: MIT
metadata:
  author: okx
  version: "1.0.0"
  homepage: "https://web3.okx.com"
---

# OKX Liquidation Guard

Automated protection for your DeFi borrow positions. Monitors health factor every hour via CronCreate, alerts you at warning thresholds, and auto-repays debt when your position approaches liquidation — before the protocol can do it at a penalty.

## Pre-flight Checks

> Read `../okx-agentic-wallet/_shared/preflight.md`. If that file does not exist, read `_shared/preflight.md` instead.

## Chain Support

> Read `../okx-agentic-wallet/_shared/chain-support.md` for the full list of supported chain names and chainIndex values. If that file does not exist, read `_shared/chain-support.md` instead.

## Skill Routing

| Need | Skill/Tool |
|---|---|
| Active borrow positions | `okx-defi-portfolio` → `onchainos defi positions` |
| Wallet balance for repayment | `okx-agentic-wallet` → `onchainos wallet balance` |
| Execute repayment | `okx-defi-invest` → `onchainos defi invest` / `onchainos defi withdraw` |
| Swap to get repayment token | `okx-dex-swap` → `onchainos swap execute` |
| Token price (collateral value) | `okx-dex-market` → `onchainos market price` |
| Schedule monitoring | `CronCreate` |

---

## Execution Flow

### Step 1 — Scan All Borrow Positions

```bash
onchainos defi positions \
  --address <walletAddress> \
  --chains <chain1,chain2>
```

Filter for positions with active debt:
- `positionType == "borrow"` or `hasDebt == true`
- Protocols: Aave V3, Compound V3, Morpho, Spark, Venus

For each position extract:
- Protocol name + chain
- Collateral tokens + amounts
- Debt tokens + amounts
- Health factor (if provided)
- Liquidation threshold

---

### Step 2 — Calculate Health Factor

If health factor not directly returned, calculate it:

```
health_factor = (collateral_value_usd × liquidation_threshold) / debt_value_usd

liquidation_threshold per protocol:
  Aave V3 ETH collateral:   0.825  (82.5%)
  Aave V3 USDC collateral:  0.875  (87.5%)
  Aave V3 WBTC collateral:  0.800  (80.0%)
  Compound V3:              0.800  (80.0%)
  Morpho:                   depends on market

Health factor interpretation:
  > 2.0   ✅ Very safe
  1.5–2.0 ✅ Safe
  1.2–1.5 ⚠️  Watch — approaching caution zone
  1.1–1.2 🔴 Warning — repay recommended
  < 1.1   🚨 Critical — liquidation imminent
  < 1.0   💀 Already being liquidated
```

---

### Step 3 — Display Position Health

```
DeFi Borrow Position Health Check
──────────────────────────────────────────────────────────
Protocol    Chain     Collateral        Debt           HF
──────────────────────────────────────────────────────────
Aave V3     X Layer   1.2 ETH ($2,472)  800 USDC       2.55 ✅
Aave V3     Base      0.05 WBTC ($4,200)  2,800 USDC   1.20 ⚠️
Compound    Arbitrum  500 USDC          300 USDC       1.46 ✅
──────────────────────────────────────────────────────────

⚠️  Aave V3 Base — Health Factor 1.20 is in WARNING zone
    If ETH drops another 8%, you will be liquidated
    Recommend: repay $200 USDC to bring HF to 1.5+
```

---

### Step 4 — Configure Protection Thresholds

Ask user (or use defaults):

```
Liquidation Guard Thresholds
──────────────────────────────────────────────────
Warning alert:  HF < 1.5  (notify, no action)
Auto-repay:     HF < 1.2  (repay to bring HF to 1.5)
Emergency:      HF < 1.05 (repay maximum available)
──────────────────────────────────────────────────
Check frequency: every 1 hour
Repay from: available wallet stablecoins (USDC/USDT)
```

---

### Step 5 — Calculate Repayment Amount

When auto-repay triggers:

```
target_hf = 1.5  (safe level)

# How much debt to repay to reach target HF
repay_amount = debt_value - (collateral_value × liq_threshold / target_hf)

Example:
  collateral: $4,200 WBTC × 0.80 threshold = $3,360 effective
  debt: $2,800 USDC
  current HF: 3360/2800 = 1.20
  target HF: 1.50
  needed collateral cover: debt × 1.50 = $2,800 × 1.50 = $4,200
  wait — rearrange: repay_amount = debt - (collateral × threshold / 1.50)
                                 = $2,800 - ($4,200 × 0.80 / 1.50)
                                 = $2,800 - $2,240 = $560

  Repaying $560 USDC → HF goes from 1.20 to 1.50 ✅
```

---

### Step 6 — Execute Repayment

**Check wallet balance first:**
```bash
onchainos wallet balance --chain <chainId>
```

**If enough stablecoin available:**
```bash
# Repay directly via defi invest (repay function)
onchainos defi invest \
  --investment-id <aave_repay_id> \
  --amount <repay_amount_in_decimals> \
  --chain <chainId>
```

**If not enough stablecoins — swap first:**
```bash
# Swap ETH/other token to get USDC for repayment
onchainos swap execute \
  --from <token_address> \
  --to <usdc_address> \
  --readable-amount <amount_needed> \
  --chain <chainId> \
  --wallet <address> \
  --gas-level fast
# Then repay
```

**Repayment confirmed:**
```
✅ Repayment Executed — Aave V3 Base
──────────────────────────────────────────────────
Repaid:         $560 USDC
Health Factor:  1.20 → 1.52 ✅
Liquidation at: now $2,760 ETH price (was $2,993)
Tx:             0xabc...def
──────────────────────────────────────────────────
Your position is now safe.
Guard remains active — monitoring every hour.
```

---

### Step 7 — Activate CronCreate Monitor

```
CronCreate: every 1 hour
→ onchainos defi positions --address <addr> --chains <chains>
→ Calculate health factor for each borrow position
→ if HF < 1.5: notify "⚠️ Warning: Aave HF at 1.42 — approaching danger zone"
→ if HF < 1.2: auto-repay to bring HF to 1.5
→ if HF < 1.05: emergency repay maximum available balance
→ Report health summary hourly
```

Confirm:
```
✅ Liquidation Guard Active
──────────────────────────────────────────────────
Monitoring:   Aave V3 X Layer + Aave V3 Base
Check:        Every hour
Warning:      HF < 1.5 (notify)
Auto-repay:   HF < 1.2 (target 1.5)
Emergency:    HF < 1.05 (repay max)
Repay from:   Wallet USDC balance

To view:      "show my borrow health"
To stop:      "stop liquidation guard"
To adjust:    "change warning threshold to 1.3"
```

---

### Step 8 — Price Crash Simulation

When user asks "what price would liquidate me":

```
"at what ETH price will I get liquidated?"
```

```
Liquidation Price Analysis — Aave V3 Base
──────────────────────────────────────────────────────
Collateral:   0.05 WBTC (current $84,000 = $4,200)
Debt:         $2,800 USDC
Threshold:    80%

Liquidation at: WBTC = $70,000 (current $84,000)
Distance:       -16.7% drop triggers liquidation

Price scenarios:
  WBTC $80,000 → HF 1.14  🔴 Warning
  WBTC $75,000 → HF 1.07  🚨 Critical
  WBTC $70,000 → HF 1.00  💀 Liquidation
──────────────────────────────────────────────────────
Buffer: $14,000 WBTC drop before liquidation
```

---

## X Layer — Aave V3 USDG

On X Layer (chainIndex 196), Aave V3 is the primary DeFi protocol:

```bash
# Check X Layer positions
onchainos defi positions --address <addr> --chains 196

# Repay USDG debt on X Layer
onchainos defi search --token USDG --chain 196
# → find repay investmentId for Aave V3 USDG
```

X Layer zero gas = free hourly health checks, no gas cost for monitoring.

---

## Risk Rules

| Situation | Action |
|---|---|
| HF > 2.0 | No action needed, monitor only |
| HF 1.5–2.0 | Safe, hourly check continues |
| HF 1.2–1.5 | Send warning notification |
| HF 1.1–1.2 | Auto-repay to target 1.5 |
| HF < 1.1 | Emergency max repay, urgent notification |
| No stablecoin to repay | Notify immediately — manual action required |
| Repay tx fails | Retry once with higher gas, then alert user |

---

## Amount Display Rules

- Health factor to 2 decimals (`1.52`)
- Debt/collateral in USD (`$2,800 USDC`, `$4,200 WBTC`)
- Liquidation price to nearest dollar (`$70,000`)
- Always note: *"Health factor calculations are estimates. Always verify on the protocol UI before making large decisions."*
