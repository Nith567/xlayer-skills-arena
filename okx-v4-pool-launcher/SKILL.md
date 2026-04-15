---
name: okx-v4-pool-launcher
description: "Use this skill when the user wants to deploy a Uniswap V4 hook and launch a new V4 pool with liquidity in one flow, or asks things like 'create a V4 pool', 'deploy a hook and launch a pool', 'launch ETH/USDC V4 pool', 'deploy V4 pool with my tokens', 'create a new Uniswap V4 pool from scratch', 'set up a V4 LP from zero'. Executes the full 3-step V4 pool launch: (1) deploy hook via CREATE2 factory, (2) initialize pool via PoolManager, (3) mint LP position via PositionManager — all via onchainos wallet contract-call with no private key required. Integrates Uniswap AI liquidity-planner for range calculation and viem-integration for calldata encoding."
license: MIT
metadata:
  author: xlayer-skills
  version: "1.0.0"
  homepage: "https://github.com/Nith567/xlayer-skills-arena"
---

# OKX V4 Pool Launcher

Full **3-step Uniswap V4 pool deployment** in one skill — deploy hook → initialize pool → mint LP position — all executed via `onchainos wallet contract-call` with no private key needed.

## What We Already Deployed (Live Demo)

We ran this exact flow during the XLayer Skills hackathon:

