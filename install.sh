#!/bin/bash

# XLayer Skills Arena — Install Script
# Copies all skills to Claude Code skills directory

SKILLS_DIR="$HOME/.claude/skills"

echo "Installing XLayer Skills Arena..."
echo ""

# Create skills directory if it doesn't exist
mkdir -p "$SKILLS_DIR"

# Copy all okx skills
for skill in okx-*/; do
  if [ -f "$skill/SKILL.md" ]; then
    cp -r "$skill" "$SKILLS_DIR/"
    echo "✅ Installed: $skill"
  fi
done

echo ""
echo "Done! 12 skills installed to $SKILLS_DIR"
echo ""
echo "Open Claude Code and try:"
echo '  "rebalance my portfolio 70% ETH 30% USDC on Base"'
echo '  "find best yield for my USDC"'
echo '  "scan pump.fun for new meme coins"'
echo '  "what are smart money buying on Base"'
echo '  "analyze my portfolio"'
echo ""
echo "onchainos CLI will auto-install on first run."
