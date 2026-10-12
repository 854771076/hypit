import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("本地安装只安装当前仓库打出的 tarball", async (context) => {
  const temporary = await mkdtemp(join(tmpdir(), "hypit-install-local-"));
  context.after(async () => await rm(temporary, { recursive: true, force: true }));
  const npmCli = join(temporary, "npm-cli.js");
  const log = join(temporary, "npm-calls.jsonl");
  const prefix = join(temporary, "prefix");
  await writeFile(npmCli, `
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
const args = process.argv.slice(2);
appendFileSync(process.env.FAKE_NPM_LOG, JSON.stringify(args) + "\\n");
const manifest = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));
const distribution = process.platform === "win32"
  ? join(process.env.FAKE_NPM_PREFIX, "node_modules", "@hypit", "hypit")
  : join(process.env.FAKE_NPM_PREFIX, "lib", "node_modules", "@hypit", "hypit");
if (args[0] === "run") {
  const tarball = join(process.cwd(), "dist", "release", "hypit-hypit-" + manifest.version + ".tgz");
  mkdirSync(dirname(tarball), { recursive: true });
  writeFileSync(tarball, "local tarball");
} else if (args[0] === "install") {
  mkdirSync(join(distribution, "bin"), { recursive: true });
  writeFileSync(join(distribution, "package.json"), JSON.stringify({ name: "@hypit/hypit", version: manifest.version }));
  const report = JSON.stringify({ package: manifest.name, version: manifest.version, distribution, launcher: join(distribution, "bin", "hypit.mjs") });
  writeFileSync(join(distribution, "bin", "hypit.mjs"), "console.log(" + JSON.stringify(report) + ")");
} else if (args[0] === "prefix") process.stdout.write(process.env.FAKE_NPM_PREFIX);
`, "utf8");

  const result = spawnSync(process.execPath, [resolve("scripts/install-local.mjs")], {
    cwd: resolve("."),
    encoding: "utf8",
    env: { ...process.env, npm_execpath: npmCli, FAKE_NPM_LOG: log, FAKE_NPM_PREFIX: prefix },
  });
  assert.equal(result.status, 0, result.stderr);
  const { version } = JSON.parse(await readFile(resolve("package.json"), "utf8")) as { version: string };
  const calls = (await readFile(log, "utf8")).trim().split("\n").map((line) => JSON.parse(line) as string[]);
  assert.deepEqual(calls[0], ["run", "pack:distribution"]);
  assert.equal(calls[1]?.[0], "install");
  assert.equal(calls[1]?.[1], "--global");
  assert.equal(calls[1]?.[2], resolve(`dist/release/hypit-hypit-${version}.tgz`));
  assert.equal(calls[1]?.includes("--prefer-offline"), true);
  assert.equal(calls[1]?.includes("@hypit/hypit"), false);
  assert.deepEqual(calls[2], ["prefix", "--global"]);
  assert.match(result.stdout, new RegExp(`Installed local checkout @hypit/hypit@${version.replaceAll(".", "\\.")}`, "u"));
});
