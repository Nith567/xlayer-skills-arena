# LI.FI API Reference — Cross-Chain Swaps

## Base URLs

| Service | URL | Auth |
|---|---|---|
| Cross-chain routing | `https://li.quest` | None (public) |

> ⚠️ Do NOT use `earn.li.fi` for swaps — that is the Earn vaults API only.

---

## 1. Check Supported Chains

```
GET https://li.quest/v1/chains
```

Optional: `?chainTypes=EVM` (filter to EVM only)

**Response:**
```json
{
  "chains": [
    { "id": 1,     "key": "eth",  "name": "Ethereum", "chainType": "EVM" },
    { "id": 8453,  "key": "bas",  "name": "Base",     "chainType": "EVM" },
    { "id": 42161, "key": "arb",  "name": "Arbitrum", "chainType": "EVM" },
    { "id": 10,    "key": "opt",  "name": "Optimism", "chainType": "EVM" },
    { "id": 137,   "key": "pol",  "name": "Polygon",  "chainType": "EVM" }
  ]
}
```

---

## 2. Check Supported Tokens

```
GET https://li.quest/v1/tokens?chains=8453,42161
```

**Response:**
```json
{
  "tokens": {
    "8453": [
      {
        "address": "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
        "symbol": "USDC",
        "decimals": 6,
        "name": "USD Coin",
        "chainId": 8453
      }
    ],
    "42161": [
      {
        "address": "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
        "symbol": "USDT",
        "decimals": 6,
        "name": "Tether USD",
        "chainId": 42161
      }
    ]
  }
}
```

---

## 3. Get Quote (Cross-Chain Swap)

```
GET https://li.quest/v1/quote
```

**Required parameters:**

| Param | Description | Example |
|---|---|---|
| `fromChain` | Source chain ID | `8453` |
| `toChain` | Destination chain ID | `42161` |
| `fromToken` | Token address or symbol on source | `0x833589f...` or `USDC` |
| `toToken` | Token address or symbol on destination | `0xFd086b...` or `USDT` |
| `fromAmount` | Amount in smallest unit | `100000000` (100 USDC, 6 decimals) |
| `fromAddress` | User wallet address | `0xYourWallet` |

**Optional parameters:**

| Param | Description | Default |
|---|---|---|
| `toAddress` | Destination address (if different) | Same as `fromAddress` |
| `slippage` | Max slippage (0–1) | `0.005` (0.5%) |
| `order` | Route preference: `RECOMMENDED`, `FASTEST`, `CHEAPEST`, `SAFEST` | `RECOMMENDED` |

**Example request:**
```
GET https://li.quest/v1/quote?fromChain=8453&toChain=42161&fromToken=0x833589fcd6edb6e08f4c7c32d4f71b54bda02913&toToken=0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9&fromAmount=100000000&fromAddress=0xYourWallet
```

**Response:**
```json
{
  "type": "lifi",
  "id": "quote-id",
  "tool": "stargate",
  "toolDetails": {
    "key": "stargate",
    "name": "Stargate V2",
    "logoURI": "..."
  },
  "estimate": {
    "fromAmount": "100000000",
    "toAmount": "99240000",
    "toAmountMin": "98720000",
    "executionDuration": 180,
    "feeCosts": [
      {
        "name": "Stargate Fee",
        "amount": "480000",
        "amountUSD": "0.48",
        "token": { "symbol": "USDC", "decimals": 6 }
      }
    ],
    "gasCosts": [
      {
        "type": "SEND",
        "amount": "21000",
        "amountUSD": "0.09",
        "token": { "symbol": "ETH", "decimals": 18 }
      }
    ]
  },
  "action": {
    "fromChainId": 8453,
    "toChainId": 42161,
    "fromToken": { "symbol": "USDC", "decimals": 6 },
    "toToken": { "symbol": "USDT", "decimals": 6 }
  },
  "transactionRequest": {
    "to": "0xRouterAddress",
    "data": "0xCalldata...",
    "value": "0x0",
    "gasLimit": "0x7A120",
    "chainId": 8453
  }
}
```

