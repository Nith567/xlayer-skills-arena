---
name: okx-v4-deposit
description: "Use this skill when the user wants to add liquidity to a Uniswap V4 pool, deposit tokens into a V4 LP position, create a new V4 position, mint a V4 LP NFT, provide liquidity on Uniswap V4, or asks things like 'deposit ETH and USDC into V4', 'add liquidity to my V4 pool', 'create a Uniswap V4 LP position', 'mint V4 position', 'provide liquidity on Base V4', 'add LP to our XLayer hook pool', 'deposit into the XLayerHook pool'. Deploys PositionManager MINT_POSITION calldata via onchainos wallet contract-call, handles native ETH wrapping (WRAP action), USDC permit2 approval, tick range calculation from current price, and flash accounting settlement. Integrates Uniswap AI liquidity-planner for range suggestions and viem-integration for calldata encoding. Works on Base, Ethereum, Arbitrum."
license: MIT
metadata:
  author: xlayer-skills
  version: "1.0.0"
  homepage: "https://github.com/Nith567/xlayer-skills-arena"
---

# OKX V4 Deposit

Add liquidity to a Uniswap V4 pool in a **single transaction** — handles tick range calculation, token approvals, ETH wrapping, and PositionManager MINT_POSITION encoding automatically via `onchainos wallet contract-call`.

## XLayer Skills V4 Hook (Live on Base)

We deployed our own V4 hook for this skill. Use it for any new ETH/USDC pool on Base:

| Field | Value |
|---|---|
| Hook Address | `0xA5F8bdB306774B6068aC8e73eAAd53B3649d5000` |
| Pool | ETH/USDC · 0.30% · tick spacing 60 |
| Pool ID | `0xf13ad8e14ce05706f14160709144a36e309b9f4a2c6e4be0940dc386aed8b77f` |
| PoolManager | `0x498581fF718922c3f8e6A244956aF099B2652b2b` |
| PositionManager | `0x7C5f5A4bBd8fD63184577525326123B519429bDc` |
| Hook Deploy TX | `0x2372328c118afe68c6243986c03b8d65faae2f1fae1784da52adb28d4c356db6` |
| Pool Init TX | `0xe228a19dfedbad073627f1ddf0e5ff44e88fb78e116a36d5e6f4dbecc2d12e37` |
| Basescan | https://basescan.org/address/0xA5F8bdB306774B6068aC8e73eAAd53B3649d5000 |

## Pre-flight Checks

> Read `../okx-agentic-wallet/_shared/preflight.md`. If that file does not exist, read `_shared/preflight.md` instead.

## Skill Routing

| Need | Tool |
|---|---|
| Current ETH price | `onchainos market price --chain 8453 --address 0x4200...` |
| 30d kline for range | `onchainos market kline --chain 8453 --address 0x4200... --bar 1D --limit 30` |
| Wallet balance check | `onchainos wallet balance --chain 8453` |
| Range suggestion | Uniswap AI `liquidity-planner` logic |
| Calldata encoding | Uniswap AI `viem-integration` logic |
| Execute deposit | `onchainos wallet contract-call` |

---

## Supported Chains

| Chain | PoolManager | PositionManager |
|---|---|---|
| Base | `0x498581fF718922c3f8e6A244956aF099B2652b2b` | `0x7C5f5A4bBd8fD63184577525326123B519429bDc` |
| Ethereum | `0x000000000004444c5dc75cB358380D2e3dE08A90` | `0x7C5f5A4bBd8fD63184577525326123B519429bDc` |
| Arbitrum | `0x360E68faCcca8cA495c1B759Fd9EEe466db9FB32` | `0xd88E1F408CF6E5A2793D01e2aB00aB9E097E0f56` |

---

## Execution Flow

### Step 1 — Parse Deposit Intent

Extract from user message:
- Token pair (default: ETH/USDC)
- Chain (default: Base)
- Deposit amount (e.g. "0.0003 ETH" or "$5")
- Range preference: `tight` / `medium` / `wide` / `single-sided ETH` / `single-sided USDC`
- Hook address (default: our XLayerHook `0xA5F8bdB306774B6068aC8e73eAAd53B3649d5000`)

---

### Step 2 — Fetch Price + Balance

```bash
# Current ETH price
onchainos market price --chain 8453 \
  --address 0x4200000000000000000000000000000000000006

# User balances
onchainos wallet balance --chain 8453
```

