---
name: okx-auto-rebalance
description: "Use this skill whenever the user wants to rebalance their portfolio, reallocate tokens by percentage, auto-rebalance holdings, split assets across tokens, set target allocations, or redistribute crypto. Trigger on phrases like 'rebalance 25% to OKB', 'put 50% in ETH and rest in USDC', 'rebalance my portfolio', 'allocate 30% to each token', 'redistribute my holdings', 'rebalance on X Layer', 'strategic rebalance', 'shift 40% to USDT', 'move funds to match target weights', '再平衡', '资产再分配', '按比例分配'. Supports all chains — defaults to X Layer (zero gas fees) when chain is not specified. Orchestrates okx-agentic-wallet, okx-dex-swap, okx-dex-market, okx-defi-portfolio, and okx-dex-token skills to plan and execute multi-token rebalances in one session."
license: MIT
metadata:
  author: okx
  version: "1.0.0"
  homepage: "https://web3.okx.com"
---

# OKX Auto Rebalance

Multi-chain strategic portfolio rebalancer. Parses percentage-based allocation instructions, checks current holdings, calculates the required swaps, and executes them — all in one session.

## Pre-flight Checks

> Read `../okx-agentic-wallet/_shared/preflight.md`. If that file does not exist, read `_shared/preflight.md` instead.

## Chain Name Support

> Full chain list: `../okx-agentic-wallet/_shared/chain-support.md`. If that file does not exist, read `_shared/chain-support.md` instead.

## Default Chain: X Layer

> **Always default to X Layer (chainIndex `196`) when the user does not specify a chain.**
> X Layer charges zero gas fees — this is a major advantage. Proactively mention this when the user has not chosen a chain.

---

## Skill Routing

This skill orchestrates other skills. Know when to delegate:

| Need | Skill |
|---|---|
| Wallet login / auth | `okx-agentic-wallet` |
| Check current balances | `okx-agentic-wallet` → `wallet balance` |
| Token price / market data | `okx-dex-market` → `onchainos market price` |
| Token contract address lookup | `okx-dex-token` → `onchainos token search` |
| DeFi positions (staking, lending) | `okx-defi-portfolio` |
| Execute swaps | `okx-dex-swap` → `onchainos swap execute` |

---

## Rebalance Execution Flow

### Step 1 — Parse the User's Allocation Intent

Extract target allocations from the user's message. Examples:

| User Says | Parsed Targets |
|---|---|
| "rebalance 25% to OKB, rest to USDT" | OKB: 25%, USDT: 75% |
| "put 50% in ETH, 30% in USDC, 20% in OKB" | ETH: 50%, USDC: 30%, OKB: 20% |
| "rebalance equally across ETH, OKB, USDT" | ETH: 33.3%, OKB: 33.3%, USDT: 33.3% |
| "move everything to USDC" | USDC: 100% |
| "50/50 OKB and ETH" | OKB: 50%, ETH: 50% |

**Rules:**
- Percentages must sum to 100%. If they don't, ask the user to confirm before proceeding.
- "Remaining", "rest", "the rest", "remainder" = whatever percentage is left after other allocations.
- "Equally" / "evenly" = divide 100% by number of tokens.
- If no chain is mentioned → use X Layer (196), and tell the user: "Defaulting to X Layer — zero gas fees."

### Step 2 — Identify Chain

- Infer chain from user's message (e.g., "on Ethereum" → chainIndex `1`, "on Base" → `8453`).
- If not mentioned → X Layer (`196`).
- **`--chain` accepts numeric chain ID only** — never pass names.

### Step 3 — Fetch Current Portfolio

Run wallet balance for the target chain:
```bash
onchainos wallet balance --chain <chainId>
```

If the user is not logged in, follow the auth flow from `okx-agentic-wallet` first.

Build a snapshot of current holdings on that chain:
- Each token: symbol, contract address, balance (UI units), USD value
- Total portfolio USD value

### Step 4 — Resolve Token Addresses

For each target token:
1. **Native tokens & known symbols** — use TOKEN_MAP shortcuts directly (no search needed):
   - Native EVM: `0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee`
   - `usdc`, `usdt`, `dai`, `weth`, `wbtc` — pass symbol directly to swap CLI
2. **Unknown tokens** — search:
   ```bash
   onchainos token search --query <symbol> --chains <chainId>
   ```
   - Multiple matches → show name/symbol/CA to user and ask them to confirm before continuing.
   - Single match → show and confirm before executing.

### Step 5 — Calculate Required Swaps

With current holdings and target allocations known:

```
target_usd[token]  = total_portfolio_usd × target_pct[token]
current_usd[token] = current balance × current price
delta_usd[token]   = target_usd[token] - current_usd[token]
```

**Tokens with `delta_usd > 0`** → need to buy (swap INTO these).
**Tokens with `delta_usd < 0`** → need to sell (swap FROM these).

**Show the rebalance plan to the user before executing:**

