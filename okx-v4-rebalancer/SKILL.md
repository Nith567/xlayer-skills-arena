---
name: okx-v4-rebalancer
description: "Use this skill when the user wants to rebalance an out-of-range Uniswap V4 LP position atomically, execute a burn-swap-mint cycle in a single transaction, use V4 flash accounting for gas-efficient liquidity rebalancing, or asks things like 'rebalance my V4 LP atomically', 'my Uniswap V4 position is out of range rebalance it', 'burn and remint my V4 liquidity', 'atomic LP rebalance on V4', 'use V4 flash accounting to rebalance', 'single tx LP rebalance', 'efficient LP rebalance Uniswap V4', 'rebalance my concentrated liquidity position'. Executes a full atomic burn → swap → mint rebalance cycle using Uniswap V4 PoolManager unlock callback and flash accounting — all in one transaction. New range is calculated from fresh OKX 30d volatility data. Swap is routed via Uniswap swap-planner for optimal multi-hop path. Hook security verified via v4-security-foundations before minting. Uses viem-integration for calldata construction, configurator for pool params. Works on Ethereum, Base, Arbitrum (Uniswap V4 chains)."
license: MIT
metadata:
  author: okx
  version: "1.0.0"
  homepage: "https://web3.okx.com"
---

# OKX V4 Rebalancer

Atomic Liquidity Management for Uniswap V4. When your LP position drifts out of range, this skill executes a complete burn → swap → mint cycle in a **single atomic transaction** using V4's PoolManager unlock callback and flash accounting — no multi-tx risk, no price slippage between steps, dramatically cheaper gas than V3-style rebalancing.

## Pre-flight Checks

> Read `../okx-agentic-wallet/_shared/preflight.md`. If that file does not exist, read `_shared/preflight.md` instead.

## Chain Support

> Read `../okx-agentic-wallet/_shared/chain-support.md` for the full list of supported chain names and chainIndex values. If that file does not exist, read `_shared/chain-support.md` instead.

## Skill Routing

| Need | Skill/Tool |
|---|---|
| Current token prices | `okx-dex-market` → `onchainos market price` |
| 30d volatility for new range | `okx-dex-market` → `onchainos market kline` |
| Wallet balance check | `okx-agentic-wallet` → `onchainos wallet balance` |
| Optimal swap route | Uniswap `swap-planner` skill logic |
| V4 calldata construction | Uniswap `viem-integration` skill logic |
| Pool configuration params | Uniswap `configurator` skill logic |
| Hook security pre-check | Uniswap `v4-security-foundations` skill logic |
| Hook deployment (optional) | Uniswap `deployer` skill logic |
| DexScreener pool data | DexScreener API |
| Execute atomic tx | `okx-dex-swap` → `onchainos wallet contract-call` |

---

## Why V4 Atomic Rebalance Is Better

**V3-style rebalance (3 transactions):**
```
Tx 1: burn liquidity from old range
        ↓ price can move here
Tx 2: swap token ratio
        ↓ price can move here
Tx 3: mint liquidity in new range
= 3× gas cost, 3× failure points, price exposure between steps
```

**V4 atomic rebalance (1 transaction):**
```
PoolManager.unlock(rebalanceCalldata) → {
  Action 1: BURN — remove liquidity from old range
  Action 2: SWAP — rebalance token ratio via optimal route
  Action 3: MINT — add liquidity in new range
  Action 4: SETTLE — net out token deltas (flash accounting)
} → single atomic commit
= 1 gas cost, 0 price exposure, guaranteed execution or full revert
```

Flash accounting means tokens never leave the PoolManager until settlement — the entire operation is atomic.

---

## Supported Chains (Uniswap V4)

| Chain | Chain ID | V4 PoolManager |
|---|---|---|
| Ethereum | 1 | `0x000000000004444c5dc75cB358380D2e3dE08A90` |
| Base | 8453 | `0x498581fF718922c3f8e6A244956aF099B2652b2b` |
| Arbitrum | 42161 | `0x360E68faCcca8cA495c1B759Fd9EEe466db9FB32` |
| Unichain | 1301 | `0x1F98400000000000000000000000000000000004` |

---

## Execution Flow