Check sufficient balance:
```
Required: deposit_amount_ETH + gas (~0.00003 ETH on Base)
Available: wallet ETH balance

If insufficient:
  "You need at least {amount} ETH on Base.
   Current balance: {balance} ETH
   Fund address: {wallet_address}"
  → STOP
```

---

### Step 3 — Calculate Tick Range (liquidity-planner logic)

Apply Uniswap AI `liquidity-planner` range selection:

```python
# Fetch 30d kline for volatility
onchainos market kline --chain 8453 \
  --address 0x4200000000000000000000000000000000000006 \
  --bar 1D --limit 30

daily_returns  = [(close[i] - close[i-1]) / close[i-1] for i in range(1, len)]
daily_vol      = std_dev(daily_returns)
weekly_vol     = daily_vol × sqrt(7)

# Range presets
TIGHT  = currentPrice × (1 ± weekly_vol × 0.5)   # ~3-5% range
MEDIUM = currentPrice × (1 ± weekly_vol × 1.5)   # ~8-15% range
WIDE   = currentPrice × (1 ± weekly_vol × 3.0)   # ~20-40% range

# Single-sided (ETH only — range entirely above current price)
SINGLE_ETH:
  price_lower = currentPrice × 1.02   (2% above current)
  price_upper = currentPrice × 1.20   (20% above current)
  → Deposits only ETH, earns fees when ETH pumps

# Single-sided (USDC only — range entirely below current price)
SINGLE_USDC:
  price_lower = currentPrice × 0.80   (20% below current)
  price_upper = currentPrice × 0.98   (2% below current)
  → Deposits only USDC, earns fees when ETH dips

# Convert to ticks (tick spacing 60 for 0.30% pool)
# token0=ETH(18dec), token1=USDC(6dec) → adjust for decimals
# adjusted_price = price × 10^6 / 10^18 = price / 10^12
tick = floor(log(adjusted_price) / log(1.0001))
tick_lower = floor(tick_lower_raw / 60) × 60
tick_upper = ceil(tick_upper_raw / 60) × 60
```

Show range:
```
Range Calculation (liquidity-planner)
──────────────────────────────────────────────────
Mode:          MEDIUM (1.5× weekly vol)
Current ETH:   $2,363
Weekly vol:    7.4%

Price lower:   $2,190  (tick -202,980)
Price upper:   $2,540  (tick -200,520)
In range:      ✅ current price inside
──────────────────────────────────────────────────
Token ratio at this range:
  ETH:   0.000285  (~$0.67)
  USDC:  0.045     (~$0.045)
──────────────────────────────────────────────────
```

---

### Step 4 — USDC Approval (if needed)

Check USDC allowance to PositionManager. If insufficient:

```bash
# Approve USDC to PositionManager (selector: 0x095ea7b3)
APPROVE_CALLDATA = 0x095ea7b3 \
  + <PositionManager_address padded 32 bytes> \
  + <amount padded 32 bytes>  # or MAX_UINT256 = ffffffff...

onchainos wallet contract-call \
  --to 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 \
  --chain 8453 \
  --input-data <APPROVE_CALLDATA> \
  --force
```

Skip if: single-sided ETH deposit (no USDC needed) or existing approval is sufficient.

---

### Step 5 — Encode MINT_POSITION Calldata (viem-integration logic)

Build `PositionManager.modifyLiquidities(unlockData, deadline)` calldata:

