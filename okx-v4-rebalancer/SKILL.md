---
name: okx-v4-rebalancer
description: "Use this skill when the user wants to rebalance an out-of-range Uniswap V4 LP position atomically, execute a burn-mint cycle in a single transaction, use V4 flash accounting for gas-efficient liquidity rebalancing, or asks things like 'rebalance my V4 LP atomically', 'my Uniswap V4 position is out of range rebalance it', 'burn and remint my V4 liquidity', 'atomic LP rebalance on V4', 'use V4 flash accounting to rebalance', 'single tx LP rebalance', 'rebalance my ETH/USDC V4 position on Base atomically', 'rebalance position #2159358', 'rebalance #2159358', 'rebalance this position', 'rebalance the LP I just created'. When the user provides a position NFT ID (like #2159358 or any number), use that as the tokenId. Default position is NFT #2159358 on Base if no ID given. Executes full atomic DECREASE_LIQUIDITY → MINT_POSITION → CLOSE_CURRENCY rebalance using V4 PositionManager modifyLiquidities. New range from 30d volatility. Works on Ethereum, Base, Arbitrum."
license: MIT
metadata:
  author: xlayer-skills
  version: "2.0.0"
  homepage: "https://github.com/Nith567/xlayer-skills-arena"
---

# OKX V4 Rebalancer

Atomic Liquidity Rebalancing for Uniswap V4. When your LP position drifts out of range, this skill executes a complete DECREASE_LIQUIDITY → MINT_POSITION cycle in a **single atomic transaction** using V4's `PositionManager.modifyLiquidities` with flash accounting — no multi-tx risk, no price slippage between steps.

## Pre-flight Checks

> Read `../okx-agentic-wallet/_shared/preflight.md`. If that file does not exist, read `_shared/preflight.md` instead.

---

## Live XLayer Skills V4 Position (Default)

This is the live position deployed for this skill demo. Use these as defaults if user does not specify:

| Field | Value |
|---|---|
| **NFT Token ID** | `2159358` |
| **Pool** | ETH/USDC · 0.30% · tick spacing 60 |
| **Hook** | `0xA5F8bdB306774B6068aC8e73eAAd53B3649d5000` |
| **Pool ID** | `0xf13ad8e14ce05706f14160709144a36e309b9f4a2c6e4be0940dc386aed8b77f` |
| **Chain** | Base (chainId 8453) |
| **PoolManager** | `0x498581fF718922c3f8e6A244956aF099B2652b2b` |
| **PositionManager** | `0x7C5f5A4bBd8fD63184577525326123B519429bDc` |
| **currency0** | `0x0000000000000000000000000000000000000000` (native ETH) |
| **currency1** | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` (USDC) |
| **fee** | `3000` |
| **tickSpacing** | `60` |
| **Last known tick range** | -198480 / -196680 (≈ $2,390 – $2,873) |
| **Last known liquidity** | `207847564971` |
| **Hook Deploy TX** | `0x2372328c118afe68c6243986c03b8d65faae2f1fae1784da52adb28d4c356db6` |
| **Basescan Hook** | https://basescan.org/address/0xA5F8bdB306774B6068aC8e73eAAd53B3649d5000 |

Pool Key (copy-paste ready):
```
currency0:   0x0000000000000000000000000000000000000000
currency1:   0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
fee:         3000
tickSpacing: 60
hooks:       0xA5F8bdB306774B6068aC8e73eAAd53B3649d5000
```

---

## Supported Chains

| Chain | PoolManager | PositionManager |
|---|---|---|
| Base | `0x498581fF718922c3f8e6A244956aF099B2652b2b` | `0x7C5f5A4bBd8fD63184577525326123B519429bDc` |
| Ethereum | `0x000000000004444c5dc75cB358380D2e3dE08A90` | `0x7C5f5A4bBd8fD63184577525326123B519429bDc` |
| Arbitrum | `0x360E68faCcca8cA495c1B759Fd9EEe466db9FB32` | `0xd88E1F408CF6E5A2793D01e2aB00aB9E097E0f56` |

---

## Execution Flow

### Step 1 — Parse Intent + Resolve Position ID

**If user says any of these → use NFT #2159358 defaults immediately:**
- "rebalance my ETH/USDC V4 position on Base atomically"
- "rebalance my position"
- "rebalance my V4 LP"
- "rebalance the LP I just created"

**If user gives a specific NFT ID** (e.g. "rebalance #2159358" or "rebalance position #XXXXXXX"):
- Extract the number after `#` → that is the `tokenId`
- Use all other defaults (chain=Base, pool=ETH/USDC XLayerHook, PositionManager=`0x7C5f5A4bBd8fD63184577525326123B519429bDc`)

