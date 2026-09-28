import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { runShortDramaCli } from "../src/cli.js";

test("短剧 CLI 使用完整项目合同初始化、恢复并路由当前模块", async (context) => {
  const root = await mkdtemp(join(tmpdir(), "hypit-short-drama-cli-"));
  context.after(async () => await rm(root, { recursive: true, force: true }));
  let output = "";
  const io = { write: (text: string) => { output += text; } };

  await runShortDramaCli(["init", "cli-demo", "--profile", "viral-recreation", "--workspace", root], io);
  const project = JSON.parse(await readFile(join(root, ".short-drama/project.json"), "utf8"));
  assert.equal(project.workflow.type, "viral-recreation");
  assert.equal(project.key, "cli-demo");

  output = "";
  await runShortDramaCli(["status", "--workspace", root], io);
  assert.equal(JSON.parse(output).stage, "analysis");
  output = "";
  await runShortDramaCli(["modules", "required", "analysis", "--workspace", root], io);
  const modules = JSON.parse(output);
  assert.equal(modules.includes("analyze-reference-video"), true);
  assert.equal(modules.includes("design-video-recreation"), true);
});

test("短剧 CLI 拒绝未知选项和错误参数", async () => {
  await assert.rejects(runShortDramaCli(["status", "--wat"], { write() {} }), /不接受位置参数/u);
  await assert.rejects(runShortDramaCli(["status", "--workspace", ".", "--workspace", "."], { write() {} }), /只能出现一次/u);
  await assert.rejects(runShortDramaCli(["advance"], { write() {} }), /目标阶段/u);
  await assert.rejects(runShortDramaCli(["preflight"], { write() {} }), /需要/u);
  await assert.rejects(runShortDramaCli(["unknown"], { write() {} }), /未知 short-drama 命令/u);
});
