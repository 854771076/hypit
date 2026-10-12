import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
const tarball = resolve(root, `dist/release/hypit-hypit-${manifest.version}.tgz`);
const npmCli = process.env.npm_execpath;
if (!npmCli?.endsWith("npm-cli.js")) {
  throw new Error("Run npm run install:local to install this checkout.");
}
function npm(args, capture = false) {
  return execFileSync(process.execPath, [npmCli, ...args], {
    cwd: root, encoding: "utf8", stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit",
  });
}

npm(["run", "pack:distribution"]);
npm(["install", "--global", tarball, "--prefer-offline", "--no-audit", "--no-fund"]);
const prefix = npm(["prefix", "--global"], true).trim();
const distribution = process.platform === "win32"
  ? resolve(prefix, "node_modules/@hypit/hypit")
  : resolve(prefix, "lib/node_modules/@hypit/hypit");
const launcher = resolve(distribution, "bin/hypit.mjs");
const report = JSON.parse(execFileSync(process.execPath, [launcher, "version", "--json"], {
  cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"],
}));
assert.equal(report.package, manifest.name);
assert.equal(report.version, manifest.version);
assert.equal(report.distribution, distribution);
assert.equal(report.launcher, launcher);
console.log(`Installed local checkout ${manifest.name}@${manifest.version}\nDistribution: ${distribution}\nLauncher: ${launcher}`);