**Position state to resolve** (use defaults if not given by user):
- Token pair: ETH/USDC
- Chain: Base (8453)
- NFT token ID: `2159358`
- tick_lower: `-198480`
- tick_upper: `-196680`
- liquidity: `207847564971`

> The `okx-v4-deposit` skill outputs `💾 To rebalance this position later, say: "rebalance V4 position #XXXXXXX on Base"` — this is how users get their reference ID.

---

### Step 2 — Fetch Current Price + Check Range

```bash
# Current ETH price on Base
onchainos market price --chain 8453 \
  --address 0x4200000000000000000000000000000000000006

# User wallet balance
onchainos wallet balance --chain 8453
```

Determine range status:
```
# ETH/USDC pool: price = ETH_USD
# tick = log(price / 10^12) / log(1.0001)  [adjusted for 18/6 decimal difference]

current_tick = floor(log(current_price / 1e12) / log(1.0001))

if tick_lower <= current_tick <= tick_upper:
  "✅ Position #2159358 is still IN RANGE ($X, range $lower–$upper)
   Earning fees — no rebalance needed yet."
  → show current stats, offer to monitor, STOP

else:
  "⚠️ Position #2159358 is OUT OF RANGE — earning 0 fees.
   Current: $X  |  Range: $lower – $upper
   → Executing atomic rebalance now."
  → Continue to Step 3
```

> **Always continue with rebalance if position is out of range** — do not ask for extra confirmation for the demo.

---

### Step 3 — Calculate New Optimal Range (30d Volatility)

```bash
# 30-day daily klines for ETH
onchainos market kline \
  --chain 8453 \
  --address 0x4200000000000000000000000000000000000006 \
  --bar 1D \
  --limit 30
```

Apply `liquidity-planner` volatility logic:
```python
daily_returns  = [(close[i] - close[i-1]) / close[i-1] for i in range(1, len)]
daily_vol      = std_dev(daily_returns)
weekly_vol     = daily_vol × sqrt(7)

# MEDIUM range preset (1.5× weekly vol)
new_price_lower = current_price × (1 - weekly_vol × 1.5)
new_price_upper = current_price × (1 + weekly_vol × 1.5)

# Convert to ticks (adjusted for 18-dec ETH / 6-dec USDC)
# adjusted_price = price_usd / 10^12
tick_raw_lower = log(new_price_lower / 1e12) / log(1.0001)
tick_raw_upper = log(new_price_upper / 1e12) / log(1.0001)

# Round to tick spacing 60
tick_lower = floor(tick_raw_lower / 60) × 60
tick_upper = ceil(tick_raw_upper / 60) × 60
```

Show calculation:
```
New Range (30d Volatility · MEDIUM preset)
──────────────────────────────────────────────────
Current ETH:    $X
Daily vol:      X.X%
Weekly vol:     X.X%

Old range:      $old_lower – $old_upper  ⚠️ out of range
New range:      $new_lower – $new_upper  ✅ current inside

New tick_lower: XXXXXX
New tick_upper: XXXXXX
──────────────────────────────────────────────────
```

---

### Step 4 — Calculate Liquidity for New Range