```python
# Action constants (from Actions.sol)
WRAP          = 0x15   # wrap native ETH → WETH for PoolManager
MINT_POSITION = 0x02   # mint new LP position
SETTLE_PAIR   = 0x0d   # settle both tokens from PoolManager
SWEEP         = 0x14   # sweep dust back to user

# Pool Key (abi-encoded struct)
pool_key = {
  currency0:   0x0000000000000000000000000000000000000000,  # native ETH
  currency1:   0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913,  # USDC
  fee:         3000,
  tickSpacing: 60,
  hooks:       0xA5F8bdB306774B6068aC8e73eAAd53B3649d5000   # XLayerHook
}

# Liquidity from amounts (Uniswap V3/V4 formula)
sqrtP  = sqrt(currentPrice / 10^12) × 2^96
sqrtA  = sqrt(priceLower / 10^12) × 2^96
sqrtB  = sqrt(priceUpper / 10^12) × 2^96

# L from ETH amount (token0)
L = eth_amount × sqrtP × sqrtB / (sqrtB - sqrtP)

# Encode actions array:
actions = [WRAP, MINT_POSITION, SETTLE_PAIR, SWEEP]

# Encode params for each action:
params = [
  # WRAP: amount of native ETH to wrap
  abi.encode(eth_amount_wei),

  # MINT_POSITION: (poolKey, tickLower, tickUpper, liquidity, amount0Max, amount1Max, recipient, hookData)
  abi.encode(pool_key, tick_lower, tick_upper, L, eth_amount_wei, usdc_amount_raw, user_address, 0x),

  # SETTLE_PAIR: (currency0, currency1)
  abi.encode(address(0), usdc_address),

  # SWEEP: sweep any leftover ETH back to user
  abi.encode(address(0), user_address)
]

# Pack unlockData = abi.encode(actions, params)
unlock_data = abi.encode(actions, params)

# Final calldata for modifyLiquidities(bytes,uint256)
deadline = block.timestamp + 300
calldata = abi.encodeWithSelector(0xdd46508f, unlock_data, deadline)
```

---

### Step 6 — Execute Deposit

```bash
onchainos wallet contract-call \
  --to 0x7C5f5A4bBd8fD63184577525326123B519429bDc \
  --chain 8453 \
  --input-data <MINT_CALLDATA> \
  --amt <eth_amount_in_wei> \
  --gas-limit 400000 \
  --force
```

`--amt` sends native ETH as msg.value (required for WRAP action).

---

### Step 7 — Confirm Position

After tx confirms, parse the NFT token ID from the transaction receipt (emitted in the `Transfer` event from PositionManager) and show result:

```
✅ V4 Position Minted — ETH/USDC (Base)
──────────────────────────────────────────────────────────────
TX:            https://basescan.org/tx/0x...
NFT Token ID:  #XXXXXXX   ← save this!
Pool:          ETH/USDC · 0.30% · XLayerHook
Hook:          0xA5F8bdB306774B6068aC8e73eAAd53B3649d5000

Deposited:     0.000285 ETH + 0.045 USDC  (~$0.72 total)
Range:         $2,190 – $2,540  ✅ in range
Tick range:    -202,980 / -200,520

Earning fees:  ✅ Yes (current $2,363 is inside range)
Fee tier:      0.30%

View position: https://app.uniswap.org/positions
──────────────────────────────────────────────────────────────

💾 To rebalance this position later, say:
   "rebalance V4 position #XXXXXXX on Base"
──────────────────────────────────────────────────────────────
```

> The NFT Token ID is the position reference. Any time the user mentions it, the `okx-v4-rebalancer` skill will use it to look up and rebalance that specific position.

---

## Single-Sided Deposit (ETH Only)

For users with only ETH and no USDC — set range entirely above current price:

```
Range: $2,400 – $3,000 (both ticks above current $2,363)
→ 100% ETH deposit, no USDC needed
→ Acts like a limit order: automatically sells ETH for USDC as price rises
→ Earns 0.30% fee on every swap through the range
```

Encode exactly the same MINT_POSITION flow but:
- `usdc_amount_raw = 0`
- `amount1Max = 0`
- tick_lower and tick_upper both above current tick

---

## Single-Sided Deposit (USDC Only)

For users with only USDC — set range entirely below current price:

```
Range: $1,800 – $2,300 (both ticks below current $2,363)
→ 100% USDC deposit, no ETH needed
→ Acts like a limit order: automatically buys ETH with USDC as price falls
→ Earns 0.30% fee on every swap through the range
```

---

## Pool Key Reference (copy-paste ready)

```
Pool Key (ETH/USDC + XLayerHook on Base):
  currency0:   0x0000000000000000000000000000000000000000
  currency1:   0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
  fee:         3000
  tickSpacing: 60
  hooks:       0xA5F8bdB306774B6068aC8e73eAAd53B3649d5000
```

---

## Amount Display Rules

- Show both ETH and USD value for all amounts
- Show tick numbers alongside price (`$2,190 = tick -202,980`)
- Always show whether position is in range ✅ or out of range ⚠️
- Compare single-sided vs dual-sided tradeoffs if user is unsure
- Gas estimates: `~180,000 gas / ~$0.004 on Base`