### Step 1 — Parse Position Details

Extract from user message or ask:
- Token pair (e.g. ETH/USDC)
- Chain (default: Base)
- Current position range (min/max price)
- Position ID or NFT token ID

If position details not provided, show instructions:
```
To rebalance your V4 position, I need:
1. Token pair (e.g. ETH/USDC)
2. Current price range you set (min/max)
3. Chain (Ethereum / Base / Arbitrum)

Find these at: app.uniswap.org/positions
```

---

### Step 2 — Position Health Check

Fetch current price:
```bash
onchainos market price --chain <chainId> --token-address <tokenA>
```

Check in-range status:
```
isInRange = minPrice <= currentPrice <= maxPrice

If IN RANGE:
  "Your position is still in range ($X, range $min–$max)
   No rebalance needed yet. Setting up monitor to alert when out of range."
  → CronCreate hourly monitor, exit skill

If OUT OF RANGE:
  "Position out of range — current $X is above/below your range $min–$max
   Earning 0 fees. Ready to atomic rebalance."
  → Continue to Step 3
```

---

### Step 3 — Calculate New Optimal Range (OKX Data)

Fetch 30-day price history:
```bash
onchainos market kline \
  --chain <chainId> \
  --token-address <tokenAddress> \
  --bar 1D \
  --limit 30
```

Calculate fresh volatility-based range:
```
daily_returns  = [(close[i] - close[i-1]) / close[i-1] for each day]
std_dev        = standard_deviation(daily_returns)
weekly_vol     = std_dev × sqrt(7)

new_min        = currentPrice × (1 - weekly_vol × 1.5)
new_max        = currentPrice × (1 + weekly_vol × 1.5)

# Round to nearest valid tick spacing
# V4 0.30% pool tick spacing = 60
# V4 0.05% pool tick spacing = 10
# V4 1.00% pool tick spacing = 200
tick_lower = floor(log(new_min) / log(1.0001) / tickSpacing) × tickSpacing
tick_upper = ceil(log(new_max) / log(1.0001) / tickSpacing) × tickSpacing
```

Show new range:
```
New Range Calculation (OKX 30d Data)
──────────────────────────────────────────────────
Old range:    $1,750 – $2,400  ← out of range ⚠️
Current:      $2,510
Daily vol:    2.8%
Weekly vol:   7.4%

New range:    $2,200 – $2,850  ✅ current price inside
Tick lower:   204,120
Tick upper:   209,400
──────────────────────────────────────────────────
```

---

### Step 4 — Token Ratio for New Range

Calculate how much of each token is needed for new range at current price:

```
L = current liquidity (from position)
sqrtP = sqrt(currentPrice)
sqrtA = sqrt(newMin)
sqrtB = sqrt(newMax)

# Token amounts needed
amount0 = L × (1/sqrtP - 1/sqrtB)   ← token0 (e.g. ETH)
amount1 = L × (sqrtP - sqrtA)        ← token1 (e.g. USDC)

# Current amounts after burn
burned_amount0 = existing token0 from burned position
burned_amount1 = existing token1 from burned position

# Swap needed
if burned_amount0 > amount0:
  → swap excess token0 → token1
  swap_amount = burned_amount0 - amount0
  swap_direction = token0 → token1

if burned_amount1 > amount1:
  → swap excess token1 → token0
  swap_amount = burned_amount1 - amount1
  swap_direction = token1 → token0
```

---

### Step 5 — Optimal Swap Route (swap-planner)

Apply `swap-planner` logic to find best route for the rebalance swap:

```
For the required swap (e.g. ETH → USDC):
  1. Check direct V4 pool (ETH/USDC 0.30%)
  2. Check multi-hop (ETH → WBTC → USDC)
  3. Score by: output amount, gas estimate, price impact
  4. Select route with best net output
```

Show route:
```
Swap Route (swap-planner)
──────────────────────────────────────────────────
Selling:  0.03 ETH (excess from burned position)
Route:    ETH → USDC direct (V4 0.30% pool)
Output:   61.80 USDC
Impact:   0.06% ✅
Gas est:  included in atomic tx
──────────────────────────────────────────────────
```

---

### Step 6 — Hook Security Check (v4-security-foundations)

