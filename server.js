const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const ROOT = __dirname;

// Auto-discover all skills (folders with SKILL.md)
function getSkills() {
  return fs
    .readdirSync(ROOT)
    .filter((f) => {
      const skillPath = path.join(ROOT, f, "SKILL.md");
      return fs.existsSync(skillPath) && fs.statSync(path.join(ROOT, f)).isDirectory();
    })
    .map((folder) => {
      const skillMd = fs.readFileSync(path.join(ROOT, folder, "SKILL.md"), "utf8");
      // Parse YAML frontmatter
      const nameMatch = skillMd.match(/^name:\s*(.+)$/m);
      const descMatch = skillMd.match(/^description:\s*(.+)$/m);
      const licenseMatch = skillMd.match(/^license:\s*(.+)$/m);
      return {
        id: folder,
        name: nameMatch ? nameMatch[1].trim() : folder,
        description: descMatch ? descMatch[1].trim() : "",
        license: licenseMatch ? licenseMatch[1].trim() : "MIT",
        skill_url: `${process.env.BASE_URL || "https://x-layer-skills.up.railway.app"}/skills/${folder}`,
        raw_url: `https://raw.githubusercontent.com/Nith567/xlayer-skills-arena/main/${folder}/SKILL.md`,
      };
    });
}

// GET /  — registry homepage
app.get("/", (req, res) => {
  const skills = getSkills();
  res.json({
    name: "XLayer Skills Arena",
    description: "14 agentic DeFi skills built on OKX Onchain OS",
    github: "https://github.com/Nith567/xlayer-skills-arena",
    agent_wallet: "0x6924bf1575922794776dfa95c695fe222b74e406",
    total_skills: skills.length,
    install: "curl -s https://raw.githubusercontent.com/Nith567/xlayer-skills-arena/main/install.sh | bash",
    skills_index: `${process.env.BASE_URL || "https://x-layer-skills.up.railway.app"}/skills`,
  });
});

// GET /skills  — list all skills
app.get("/skills", (req, res) => {
  res.json(getSkills());
});

// GET /skills/:id  — return raw SKILL.md content
app.get("/skills/:id", (req, res) => {
  const skillPath = path.join(ROOT, req.params.id, "SKILL.md");
  if (!fs.existsSync(skillPath)) {
    return res.status(404).json({ error: `Skill '${req.params.id}' not found` });
  }
  const content = fs.readFileSync(skillPath, "utf8");
  // Support both markdown and JSON response
  if (req.headers.accept && req.headers.accept.includes("application/json")) {
    const nameMatch = content.match(/^name:\s*(.+)$/m);
    const descMatch = content.match(/^description:\s*(.+)$/m);
    res.json({
      id: req.params.id,
      name: nameMatch ? nameMatch[1].trim() : req.params.id,
      description: descMatch ? descMatch[1].trim() : "",
      content,
    });
  } else {
    res.type("text/markdown").send(content);
  }
});

// GET /skills/:id/references/:file  — return reference files
app.get("/skills/:id/references/:file", (req, res) => {
  const refPath = path.join(ROOT, req.params.id, "references", req.params.file);
  if (!fs.existsSync(refPath)) {
    return res.status(404).json({ error: "Reference file not found" });
  }
  res.type("text/markdown").send(fs.readFileSync(refPath, "utf8"));
});

// GET /shared/:file  — shared preflight / chain-support
app.get("/shared/:file", (req, res) => {
  const sharedPath = path.join(ROOT, "okx-agentic-wallet", "_shared", req.params.file);
  if (!fs.existsSync(sharedPath)) {
    return res.status(404).json({ error: "Shared file not found" });
  }
  res.type("text/markdown").send(fs.readFileSync(sharedPath, "utf8"));
});

// GET /health  — uptime check
app.get("/health", (req, res) => res.json({ status: "ok", uptime: process.uptime() }));

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
app.listen(PORT, () => {
  console.log(`\n🚀 XLayer Skills Registry running on port ${PORT}`);
  console.log(`   Skills: ${BASE_URL}/skills`);
  console.log(`   Example: ${BASE_URL}/skills/okx-crosschain-swap\n`);
});
