// Builds chainpepu-lovable.zip – the full source tree ready to import into Lovable / GitHub.
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const outDir = path.join(root, "release");
const out = path.join(outDir, "chainpepu-lovable.zip");
mkdirSync(outDir, { recursive: true });
if (existsSync(out)) rmSync(out);
const excludes = ["node_modules/*", ".git/*", "dist/*", "release/*", "*.log", ".env", ".env.local", "supabase/.temp/*", ".DS_Store"];
const args = excludes.map((e) => `-x "${e}"`).join(" ");
execSync(`cd "${root}" && zip -qr "${out}" . ${args}`, { stdio: "inherit" });
console.log(`✓ ${path.relative(root, out)}`);
