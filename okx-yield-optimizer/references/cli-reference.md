# CLI Reference — okx-yield-optimizer

## DeFi Discovery

```bash
# Top APY products globally (sorted by rate desc)
onchainos defi list

# Search by token symbol across all chains
onchainos defi search --token <symbol>

# Search by token on specific chain
onchainos defi search --token <symbol> --chain <chainId>

# Search by platform
onchainos defi search --token <symbol> --platform <platformName>

# Search by product group (lending, staking, lp)
onchainos defi search --token <symbol> --product-group <group>

# Full product details (APY breakdown, contract info, risk flags)
onchainos defi detail --investment-id <id>
```

**Response fields:**
- `investmentId` — required for invest/withdraw/collect
- `name` — product name
- `platformName` — protocol name
- `rate` — current APY as decimal (0.046 = 4.6%)
- `tvl` — total value locked in USD
- `chainIndex` — chain ID

---

## Deposit

```bash
onchainos defi invest \
  --investment-id <id> \
  --address <walletAddress> \
  --token <symbol_or_contractAddress> \
  --amount <minimalUnits> \
  --chain <chainId> \
  [--slippage <pct>]
```

> `--amount` is in **minimal units** (raw). Convert: `human_amount × 10^decimals`
> Example: 100 USDC (6 decimals) = `100000000`
> Get decimals from `defi detail` response.

---

## Withdraw

```bash
# Full withdrawal
onchainos defi withdraw \
  --investment-id <id> \
  --address <addr> \
  --chain <chainId> \
  --ratio 1

# Partial withdrawal (50%)
onchainos defi withdraw \
  --investment-id <id> \
  --address <addr> \
  --chain <chainId> \
  --ratio 0.5

# Withdraw by exact amount (minimal units)
onchainos defi withdraw \
  --investment-id <id> \
  --address <addr> \
  --chain <chainId> \
  --amount <minimalUnits>
```

---

## Claim Rewards

```bash
onchainos defi collect \
  --address <addr> \
  --chain <chainId> \
  --reward-type supply \
  --investment-id <id>
```

`--reward-type` options: `supply`, `borrow`, `liquidity`

---

## View Positions

```bash
# All DeFi positions across chains
onchainos defi positions --address <addr> --chains <chain1,chain2>

# Detailed position for a specific platform
onchainos defi position-detail \
  --address <addr> \
  --chain <chainId> \
  --platform-id <pid>
```

---

## DeFi Llama API

```
Base URL: https://yields.llama.fi

GET /pools          → all pools with APY, TVL, chain, symbol
GET /chart/{pool}   → historical APY for a specific pool ID
```

Filter logic for quality pools:
```python
tvlUsd > 5_000_000     # min $5M liquidity
0.5 < apy < 50        # filter outliers
ilRisk != "yes"       # optional: single-sided only
```

---

## Chain IDs Quick Reference

| Chain | chainIndex |
|---|---|
| Ethereum | 1 |
| BNB Chain | 56 |
| Polygon | 137 |
| Avalanche | 43114 |
| Arbitrum | 42161 |
| Base | 8453 |
| Optimism | 10 |
| X Layer | 196 |
| Solana | 501 |
| Sui | 784 |
| Aptos | 637 |
| Cosmos | 118 |
| Tron | 195 |