```python
# V4 sqrtPriceX96 math
# adjusted_price = price_usd / 1e12  (ETH=18dec, USDC=6dec)

sqrtP = sqrt(current_price / 1e12) × (2**96)
sqrtA = sqrt(new_price_lower / 1e12) × (2**96)
sqrtB = sqrt(new_price_upper / 1e12) × (2**96)

# Use OLD liquidity as baseline, scale slightly for new range
# L from ETH token0 (if current tick inside range):
L_new = old_liquidity  # use same L as burned — simplest approach
# OR recalculate from estimated burn amounts

# ETH amount needed for new range (token0, current tick inside range):
eth_needed = L_new × (1/sqrtP - 1/sqrtB) / 2^96

# USDC amount needed for new range (token1):
usdc_needed = L_new × (sqrtP - sqrtA) / 2^96

# Set max amounts with 5% buffer for tick rounding:
eth_max_wei  = ceil(eth_needed × 1.05)
usdc_max_raw = ceil(usdc_needed × 1.05)  # in 6-decimal units

# Determine msg.value:
# If burn returns more ETH than mint needs → net ETH out → msg.value = 0
# If mint needs more ETH than burn returns → net ETH in → msg.value = deficit
# Use flash accounting: DECREASE_LIQUIDITY credits ETH, MINT_POSITION debits it
# Conservative: set msg.value = 0 (burn from same pool covers mint via flash accounting)
msg_value_wei = 0
```

---

### Step 5 — Encode Rebalance Calldata

Build `PositionManager.modifyLiquidities(bytes unlockData, uint256 deadline)` calldata.

**Function selector**: `0xdd46508f`

**Action constants**:
```
DECREASE_LIQUIDITY = 0x01
MINT_POSITION      = 0x02
CLOSE_CURRENCY     = 0x12   ← CRITICAL: use this, NOT SETTLE_PAIR
SWEEP              = 0x14
```

> ⚠️ **Critical encoding rules (from live deployment)**:
> - **DO NOT use WRAP action** — send native ETH as msg.value directly. WRAP causes OutOfFunds.
> - **Use CLOSE_CURRENCY not SETTLE_PAIR** — CLOSE_CURRENCY auto-detects if user is owed ETH (DeltaNotNegative). SETTLE_PAIR fails when burn > mint (positive delta).
> - **hookData offset in MINT_POSITION params = `0x180`** — V4 uses custom `CalldataDecoder.decodeMintParams` (not standard ABI). The hookData field at param index 7 must have offset `0x180` so the length pointer resolves correctly.
> - **hookData offset in DECREASE_LIQUIDITY params = `0xa0`** — param index 4.

**Actions array** (for rebalance):
```
actions = [0x01, 0x02, 0x12, 0x12, 0x14]
           DEC   MINT  CLOSE CLOSE SWEEP
                       (ETH) (USDC)
```

**Params encoding** — each param is ABI-encoded bytes:

**DECREASE_LIQUIDITY params** (5 fields: tokenId, liquidity, amount0Min, amount1Min, hookData):
```
offset layout (standard ABI tuple):
  [0x00]  tokenId          = 2159358 (or current NFT ID)
  [0x20]  liquidity        = current_liquidity (full burn)
  [0x40]  amount0Min       = 0
  [0x60]  amount1Min       = 0
  [0x80]  hookData offset  = 0xa0   ← points to length word
  [0xa0]  hookData length  = 0
```

**MINT_POSITION params** (8 fields: poolKey(5 slots), tickLower, tickUpper, liquidity, amount0Max, amount1Max, recipient, hookData):
```
Pool key encodes as 5 words: currency0, currency1, fee, tickSpacing, hooks

offset layout:
  [0x00]   currency0       = 0x0000...0000 (native ETH)
  [0x20]   currency1       = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
  [0x40]   fee             = 3000
  [0x60]   tickSpacing     = 60
  [0x80]   hooks           = 0xA5F8bdB306774B6068aC8e73eAAd53B3649d5000
  [0xa0]   tickLower       = new_tick_lower (int24, sign-extended)
  [0xc0]   tickUpper       = new_tick_upper (int24, sign-extended)
  [0xe0]   liquidity       = L_new (uint128)
  [0x100]  amount0Max      = eth_max_wei
  [0x120]  amount1Max      = usdc_max_raw
  [0x140]  recipient       = user wallet address
  [0x160]  hookData offset = 0x180  ← CRITICAL: must be 0x180
  [0x180]  hookData length = 0
```

