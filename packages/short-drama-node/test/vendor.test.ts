import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { resolve } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

const execute = promisify(execFile);
const root = resolve(import.meta.dirname, "../../../vendor/oh-my-short-drama");

test("内置短剧引擎通过能力覆盖与完整集成自检", async () => {
  await execute(process.execPath, ["--test",
    resolve(root, "scripts/native-audio-default.test.mjs"),
    resolve(root, "scripts/required-video-references.test.mjs"),
    resolve(root, "scripts/generation/production-plan-summary.test.mjs"),
  ], { cwd: root });
  const audit = await execute(process.execPath, [resolve(root, "scripts/audit-plugin.mjs")], { cwd: root });
  assert.equal(JSON.parse(audit.stdout).status, "covered");
  const integration = await execute(process.execPath, [resolve(root, "scripts/integration-self-check.mjs"), "--self-check"], { cwd: root, maxBuffer: 8 * 1024 * 1024 });
  assert.match(integration.stdout, /ok/u);
});
