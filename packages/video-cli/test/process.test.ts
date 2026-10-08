import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { runProcess } from "../src/process.js";

test("a timed-out process leaves no descendant running", { skip: process.platform === "win32" }, async () => {
  const work = await mkdtemp(join(tmpdir(), "hypit-process-tree-"));
  const pidFile = join(work, "descendant.pid");
  let descendant: number | undefined;
  try {
    const script = `
      const { spawn } = require("node:child_process");
      const { writeFileSync } = require("node:fs");
      const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "ignore" });
      writeFileSync(process.argv[1], String(child.pid));
      setInterval(() => {}, 1000);
    `;
    await assert.rejects(runProcess(process.execPath, ["-e", script, pidFile], 300), /timed out/iu);
    descendant = Number(await readFile(pidFile, "utf8"));
    assert.throws(() => process.kill(descendant!, 0), /ESRCH|no such process/iu);
  } finally {
    if (descendant !== undefined) {
      try { process.kill(descendant, "SIGKILL"); } catch {}
    }
    await rm(work, { recursive: true, force: true });
  }
});
