import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type Io = { readonly write: (text: string) => void };

const factoryRoot = fileURLToPath(new URL("../../../vendor/oh-my-short-drama/", import.meta.url));

async function run(script: string, args: readonly string[], io: Io): Promise<void> {
  const path = resolve(factoryRoot, "scripts", script);
  const fromScripts = relative(resolve(factoryRoot, "scripts"), path);
  if (fromScripts.startsWith("..") || isAbsolute(fromScripts) || !script.endsWith(".mjs")) throw new Error("短剧工具路径无效");
  await new Promise<void>((done, reject) => {
    const child = spawn(process.execPath, [path, ...args], { cwd: process.cwd(), env: { ...process.env, CODEX_PLUGIN_ROOT: factoryRoot }, stdio: ["inherit", "pipe", "pipe"] });
    let error = "";
    child.stdout.setEncoding("utf8").on("data", (text: string) => io.write(text));
    child.stderr.setEncoding("utf8").on("data", (text: string) => { error += text; });
    child.once("error", reject);
    child.once("close", (code, signal) => code === 0 ? done() : reject(new Error(error.trim() || `${script} 失败（${signal ?? code}）`)));
  });
}

function parse(argv: readonly string[]): { readonly positionals: readonly string[]; readonly workspace: string; readonly profile: "standard" | "viral-recreation" } {
  const positionals: string[] = [];
  let workspace = process.cwd();
  let profile: "standard" | "viral-recreation" = "standard";
  let hasWorkspace = false;
  let hasProfile = false;
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]!;
    if (value === "--workspace") {
      if (hasWorkspace) throw new Error("--workspace 只能出现一次");
      if (argv[index + 1] === undefined) throw new Error("--workspace 缺少值");
      hasWorkspace = true;
      workspace = resolve(argv[++index]!);
    } else if (value === "--profile") {
      if (hasProfile) throw new Error("--profile 只能出现一次");
      const selected = argv[++index];
      if (selected !== "standard" && selected !== "viral-recreation") throw new Error("--profile 必须是 standard 或 viral-recreation");
      hasProfile = true;
      profile = selected;
    } else positionals.push(value);
  }
  return { positionals, workspace: resolve(workspace), profile };
}

export function writeShortDramaHelp(io: Io): void {
  io.write(`hypit short-drama
  init <project-id> [--profile standard|viral-recreation] [--workspace <project-directory>]
  status|check|validate [--workspace <project-directory>]
  advance|rewind <stage> [--workspace <project-directory>]
  finish [--workspace <project-directory>]
  modules <required|record|record-stage|list|migrate> [...] [--workspace <project-directory>]
  project <project-store command> [...] [--workspace <project-directory>]
  preflight <init|media|editing> [--workspace <project-directory>]
  dashboard [--workspace <project-directory>]
  tool <relative-script.mjs> [raw script arguments...]
`);
}

export async function runShortDramaCli(argv: readonly string[], io: Io): Promise<void> {
  if (argv.length === 0 || argv.includes("--help") || argv[0] === "help") { writeShortDramaHelp(io); return; }
  const command = argv[0]!;
  const { positionals, workspace, profile } = parse(argv.slice(1));
  if (command === "init") {
    if (positionals.length !== 1) throw new Error("init 需要一个 project-id");
    const temporary = await mkdtemp(join(tmpdir(), "hypit-short-drama-init-"));
    try {
      const metadata = join(temporary, "project.json");
      await writeFile(metadata, `${JSON.stringify({ key: positionals[0], title: positionals[0], workflow: { type: profile, version: 1 } }, null, 2)}\n`, "utf8");
      await run("project-store.mjs", ["init", workspace, metadata], io);
    } finally { await rm(temporary, { recursive: true, force: true }); }
    return;
  }
  if (command === "status" || command === "check") {
    if (positionals.length !== 0) throw new Error(`${command} 不接受位置参数`);
    await run("workflow.mjs", [command, workspace], io);
    return;
  }
  if (command === "validate") {
    if (positionals.length !== 0) throw new Error("validate 不接受位置参数");
    await run("validate-project.mjs", [workspace], io);
    return;
  }
  if (command === "advance" || command === "rewind") {
    if (positionals.length !== 1) throw new Error(`${command} 需要一个目标阶段`);
    await run("workflow.mjs", [command, workspace, positionals[0]!], io);
    return;
  }
  if (command === "finish") {
    if (positionals.length !== 0) throw new Error("finish 不接受位置参数");
    await run("workflow.mjs", ["complete", workspace], io);
    return;
  }
  if (command === "modules") {
    if (positionals.length === 0) throw new Error("modules 需要子命令");
    await run("module-runs.mjs", [positionals[0]!, workspace, ...positionals.slice(1)], io);
    return;
  }
  if (command === "project") {
    if (positionals.length === 0) throw new Error("project 需要 project-store 子命令");
    await run("project-store.mjs", [positionals[0]!, workspace, ...positionals.slice(1)], io);
    return;
  }
  if (command === "preflight") {
    if (positionals.length !== 1) throw new Error("preflight 需要 init、media 或 editing");
    await run("preflight.mjs", [positionals[0]!, workspace], io);
    return;
  }
  if (command === "dashboard") {
    if (positionals.length !== 0) throw new Error("dashboard 不接受位置参数");
    await run("studio.mjs", ["open-project", workspace], io);
    return;
  }
  if (command === "tool") {
    if (positionals.length === 0) throw new Error("tool 需要脚本相对路径");
    await run(positionals[0]!, positionals.slice(1), io);
    return;
  }
  throw new Error(`未知 short-drama 命令：${command}`);
}