| Step | TX | Details |
|---|---|---|
| Hook deployed | [`0x2372...6db6`](https://basescan.org/tx/0x2372328c118afe68c6243986c03b8d65faae2f1fae1784da52adb28d4c356db6) | CREATE2, afterInitialize flag |
| Pool initialized | [`0xe228...2e37`](https://basescan.org/tx/0xe228a19dfedbad073627f1ddf0e5ff44e88fb78e116a36d5e6f4dbecc2d12e37) | ETH/USDC 0.30% on Base |
| LP minted | [`0x0d8a...9711`](https://basescan.org/tx/0x0d8a9a546a3e48d4a5418c0513f70a69041801b963c148c3a3e6ad0a3ed29711) | NFT #2159266, 0.00041 ETH |
| Hook address | `0xA5F8bdB306774B6068aC8e73eAAd53B3649d5000` | Base mainnet |
| Pool ID | `0xf13ad8e1...8b77f` | ETH/USDC + XLayerHook |

---

## User Parameters

When the user invokes this skill, collect these params (ask only for missing ones):

### Required
| Param | Description | Example |
|---|---|---|
| `token0` | First token address or symbol (sorted lower address) | `ETH` / `0x0000...0000` |
| `token1` | Second token address or symbol (sorted higher address) | `USDC` / `0x8335...` |
| `amount` | How much to deposit | `0.001 ETH` / `$5` / `50 USDC` |
| `chain` | Target chain | `base` / `arbitrum` / `ethereum` |

### Optional (with smart defaults)
| Param | Description | Default |
|---|---|---|
| `fee_tier` | Pool fee tier | `0.30%` (3000) |
| `range_type` | `tight` / `medium` / `wide` / `single-eth` / `single-usdc` | `medium` |
| `price_lower` | Manual lower price bound (overrides range_type) | auto-calculated |
| `price_upper` | Manual upper price bound (overrides range_type) | auto-calculated |
| `hook_address` | Reuse existing hook (skip deploy step) | deploy new |

### Example User Prompts → Parsed Params
```
"launch ETH/USDC V4 pool on Base with 0.001 ETH"
  → token0=ETH, token1=USDC, amount=0.001 ETH, chain=base, fee=0.30%, range=medium

"create a tight range USDC/WBTC pool on Arbitrum, deposit $20 USDC"
  → token0=USDC, token1=WBTC, amount=20 USDC, chain=arbitrum, fee=0.05%, range=tight

"deploy V4 pool for my token 0xabc... paired with ETH, wide range, 0.01 ETH"
  → token0=ETH, token1=0xabc..., amount=0.01 ETH, chain=base, fee=1%, range=wide

"use our existing hook 0xA5F8... and add 0.0005 ETH to the ETH/USDC pool"
  → skip hook deploy, skip pool init if exists, just mint LP
```

---

## Pre-flight Checks

> Read `../okx-agentic-wallet/_shared/preflight.md`. If that file does not exist, read `_shared/preflight.md` instead.

---

## Chain Config

| Chain | Chain ID | PoolManager | PositionManager | CREATE2 Factory |
|---|---|---|---|---|
| Base | 8453 | `0x498581fF718922c3f8e6A244956aF099B2652b2b` | `0x7C5f5A4bBd8fD63184577525326123B519429bDc` | `0x4e59b44847b379578588920cA78FbF26c0B4956C` |
| Ethereum | 1 | `0x000000000004444c5dc75cB358380D2e3dE08A90` | `0x7C5f5A4bBd8fD63184577525326123B519429bDc` | `0x4e59b44847b379578588920cA78FbF26c0B4956C` |
| Arbitrum | 42161 | `0x360E68faCcca8cA495c1B759Fd9EEe466db9FB32` | `0xd88E1F408CF6E5A2793D01e2aB00aB9E097E0f56` | `0x4e59b44847b379578588920cA78FbF26c0B4956C` |

---

## Execution Flow

### Step 1 — Collect & Validate Params

```
Parse user input → fill defaults → show plan:

V4 Pool Launch Plan
──────────────────────────────────────────────────
Pair:       ETH / USDC
Chain:      Base (8453)
Fee tier:   0.30% (tick spacing: 60)
Amount:     0.001 ETH
Range type: medium (±1.5× weekly volatility)

Steps:
  [1] Deploy XLayerHook via CREATE2    ~$0.016
  [2] Initialize ETH/USDC pool         ~$0.004
  [3] Mint LP position                 ~$0.007
  ─────────────────────────────────────────────
  Total gas est:  ~$0.027
  Wallet:  0x6924...e406
──────────────────────────────────────────────────
```

Check balance:
```bash
onchainos wallet balance --chain <chainId>
```
If ETH < (amount + $0.05 gas buffer): stop, show funding instructions.

---

### Step 2 — Calculate Range (liquidity-planner logic)

```bash
# Fetch current price
onchainos market price --chain <chainId> --address <token0_address>

# Fetch 30d kline for volatility
onchainos market kline --chain <chainId> --address <token0_address> --bar 1D --limit 30
```

```python
daily_returns = [(close[i] - close[i-1]) / close[i-1] for i in range(1, 30)]
daily_vol     = std_dev(daily_returns)
weekly_vol    = daily_vol × sqrt(7)

# Range presets (user picks or default = medium)
range_multipliers = {
  "tight":       0.5,   # ±3-5%
  "medium":      1.5,   # ±8-15%
  "wide":        3.0,   # ±20-40%
  "single-eth":  None,  # range entirely above current (ETH only)
  "single-usdc": None,  # range entirely below current (USDC only)
}

if range_type == "single-eth":
  price_lower = currentPrice × 1.02
  price_upper = currentPrice × 1.25

elif range_type == "single-usdc":
  price_lower = currentPrice × 0.75
  price_upper = currentPrice × 0.98

else:
  mult = range_multipliers[range_type]
  price_lower = currentPrice × (1 - weekly_vol × mult)
  price_upper = currentPrice × (1 + weekly_vol × mult)

# Convert to ticks (for ETH/USDC: token0=18dec, token1=6dec)
# adjusted_price = price_usd × 10^(dec1 - dec0) = price_usd / 10^12
def price_to_tick(p, dec0=18, dec1=6):
    p_adj = p × 10^(dec1 - dec0)
    return log(p_adj) / log(1.0001)

tick_lower = floor(price_to_tick(price_lower) / tick_spacing) × tick_spacing
tick_upper = ceil(price_to_tick(price_upper) / tick_spacing) × tick_spacing
```

Show:
```
Range Calculation
──────────────────────────────────────────────
Current ETH:   $2,363
Weekly vol:    7.4%  (30d data from OKX)
Mode:          single-eth (range above current)

Price lower:   $2,410  →  tick -198,420
Price upper:   $2,954  →  tick -196,380
Token ratio:   0.00041 ETH + 0 USDC (single-sided)
──────────────────────────────────────────────
```

---

### Step 3 — Deploy Hook via CREATE2

**Mine the CREATE2 salt** (run locally in Python — no tx needed):

```python
# Permission flag: afterInitialize = bit 12 = 0x1000
# V4 requires non-zero hook to have at least 1 flag set
flags = 0x1000
mask  = 0x3FFF   # bottom 14 bits

# CREATE2 address formula:
# address = keccak256(0xff ++ factory ++ salt ++ keccak256(bytecode))[12:]

bytecode = XLayerHook_creationCode + abi.encode(POOL_MANAGER)
init_code_hash = keccak256(bytecode)

for i in range(200_000):
    salt = i.to_bytes(32, 'big')
    candidate = keccak256(b'\xff' + factory + salt + init_code_hash)[12:]
    if uint160(candidate) & mask == flags:
        hook_address = candidate
        break
```

**Deploy** (no private key — uses onchainos):
```bash
# calldata = salt (32 bytes) + bytecode
onchainos wallet contract-call \
  --to 0x4e59b44847b379578588920cA78FbF26c0B4956C \
  --chain <chainId> \
  --input-data <salt + bytecode> \
  --force
```

**Verify:**
```bash
cast code <hook_address> --rpc-url <rpc>
# Must return non-empty (contract deployed) ✅
```

> **Skip if reusing existing hook** — pass `hook_address` param directly.

---

### Step 4 — Initialize Pool via PoolManager

**Check if pool already exists:**
```python
pool_id = keccak256(abi.encode(pool_key))
slot0   = PoolManager.extsload(pool_id)
# If slot0 == bytes32(0): pool not initialized → initialize
# If slot0 != bytes32(0): pool exists → skip to Step 5
```

**Encode `initialize(PoolKey, uint160)` calldata:**
```python
# selector: 0x6276cbbe
# PoolKey struct (static, 5 × 32 bytes):
pool_key_encoded = abi.encode(
  currency0,    # address  (lower of the two, address(0) for native ETH)
  currency1,    # address  (higher of the two)
  fee,          # uint24   (3000 = 0.30%, 500 = 0.05%, 10000 = 1%)
  tick_spacing, # int24    (60 for 0.30%, 10 for 0.05%, 200 for 1%)
  hook_address  # address  (deployed hook, or address(0) for no hook)
)

# sqrtPriceX96 = sqrt(price_adjusted) × 2^96
# price_adjusted = price_usd × 10^(dec1 - dec0)
sqrtPriceX96 = int(sqrt(currentPrice × 10^(dec1-dec0)) × 2^96)

calldata = 0x6276cbbe + abi.encode(pool_key, sqrtPriceX96)
```

**Execute:**
```bash
onchainos wallet contract-call \
  --to <POOL_MANAGER> \
  --chain <chainId> \
  --input-data <calldata> \
  --force
```

---

### Step 5 — Mint LP Position via PositionManager

**Calculate liquidity L from amount:**
```python
sqrtA = sqrt(1.0001^tick_lower) × 2^96   # in Q64.96
sqrtB = sqrt(1.0001^tick_upper) × 2^96

sqrtA_f = sqrtA / 2^96                    # as float
sqrtB_f = sqrtB / 2^96

# For single-sided ETH (range above current price) — ETH only:
L = eth_amount_wei / (1/sqrtA_f - 1/sqrtB_f)

# For single-sided USDC (range below current price) — USDC only:
L = usdc_amount_raw / (sqrtB_f - sqrtA_f)

# For mixed range (current price inside):
# Split: eth_amount_wei and usdc_amount_raw both needed
# L = eth_amount_wei / (1/sqrtCurrent_f - 1/sqrtB_f)  [limited by token0]
# or from USDC: L = usdc_amount_raw / (sqrtCurrent_f - sqrtA_f) [limited by token1]
# Use minimum of both for safety
```

**Encode `modifyLiquidities(bytes, uint256)` calldata:**

```python
# selector: 0xdd46508f
# Actions (no WRAP — native ETH goes as msg.value for settlement):
actions = bytes([
  0x02,   # MINT_POSITION
  0x0d,   # SETTLE_PAIR  (settles both tokens using msg.value for ETH)
  0x14,   # SWEEP        (returns unused ETH to user)
])

# MINT_POSITION params layout (V4 custom encoding, NOT standard ABI):
# [0x00] currency0      (address, 32 bytes)
# [0x20] currency1      (address, 32 bytes)
# [0x40] fee            (uint24, 32 bytes)
# [0x60] tickSpacing    (int24, 32 bytes)
# [0x80] hooks          (address, 32 bytes)
# [0xa0] tickLower      (int24, 32 bytes signed)
# [0xc0] tickUpper      (int24, 32 bytes signed)
# [0xe0] liquidity      (uint256, 32 bytes)
# [0x100] amount0Max    (uint128, 32 bytes)  ← max ETH to spend
# [0x120] amount1Max    (uint128, 32 bytes)  ← max USDC to spend
# [0x140] recipient     (address, 32 bytes)  ← NFT goes to this address
# [0x160] hookData ptr  = 0x180              ← points to hookData length
# [0x180] hookData len  = 0                  ← empty hookData

# SETTLE_PAIR params: (currency0, currency1)
# SWEEP params: (currency, recipient)

# Pack: unlockData = abi.encode(actions, params_array)
# calldata = 0xdd46508f + abi.encode(unlockData, deadline)
```

**⚠️ Critical encoding notes (learned from deployment):**
- `hookData` offset must be `0x180` (NOT standard ABI offset) — V4 uses custom calldata parsing
- For native ETH pools: do NOT use `WRAP` action — send ETH as `--amt` (msg.value) for settlement
- `amount0Max` must be set to ETH amount + ~1% buffer for rounding
- `SWEEP` at the end returns any unused ETH — always include it

**Execute:**
```bash
onchainos wallet contract-call \
  --to <POSITION_MANAGER> \
  --chain <chainId> \
  --input-data <calldata> \
  --amt <eth_amount_wei>       \
  --gas-limit 500000 \
  --force
```

`--amt` = ETH sent as msg.value, used for native ETH settlement in SETTLE_PAIR.

---

### Step 6 — Show Result

```
✅ V4 Pool Launched — ETH/USDC (Base)
──────────────────────────────────────────────────────────────────
[Step 1] Hook deployed
  Address:  0xA5F8bdB306774B6068aC8e73eAAd53B3649d5000
  TX:       https://basescan.org/tx/0x2372...6db6
  Flag:     afterInitialize (bit 12) — minimum viable hook ✅

[Step 2] Pool initialized
  Pool ID:  0xf13ad8e1...8b77f
  Price:    $2,363 (sqrtPriceX96: 3,851,466,699...)
  TX:       https://basescan.org/tx/0xe228...2e37

[Step 3] LP Position minted
  NFT ID:   #2159266
  Deposited: 0.00041 ETH (~$0.97)
  Range:     $2,410 – $2,954 (single-sided ETH)
  Ticks:     -198,420 / -196,380
  TX:       https://basescan.org/tx/0x0d8a...9711
──────────────────────────────────────────────────────────────────
Total gas:  ~298,000 gas / ~$0.027 on Base
View on Uniswap: https://app.uniswap.org/positions
──────────────────────────────────────────────────────────────────
```

---

## Hook Bytecode (pre-compiled, ready to deploy)

The XLayerHook contract (compiled from our Foundry project) — paste directly into deploy calldata:

```
Source: github.com/Nith567/xlayer-skills-arena → v4-hook/src/XLayerHook.sol
Hook flags: afterInitialize only (bit 12 = 0x1000)
Constructor arg: PoolManager address (padded 32 bytes)
```

The CREATE2 factory calldata format:
```
calldata = salt (32 bytes) + creationCode + abi.encode(POOL_MANAGER)
```

For Base mainnet PoolManager `0x498581fF718922c3f8e6A244956aF099B2652b2b`:
- Pre-mined salt: `0x0000...5249` (gives address `0xA5F8...d5000`)
- Already deployed — **reuse the existing hook** for any new ETH/USDC pools on Base

---

## Fee Tier → Tick Spacing Map

| Fee | Basis Points | uint24 | Tick Spacing |
|---|---|---|---|
| 0.01% | 1 bps | 100 | 1 |
| 0.05% | 5 bps | 500 | 10 |
| 0.30% | 30 bps | 3000 | 60 |
| 1.00% | 100 bps | 10000 | 200 |

---

## Token Decimal Reference

| Token | Decimals | Notes |
|---|---|---|
| ETH / WETH | 18 | Native ETH = address(0) in V4 |
| USDC | 6 | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` on Base |
| USDT | 6 | |
| WBTC | 8 | |
| DAI | 18 | |

Tick formula: `tick = log(price × 10^(dec1−dec0)) / log(1.0001)`

---

## Error Reference (from live deployment)

| Error | Cause | Fix |
|---|---|---|
| `HookAddressNotValid` | Hook address has 0 permission bits | Mine salt for flags ≥ 0x1 (at least 1 bit set) |
| `SliceOutOfBounds` | hookData offset wrong in MINT_POSITION | Set offset = 0x180 (not standard ABI) |
| `MaximumAmountExceeded` | amount0Max too tight | Add 5-10% buffer to amount0Max |
| `OutOfFunds` | Used WRAP then ETH settlement | Remove WRAP; send ETH as msg.value directly |
| Pool already initialized | Calling initialize twice | Check `extsload(poolId)` first; skip if non-zero |
