# XLayer Skills Arena — OpenClaw Installation

## Prerequisites
- Git
- OpenClaw installed (`npm install -g openclaw@latest`)

## Install (macOS / Linux)

```bash
# 1. Clone the repo
git clone https://github.com/Nith567/xlayer-skills-arena ~/.openclaw/xlayer-skills

# 2. Create symlink for skill discovery
mkdir -p ~/.agents/skills
ln -s ~/.openclaw/xlayer-skills ~/.agents/skills/xlayer-skills

# 3. Restart OpenClaw
openclaw gateway restart
```

## Install (Windows)

```powershell
git clone https://github.com/Nith567/xlayer-skills-arena $env:USERPROFILE\.openclaw\xlayer-skills
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.agents\skills"
mklink /J "$env:USERPROFILE\.agents\skills\xlayer-skills" "$env:USERPROFILE\.openclaw\xlayer-skills"
```

## Update

```bash
cd ~/.openclaw/xlayer-skills && git pull
```

## Uninstall

```bash
rm ~/.agents/skills/xlayer-skills
```

## Available Skills (14)

| Skill | What it does |
|---|---|
| `okx-auto-rebalance` | Natural language portfolio rebalancer |
| `okx-yield-optimizer` | Best APY finder across 43 protocols |
| `okx-yield-compounder` | Auto-compound DeFi rewards |
| `okx-liquidation-guard` | Health factor monitor + auto-repay |
| `okx-uniswap-strategy` | Volatility-based LP creator |
| `okx-lp-position-manager` | LP health, IL calculator, rebalancer |
| `okx-onchain-analyst` | Sharpe ratio, RSI, correlation matrix |
| `okx-token-screener` | Smart money + technical token scanner |
| `okx-copy-trader` | Mirror smart money / whale / KOL trades |
| `okx-smart-dca` | RSI-adjusted DCA with scheduling |
| `okx-risk-guard` | Stop-loss / take-profit automation |
| `okx-meme-scout` | pump.fun scanner + rug filter |
| `okx-v4-rebalancer` | Atomic V4 burn→swap→mint (1 tx) |
| `okx-crosschain-swap` | Bridge tokens across 30+ chains |

## Try it

```
"swap 0.032 USDC from Base to Arbitrum"
"scan pump.fun for safe meme coins"
"analyze my portfolio and show Sharpe ratio"
"rebalance 70% ETH 30% USDC on X Layer"
```