Before minting to any V4 pool, verify hook safety:

```
If pool has hook address (non-zero):
  Apply v4-security-foundations permission matrix:

  beforeSwapReturnDelta → CRITICAL → BLOCK ❌
    "This hook can steal swap output — refusing to rebalance into this pool"

  beforeRemoveLiquidity → HIGH → WARN ⚠️
    "Hook can block withdrawals — proceed with caution"

  beforeSwap → HIGH → WARN ⚠️

  afterAddLiquidity, afterSwap → MEDIUM → inform

If standard pool (hook = address(0)) → ✅ Safe
```

---

### Step 7 — Construct V4 Atomic Calldata (viem-integration + configurator)

Build the PoolManager `unlock` calldata using `viem-integration` patterns:

```typescript
// Using viem-integration logic to construct actions

const actions = [
  // Action 1: BURN — remove all liquidity from old position
  {
    action: Actions.DECREASE_LIQUIDITY,
    params: {
      tokenId: positionId,
      liquidity: currentLiquidity,    // remove 100%
      amount0Min: 0n,
      amount1Min: 0n,
      hookData: '0x'
    }
  },

  // Action 2: COLLECT — collect all tokens + fees
  {
    action: Actions.COLLECT,
    params: {
      tokenId: positionId,
      recipient: poolManager,         // keep inside PoolManager (flash accounting)
      amount0Max: MAX_UINT128,
      amount1Max: MAX_UINT128,
      hookData: '0x'
    }
  },

  // Action 3: SWAP — rebalance token ratio
  // Uses configurator logic for pool key construction
  {
    action: Actions.SWAP_EXACT_IN_SINGLE,
    params: {
      poolKey: {
        currency0: token0Address,
        currency1: token1Address,
        fee: poolFee,
        tickSpacing: tickSpacing,
        hooks: hookAddress
      },
      zeroForOne: swapDirection,
      amountIn: swapAmount,
      amountOutMinimum: minOut,       // slippage protection
      hookData: '0x'
    }
  },

  // Action 4: MINT — add liquidity in new range
  {
    action: Actions.MINT_POSITION,
    params: {
      poolKey: poolKey,
      tickLower: newTickLower,
      tickUpper: newTickUpper,
      liquidity: newLiquidity,        // calculated from amounts
      amount0Max: amount0After,
      amount1Max: amount1After,
      recipient: userAddress,
      hookData: '0x'
    }
  },

  // Action 5: SETTLE — flash accounting net settlement
  {
    action: Actions.SETTLE_ALL,
    params: {
      currency: token0Address,
      maxAmount: amount0After
    }
  },
  {
    action: Actions.SETTLE_ALL,
    params: {
      currency: token1Address,
      maxAmount: amount1After
    }
  }
]

// Encode via PositionManager multicall
const calldata = encodeABI(actions)
```

---

### Step 8 — Show Full Rebalance Plan

Before executing, show complete plan:

```
V4 Atomic Rebalance Plan — ETH/USDC (Base)
──────────────────────────────────────────────────────────────────
BURN
  Remove: 100% of position (0.049 ETH + 58.20 USDC + 0.82 USDC fees)
  From range: $1,750 – $2,400 (out of range ⚠️)

SWAP  (inside PoolManager — flash accounting)
  Sell: 0.03 ETH → 61.80 USDC
  Route: direct V4 0.30% pool | Impact: 0.06% ✅

MINT
  Add: 0.019 ETH + 119.20 USDC
  New range: $2,200 – $2,850  ✅ (current $2,510 inside)
  Fee tier: 0.30% (13.8% fee APY pool)

SETTLE  (flash accounting net — single transfer in/out)

──────────────────────────────────────────────────────────────────
Transaction type:  ATOMIC (single tx, full revert if any step fails)
Estimated gas:     ~420,000 gas units (Base: ~$0.08)
                   vs V3-style 3-tx: ~$0.24 (3× cheaper)
Hook check:        ✅ No hook on this pool
──────────────────────────────────────────────────────────────────
Confirm atomic rebalance? (yes/no)
```

---

### Step 9 — Execute Atomic Transaction

After confirmation, execute via `onchainos wallet contract-call`:

```bash
# Execute the atomic PoolManager unlock call
onchainos wallet contract-call \
  --chain <chainId> \
  --contract <PositionManager_address> \
  --calldata <encoded_multicall_data> \
  --value 0 \
  --gas-limit 500000 \
  --wallet <userAddress>
```

**Result:**
```
✅ Atomic V4 Rebalance Complete
──────────────────────────────────────────────────────────────────
Transaction:  0xabc...def (single tx ✅)
Gas used:     418,243 units ($0.079 on Base)

BURNED:       Position #1234 (old range $1,750–$2,400)
SWAPPED:      0.03 ETH → 61.80 USDC (0.06% impact)
MINTED:       New position #1235
New range:    $2,200 – $2,850 ✅
Current:      $2,510 (in range ✅, earning fees)

Fees collected during burn: +0.82 USDC
──────────────────────────────────────────────────────────────────
One tx. Atomic. Done.
```

---

### Step 10 — Post-Rebalance Monitor

Set up monitoring for the new position:

```
CronCreate: every 2 hours
→ onchainos market price --chain <chainId> --token-address <tokenAddr>
→ if price < $2,200 OR price > $2,850:
    notify: "⚠️ Your ETH/USDC V4 position is out of range again
             Current: $X | Range: $2,200–$2,850
             Run okx-v4-rebalancer to atomic rebalance again"
```

---

## V4 vs V3 Rebalance Comparison

```
                    V3-style (3 tx)      V4 Atomic (1 tx)
──────────────────────────────────────────────────────────
Transactions:       3                    1
Gas cost (Base):    ~$0.24               ~$0.08  (3× cheaper)
Price exposure:     Between each tx      Zero (atomic)
Failure modes:      Tx 2 or 3 can fail   Full revert or full success
Token transfers:    3× in/out            Net settlement only
Time to complete:   3 blocks             1 block
MEV risk:           High (between txs)   Low (single atomic)
```

---

## Pool Key Construction (configurator logic)

V4 pools are identified by their pool key, not an address:

```typescript
// Using configurator skill patterns
const poolKey = {
  currency0:   token0 < token1 ? token0 : token1,  // sorted lower address
  currency1:   token0 < token1 ? token1 : token0,  // sorted higher address
  fee:         3000,          // 0.30% = 3000, 0.05% = 500, 1.00% = 10000
  tickSpacing: 60,            // 60 for 0.30%, 10 for 0.05%, 200 for 1.00%
  hooks:       zeroAddress    // address(0) for standard pool, hook addr if exists
}
```

Dynamic fee pools (V4 only):
```
fee = 0x800000   // DYNAMIC_FEE_FLAG
tickSpacing = determined by hook
→ shown as "Dynamic" in configurator output
```

---

## Slippage Protection

Always set minimum outputs to protect against sandwich attacks:

```
slippageTolerance = 0.5%  (default)

minOut_swap  = expectedSwapOut × (1 - slippageTolerance)
amount0Min   = expectedAmount0 × (1 - slippageTolerance)
amount1Min   = expectedAmount1 × (1 - slippageTolerance)

If price impact > 1%: warn user, suggest increasing slippage or splitting
If price impact > 3%: require explicit confirmation
```

---

## Risk Rules

| Situation | Action |
|---|---|
| Position still in range | Don't rebalance — show monitoring only |
| Hook has CRITICAL permission | Block — refuse to mint to this pool |
| Hook has HIGH permission | Warn + require explicit confirm |
| Price impact > 3% | Warn — pool may be illiquid |
| Insufficient balance for gas | Alert before attempting |
| Position size < $50 | Warn — gas may exceed rebalance benefit |
| Contract call fails | Show full revert reason, suggest manual via Uniswap UI |

---

## Amount Display Rules

- Gas costs in both units and USD (`418,243 gas / $0.079`)
- Token amounts in UI units (`0.019 ETH`, `119.20 USDC`)
- Range in price terms (`$2,200 – $2,850`), also show ticks (`204,120 / 209,400`)
- Always note: *"Atomic execution means full success or full revert — your funds are never left in a partial state."*
- Compare gas cost vs V3 approach to highlight V4 advantage
