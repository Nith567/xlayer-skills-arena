# Data Providers — okx-uniswap-strategy

## OKX Onchain OS (onchainos)

### Market Kline (Price History)

```bash
onchainos market kline \
  --chain <chainId> \
  --token-address <tokenAddress> \
  --bar 1D \
  --limit 30
```

**Response fields:**
- `ts` — timestamp (ms)
- `o` — open price
- `h` — high price
- `l` — low price
- `c` — close price
- `vol` — volume
- `volCcy` — volume in currency

**Bar options:** `1m`, `5m`, `15m`, `1H`, `4H`, `1D`, `1W`

---

### Market Price (Current)

```bash
onchainos market price \
  --chain <chainId> \
  --token-address <tokenAddress>
```

**Response fields:**
- `price` — current USD price
- `priceChange24h` — 24h change %
- `volume24h` — 24h volume USD

---

### Token Security Detection

```bash
onchainos security token-detection \
  --token-addresses <addr1>,<addr2> \
  --chain <chainId>
```

**Response fields:**
- `isHoneypot` — true/false
- `isMalicious` — true/false
- `riskLevel` — low/medium/high/critical
- `riskItems` — list of detected risk flags

Block deposit if: `isHoneypot == true` OR `riskLevel == critical`

---

### Wallet Balance

```bash
onchainos wallet balance --chain <chainId>
```

**Response fields:**
- `tokenSymbol`
- `tokenContractAddress`
- `balance` — raw balance
- `usdValue`
- `price`

---

### Swap Execute

```bash
onchainos swap execute \
  --from <tokenAddress> \
  --to <tokenAddress> \
  --readable-amount <amount> \
  --chain <chainId> \
  --wallet <address> \
  --gas-level average
```

---

## DexScreener API

**Base URL:** `https://api.dexscreener.com`

### Token Pairs (Pool Discovery)

```
GET /token-pairs/v1/{network}/{tokenAddress}
```

**Network slugs:**
| Chain | Slug |
|---|---|
| Ethereum | `ethereum` |
| Base | `base` |
| Arbitrum | `arbitrum` |
| Optimism | `optimism` |
| Polygon | `polygon` |
| BNB Chain | `bsc` |
| Unichain | `unichain` |

**Response fields used:**
- `pairAddress` — pool contract address
- `dexId` — filter to `"uniswap"`
- `labels[0]` — version (`"v3"`, `"v4"`)
- `feeTier` — fee in basis points (e.g. `3000` = 0.30%)
- `liquidity.usd` — TVL in USD
- `volume.h24` — 24h volume in USD
- `baseToken.symbol` / `quoteToken.symbol`

**Filter for Uniswap pools:**
```bash
curl -s "https://api.dexscreener.com/token-pairs/v1/<network>/<tokenAddress>" | \
  jq '[.[] | select(.dexId == "uniswap")]'
```

No API key required. Rate limit: 300 req/min.

---

## DeFi Llama API

**Base URL:** `https://yields.llama.fi`

### All Yield Pools

```
GET /pools
```

**Response fields used:**
- `pool` — unique pool ID
- `project` — protocol name (e.g. `"uniswap-v3"`)
- `symbol` — token pair symbol
- `chain` — chain name (capitalized: `"Ethereum"`, `"Base"`)
- `apy` — current APY (%)
- `tvlUsd` — total value locked USD
- `apyBase` — base APY from fees
- `apyReward` — reward APY

### Historical APY

```
GET /chart/{poolId}
```

Returns daily APY history for trend analysis.

**Filter for Uniswap pools:**
```python
project in ["uniswap-v3", "uniswap-v4"]
chain == <target_chain>   # e.g. "Base", "Ethereum"
symbol contains tokenA and tokenB
```

No API key required. Cache response per session.

---

## Chain IDs Quick Reference

| Chain | chainIndex | DexScreener Slug | DeFi Llama Chain |
|---|---|---|---|
| Ethereum | 1 | `ethereum` | `Ethereum` |
| Base | 8453 | `base` | `Base` |
| Arbitrum One | 42161 | `arbitrum` | `Arbitrum` |
| Optimism | 10 | `optimism` | `Optimism` |
| Polygon | 137 | `polygon` | `Polygon` |
| BNB Chain | 56 | `bsc` | `BSC` |
| X Layer | 196 | — | — |

---

## Common Token Addresses

### Base Chain (8453)

| Token | Address |
|---|---|
| ETH (native) | `NATIVE` |
| USDC | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| USDT | `0xfde4C96c8593536E31F229EA8f37b2Ada2699bb2` |
| WETH | `0x4200000000000000000000000000000000000006` |
| cbBTC | `0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf` |

### Ethereum (1)

| Token | Address |
|---|---|
| ETH (native) | `NATIVE` |
| USDC | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` |
| USDT | `0xdAC17F958D2ee523a2206206994597C13D831ec7` |
| WBTC | `0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599` |
| WETH | `0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2` |

### Arbitrum (42161)

| Token | Address |
|---|---|
| ETH (native) | `NATIVE` |
| USDC | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` |
| USDT | `0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9` |
| WBTC | `0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f` |
