#!/usr/bin/env node

import { register } from "tsx/esm/api";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

if (process.argv.length === 3 && ["--version", "-v"].includes(process.argv[2])) {
  const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  console.log(manifest.version);
  process.exit(0);
}

const emitWarning = process.emitWarning;
process.emitWarning = function hypitWarning(warning, ...args) {
  const message = warning instanceof Error ? warning.message : String(warning);
  if (message === "SQLite is an experimental feature and might change at any time") return;
  return emitWarning.call(process, warning, ...args);
};

// 引导器与包激活必须使用同一个发行版物理根目录；Windows 短路径可能在普通解析中保留，
// 但包查找会通过 libuv 展开它，因此这里先统一成真实路径。
const distributionRoot = realpathSync.native(resolve(dirname(fileURLToPath(import.meta.url)), ".."));
const distributionUrl = pathToFileURL(distributionRoot + sep);
register();
const {
  installDistributionPackageResolution,
  installExternalPackageResolution,
} = await import(new URL("packages/package-loader-node/src/distribution-resolution.ts", distributionUrl).href);
installDistributionPackageResolution([distributionRoot]);
const { hypitHostPackageRoot } = await import(new URL("packages/runtime-host-node/src/index.ts", distributionUrl).href);
installExternalPackageResolution([hypitHostPackageRoot()]);
const args = process.argv.slice(2);
if (args[0] === "short-drama" || (args[0] === "help" && args[1] === "short-drama")) {
  const { runShortDramaCli } = await import(new URL("packages/short-drama-node/src/cli.ts", distributionUrl).href);
  try {
    const shortDramaArgs = args[0] === "help" ? ["help"] : args.slice(1);
    await runShortDramaCli(shortDramaArgs[0] === "tool" ? shortDramaArgs : shortDramaArgs.filter((arg) => arg !== "--debug"), {
      write: (text) => process.stdout.write(text),
    });
  } catch (error) {
    const { renderCliError } = await import(new URL("packages/cli/src/index.ts", distributionUrl).href);
    process.stderr.write(renderCliError(error, { debug: args.includes("--debug") }));
    process.exitCode = 1;
  }
} else if (args[0] === "studio" || (args[0] === "help" && args[1] === "studio")) {
  const { runStudio } = await import(new URL("packages/studio/start.ts", distributionUrl).href);
  try {
    await runStudio(args[0] === "help" ? ["--help"] : args.slice(1).filter((arg) => arg !== "--debug"), {
      write: (text) => process.stdout.write(text),
    });
  } catch (error) {
    const { renderCliError } = await import(new URL("packages/cli/src/index.ts", distributionUrl).href);
    process.stderr.write(renderCliError(error, { debug: args.includes("--debug") }));
    process.exitCode = 1;
  }
} else {
  await import(new URL("packages/video-cli/src/cli.ts", distributionUrl).href);
}