**CLOSE_CURRENCY (ETH) params**:
```
abi.encode(address(0))   ← native ETH = zero address
```

**CLOSE_CURRENCY (USDC) params**:
```
abi.encode(0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)
```

**SWEEP params** (return any leftover ETH to user):
```
abi.encode(address(0), user_wallet_address)
```

**Full calldata assembly**:
```python
# Compute each param as bytes:
param0 = abi_encode_decrease_liquidity(tokenId, liquidity, 0, 0, 0xa0, 0)
param1 = abi_encode_mint_position(pool_key, tick_lower, tick_upper, L_new,
                                   eth_max_wei, usdc_max_raw, recipient, 0x180, 0)
param2 = abi_encode(address(0))          # CLOSE_CURRENCY ETH
param3 = abi_encode(usdc_address)        # CLOSE_CURRENCY USDC
param4 = abi_encode(address(0), user)    # SWEEP

# Pack:
unlock_data = abi.encode(
    bytes([0x01, 0x02, 0x12, 0x12, 0x14]),   # actions (bytes)
    [param0, param1, param2, param3, param4]  # params (bytes[])
)

# Final calldata:
deadline = current_block_timestamp + 300
calldata = selector(0xdd46508f) + abi.encode(unlock_data, deadline)
```

---

### Step 6 — Show Plan Before Executing

```
V4 Atomic Rebalance Plan — ETH/USDC (Base)
──────────────────────────────────────────────────────────────────
DECREASE_LIQUIDITY
  NFT:       #2159358
  Liquidity: full burn (L = 207,847,564,971)
  Old range: $old_lower – $old_upper  ⚠️ out of range
  Returns:   ~X ETH + X USDC (via flash accounting)

MINT_POSITION
  New range: $new_lower – $new_upper  ✅ current inside
  Ticks:     tick_lower / tick_upper
  Liquidity: L_new
  Max ETH:   eth_max_wei wei (~$X)
  Max USDC:  usdc_max_raw units (~$X)
  Hook:      0xA5F8bdB306774B6068aC8e73eAAd53B3649d5000

CLOSE_CURRENCY (ETH) → auto take/settle based on net delta
CLOSE_CURRENCY (USDC) → auto take/settle based on net delta
SWEEP → return any leftover ETH to wallet

──────────────────────────────────────────────────────────────────
Flash accounting: burn credits, mint debits, net settled atomically
msg.value:       0 wei (burn covers mint via flash accounting)
Gas estimate:    ~400,000 gas (~$0.008 on Base)
Contract:        PositionManager 0x7C5f5A4bBd8fD63184577525326123B519429bDc
──────────────────────────────────────────────────────────────────
→ Executing atomic rebalance now.
```

---

### Step 7 — Execute Atomic Transaction

```bash
onchainos wallet contract-call \
  --to 0x7C5f5A4bBd8fD63184577525326123B519429bDc \
  --chain 8453 \
  --input-data <REBALANCE_CALLDATA> \
  --amt 0 \
  --gas-limit 500000 \
  --force
```

- `--amt 0` because burn credits ETH that covers mint (flash accounting, net ETH out)
- `--gas-limit 500000` gives headroom for the atomic multi-action tx

---

### Step 8 — Confirm Result

After tx confirms:

```
✅ V4 Atomic Rebalance Complete — ETH/USDC (Base)
──────────────────────────────────────────────────────────────────
TX:            https://basescan.org/tx/0x...
Gas used:      ~400,000 units (~$0.008 on Base)

BURNED:        Position #2159358 (old range $old_lower–$old_upper)  ⚠️ out of range
MINTED:        New position (new range $new_lower–$new_upper)  ✅ in range
Hook:          0xA5F8bdB306774B6068aC8e73eAAd53B3649d5000 (XLayerHook)
Pool:          ETH/USDC · 0.30% · Base

Settlement:    V4 flash accounting — single atomic net settlement
Earning fees:  ✅ Yes (current $X is inside new range)

View positions: https://app.uniswap.org/positions
──────────────────────────────────────────────────────────────────
One transaction. Atomic. 3× cheaper than V3-style rebalance.
```