**Key fields:**

| Field | Description |
|---|---|
| `toolDetails.name` | Bridge name (Stargate, Across, Hop, etc.) |
| `estimate.toAmount` | Expected received amount (smallest unit) |
| `estimate.toAmountMin` | Minimum guaranteed (slippage protected) |
| `estimate.executionDuration` | Estimated seconds for completion |
| `estimate.feeCosts[].amountUSD` | Bridge fee in USD |
| `estimate.gasCosts[].amountUSD` | Gas fee in USD |
| `transactionRequest.to` | Contract to call |
| `transactionRequest.data` | Calldata to send |
| `transactionRequest.value` | ETH value (hex) |
| `transactionRequest.gasLimit` | Gas limit (hex) |

---

## 4. Check Transfer Status

```
GET https://li.quest/v1/status?txHash=0x...&fromChain=8453&toChain=42161
```

**Response:**
```json
{
  "status": "DONE",
  "substatus": "COMPLETED",
  "sending": {
    "txHash": "0xSourceTxHash",
    "chainId": 8453,
    "amount": "100000000",
    "token": { "symbol": "USDC" }
  },
  "receiving": {
    "txHash": "0xDestTxHash",
    "chainId": 42161,
    "amount": "99240000",
    "token": { "symbol": "USDT" }
  }
}
```

**Status values:**

| Status | Substatus | Meaning |
|---|---|---|
| `NOT_FOUND` | — | Tx not indexed yet, retry in 10s |
| `PENDING` | — | Transfer in progress, keep polling |
| `DONE` | `COMPLETED` | Success — tokens arrived |
| `DONE` | `PARTIAL` | Success — received different token |
| `DONE` | `REFUNDED` | Refunded to sender |
| `FAILED` | — | Failed — check error |

---

## 5. List Available Bridges

```
GET https://li.quest/v1/tools
```

Returns all bridges and DEXs available for routing.

---

## Common Token Addresses

### Base (8453)
| Token | Address | Decimals |
|---|---|---|
| ETH (native) | `0x0000000000000000000000000000000000000000` | 18 |
| USDC | `0x833589fcd6edb6e08f4c7c32d4f71b54bda02913` | 6 |
| USDT | `0xfde4C96c8593536E31F229EA8f37b2Ada2699bb2` | 6 |
| WETH | `0x4200000000000000000000000000000000000006` | 18 |

### Arbitrum (42161)
| Token | Address | Decimals |
|---|---|---|
| ETH (native) | `0x0000000000000000000000000000000000000000` | 18 |
| USDC | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` | 6 |
| USDT | `0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9` | 6 |
| WBTC | `0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f` | 8 |

### Ethereum (1)
| Token | Address | Decimals |
|---|---|---|
| USDC | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` | 6 |
| USDT | `0xdAC17F958D2ee523a2206206994597C13D831ec7` | 6 |
| WBTC | `0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599` | 8 |

### Optimism (10)
| Token | Address | Decimals |
|---|---|---|
| USDC | `0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85` | 6 |
| USDT | `0x94b008aA00579c1307B0EF2c499aD98a8ce58e58` | 6 |

### Polygon (137)
| Token | Address | Decimals |
|---|---|---|
| USDC | `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174` | 6 |
| USDT | `0xc2132D05D31c914a87C6611C10748AEb04B58e8F` | 6 |

---

## Rate Limits

| Tier | Limit | Notes |
|---|---|---|
| Public (no key) | ~10 req/min | Sufficient for skill usage |
| With API key | Higher | Get free key at portal.li.fi |

On HTTP 429: wait 10s, retry once.

---

## Error Codes

| Code | Meaning | Action |
|---|---|---|
| 400 | Bad parameters | Check chain IDs, token addresses, amount |
| 404 | No route found | Try different token pair or reduce amount |
| 429 | Rate limited | Wait 10s and retry |
| 500 | LI.FI server error | Retry after 30s |
