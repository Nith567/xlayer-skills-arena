# CLI Reference — okx-auto-rebalance

This skill delegates to other `onchainos` sub-commands. Full parameter details for each are in their respective skill references. This file summarizes the commands used in the rebalance flow.

---

## Wallet Balance

```bash
onchainos wallet balance --chain <chainId>
onchainos wallet balance                   # all chains
onchainos wallet balance --force           # bypass cache
```

Returns: token list with `tokenSymbol`, `tokenContractAddress`, `balance`, `usdValue`, `price`

---

## Token Search

```bash
onchainos token search --query <symbol_or_name> --chains <chainId>
```

Returns: `tokenName`, `tokenSymbol`, `tokenContractAddress`, `price`, `liquidity`, `chainIndex`

---

## Swap Quote (read-only)

```bash
onchainos swap quote \
  --from <tokenAddress> \
  --to <tokenAddress> \
  --readable-amount <amount> \
  --chain <chainId>
```

Returns: `toTokenAmount`, `priceImpactPercentage`, `estimatedGas`, `routerResult`, `isHoneyPot`, `taxRate`

---

## Swap Execute (one-shot: approve + sign + broadcast)

```bash
onchainos swap execute \
  --from <tokenAddress> \
  --to <tokenAddress> \
  --readable-amount <amount> \
  --chain <chainId> \
  --wallet <walletAddress> \
  [--slippage <pct>] \
  [--gas-level average|fast|slow] \
  [--mev-protection]
```

Returns: `swapTxHash`, `approveTxHash?`, `fromAmount`, `toAmount`, `priceImpact`, `gasUsed`

**Token Map shortcuts** (pass directly as `--from`/`--to`):
- Native: `eth`, `bnb`, `okb`, `sol`, `matic`, `pol`, `avax`, `ftm`, `trx`, `sui`
- Stables: `usdc`, `usdt`, `dai`
- Wrapped: `weth`, `wbtc`, `wbnb`, `wmatic`

---

## DeFi Positions

```bash
onchainos defi positions --address <addr> --chains <chain1,chain2>
onchainos defi position-detail --address <addr> --chain <chainId> --platform-id <pid>
```

---

## Market Price

```bash
onchainos market price --chain <chainId> --token-address <addr>
```

Returns: `price`, `priceChange24h`, `volume24h`

---

## Supported Chains (Swap)

```bash
onchainos swap chains
```

Returns full list of supported chains with `chainIndex`, `chainName`, `dexEnabled`

---

## Chain IDs Quick Reference

| Chain | chainIndex |
|---|---|
| X Layer (default, zero gas) | 196 |
| Ethereum | 1 |
| BNB Chain | 56 |
| Polygon | 137 |
| Arbitrum One | 42161 |
| Base | 8453 |
| Avalanche | 43114 |
| Solana | 501 |
| Sui | 784 |
| Tron | 195 |
| Ton | 607 |