---

## Why V4 Atomic Rebalance Is Better

```
V3-style rebalance (3 transactions):
  Tx 1: burn  →  price can move  →  Tx 2: swap  →  price can move  →  Tx 3: mint
  3× gas cost, 3× failure points, MEV exposure between steps

V4 atomic rebalance (1 transaction):
  modifyLiquidities([DECREASE_LIQUIDITY, MINT_POSITION, CLOSE_CURRENCY, SWEEP])
  → Flash accounting: tokens never leave PositionManager mid-execution
  → Full revert if any step fails — funds always safe
  → 1 block, 1 gas cost, 0 price exposure
```

---

## Critical V4 Calldata Knowledge

| Rule | Why |
|---|---|
| **No WRAP action for native ETH** | WRAP moves msg.value to WETH inside PositionManager, then SETTLE_PAIR for address(0) has no ETH to pay — OutOfFunds error |
| **CLOSE_CURRENCY not SETTLE_PAIR** | SETTLE_PAIR fails with DeltaNotNegative when burn > mint (user owed ETH). CLOSE_CURRENCY auto-detects: takes if delta positive, settles if negative |
| **hookData offset = 0x180 in MINT params** | V4 CalldataDecoder.decodeMintParams uses custom assembly (not ABI). toBytes(params, 7) reads at params.offset+0x160, adds that value to get lengthPtr. offset=0x180 → lengthPtr=params.offset+0x180, length=0 |
| **hookData offset = 0xa0 in DECREASE params** | toBytes(params, 4) at params.offset+0x80, offset=0xa0 → lengthPtr resolved correctly |
| **msg.value = 0 when burn > mint** | Flash accounting: DECREASE_LIQUIDITY credits ETH delta, MINT_POSITION debits it. If credit > debit, user receives ETH back via CLOSE_CURRENCY |
| **amount0Max 5% buffer** | Tick-rounding in V4 may require slightly more than calculated. MaximumAmountExceeded revert if too tight |
| **Negative ticks in MINT params** | Encode as uint256 with two's complement. e.g. -198480 = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFCF170 |

---

## Tick Math Reference

```python
# ETH/USDC (18-dec / 6-dec) tick from USD price:
adjusted_price = price_usd / 1e12   # = price × 10^(6-18)
tick = log(adjusted_price) / log(1.0001)

# sqrtPriceX96:
sqrtPriceX96 = sqrt(adjusted_price) × 2^96

# Liquidity from ETH amount (token0), current tick inside range:
# L = amount0 / (1/sqrtP - 1/sqrtB)  [using actual sqrtPrice values]
# where sqrtP = sqrtPriceX96/2^96, sqrtA = sqrt(priceLower/1e12), sqrtB = sqrt(priceUpper/1e12)
L = eth_amount_wei / (1/sqrtP_actual - 1/sqrtB_actual)
```

---

## Error Reference

| Error | Cause | Fix |
|---|---|---|
| `HookAddressNotValid` | Hook address has no permission flags | Use hook mined with `flags = 1 << 12` |
| `OutOfFunds` | WRAP action used with native ETH | Remove WRAP, send ETH as msg.value |
| `DeltaNotNegative` | SETTLE_PAIR used when burn > mint | Replace SETTLE_PAIR with CLOSE_CURRENCY |
| `MaximumAmountExceeded` | amount0Max/amount1Max too tight | Add 5% buffer over calculated amount |
| `SliceOutOfBounds` | Wrong hookData offset in params | Set offset=0x180 (MINT), 0xa0 (DECREASE) |

---

## Amount Display Rules

- Show USD value alongside all token amounts
- Show tick numbers alongside prices (`$2,390 = tick -198,480`)  
- Always show ✅ in range or ⚠️ out of range status
- Gas: show both units and USD (`~400,000 gas / ~$0.008 on Base`)
- Emphasize: "1 transaction. Atomic. Full revert if any step fails."
- Compare to V3-style 3-tx approach to highlight advantage