```
Rebalance Plan (X Layer — zero gas)
─────────────────────────────────────────────────────
Current Portfolio: $1,240.00

Token    Current      Target       Action
─────────────────────────────────────────────────────
OKB      $620 (50%)   $310 (25%)   SELL ~$310 worth
USDT     $310 (25%)   $930 (75%)   BUY  ~$620 worth
ETH      $310 (25%)   $0   (0%)    SELL ~$310 worth
─────────────────────────────────────────────────────
Total swaps: 2
```

Ask: "Does this plan look right? Type **confirm** to execute or let me know what to adjust."

### Step 6 — Execute Swaps

Once confirmed, execute swaps in the optimal order:

**Order of operations:**
1. Execute all SELL swaps first (this frees up liquidity for BUY swaps).
2. Then execute BUY swaps.
3. If a token needs to go to zero, sell 100% of it.

For each swap:
```bash
onchainos swap execute \
  --from <fromTokenAddress> \
  --to <toTokenAddress> \
  --readable-amount <amount> \
  --chain <chainId> \
  --wallet <walletAddress> \
  [--slippage <pct>] \
  [--gas-level average]
```

Apply slippage presets from `okx-dex-swap`:
- Stablecoins → autoSlippage (ref 0.1–0.3%)
- Mainstream tokens (ETH, OKB) → autoSlippage (ref 0.5–1%)
- Low-cap / meme → autoSlippage (ref 5–20%), gas: `fast`

**After each swap:** report result inline (swapTxHash, amounts, status). Don't wait until all are done.

### Step 7 — Post-Rebalance Summary

After all swaps complete, run:
```bash
onchainos wallet balance --chain <chainId>
```

Display final state:

```
Rebalance Complete ✓
─────────────────────────────────────────────────────
Token    Final Balance    USD Value    Target %    Actual %
─────────────────────────────────────────────────────
OKB      3.74 OKB         $309.50      25%         24.97%
USDT     930.10 USDT      $929.87      75%         75.03%
─────────────────────────────────────────────────────
Total Portfolio: $1,239.37
```

---

## Multi-Chain Rebalance

When the user wants to rebalance across multiple chains (e.g., "rebalance 50% OKB on X Layer and 50% ETH on Ethereum"):

1. Group target allocations by chain.
2. Fetch balance per chain separately.
3. Calculate and display a unified plan showing each chain's swaps.
4. Execute chain-by-chain (X Layer first, since it's gas-free).
5. Summarize all results at the end.

---

## DeFi Position Awareness

If the user has DeFi positions (staking, lending), they may not show in `wallet balance`. Check with:
```bash
onchainos defi positions --address <addr> --chains <chain>
```

If DeFi positions exist, inform the user:
> "You have DeFi positions that aren't included in the rebalance (staked/lent assets can't be swapped directly). Would you like to withdraw them first?"

Do NOT auto-withdraw DeFi positions without explicit user instruction.

---

## Risk Controls

| Situation | Action |
|---|---|
| Percentages don't add to 100% | Ask user to confirm or correct before proceeding |
| Token is honeypot (`isHoneyPot=true`) | Block buy, warn on sell |
| Price impact > 5% on any swap | Warn prominently, ask confirmation |
| Token not found on chain | Tell user, suggest searching with full name or CA |
| Swap would leave dust < $1 | Round to 100% sell (avoid stranded micro-balances) |
| Large trade (> $5,000) | Suggest splitting into 2–3 tranches to reduce price impact |

---

## MEV Protection

Apply MEV protection automatically when swap value ≥ threshold:
- Ethereum: ≥ $5,000 → add `--mev-protection`
- BNB Chain / Base: ≥ $1,000 → add `--mev-protection`
- Solana: ≥ $1,000 → add `--tips 0.001`
- X Layer: MEV protection not needed (zero-gas chain, low MEV risk)

---

## Native Token Addresses (EVM)

| Purpose | Address |
|---|---|
| Native EVM (OKB on X Layer, ETH on Ethereum, etc.) | `0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee` |

Always use this address for native tokens on EVM chains. Do NOT search for the native token.

---

## Amount Display Rules

- Always show amounts in UI units (e.g., `3.74 OKB`, `930 USDT`)
- USD values with 2 decimal places (`$309.50`)
- Large amounts as shorthand (`$12.4K`, `2.3M USDT`)
- Percentages to 2 decimal places (`24.97%`)

---

## Edge Cases

- **User says "rebalance" with no targets** → Ask: "What allocation would you like? For example: 50% OKB, 50% USDT."
- **Already at target** → Inform user: "Your portfolio is already within 1% of target. No swaps needed."
- **Single token portfolio, rebalancing to same token** → Inform user: nothing to do.
- **Insufficient balance for a swap** → Skip that swap, note it in the summary, suggest topping up.
- **Chain has no liquidity for token pair** → Report it, suggest an alternative chain.

> For CLI parameter details and advanced options, see [references/cli-reference.md](references/cli-reference.md).
