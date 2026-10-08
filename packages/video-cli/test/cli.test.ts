import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { runVideoCli, videoCliDistribution } from "@hypit/video-cli";
import { runCli as runCommand } from "@hypit/cli";
import { FileBuildResult, FileBuildResultRepository } from "@hypit/build-result";
import { artifactTypes } from "@hypit/artifact";
import type { BuildState } from "@hypit/protocol";

import { videoTestPackages } from "./packages.js";

const runCli = (
  argv: readonly string[],
  io: { readonly write: (text: string) => void },
) => runVideoCli([...argv, "--json"], io, videoTestPackages);

test("source package selection follows Run and Author imports", async () => {
  const root = await mkdtemp(join(tmpdir(), "hypit-cli-package-selection-"));
  try {
    await writeFile(join(root, "style.svs"), `<?svml using="@hypit/svs@1"?>\n<sheet version="1"/>`, "utf8");
    await writeFile(join(root, "main.svml"), `<?svml using="@hypit/markup@1"?>
<svml>
  <import from="@hypit/script@1"/>
  <import as="style" source="./style.svs"/>
  <script id="story"><line><HOST>Hello.</line></script>
</svml>`, "utf8");
    const run = join(root, "build.svrun");
    await writeFile(run, `<?svml using="@hypit/run-markup@1"?>
<svrun version="1">
  <author source="./main.svml"/>
  <target output="story"/>
</svrun>`, "utf8");
    const discovered = await videoCliDistribution.discoverSourcePackages!(run, {
      workspaceRoot: root,
      packages: videoTestPackages,
    });
    assert.deepEqual(discovered.selected, ["@hypit/run-markup", "@hypit/script", "@hypit/svs"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("provider-free example plans from installed Source packages", async () => {
  // The installed package preview exercises Timeline, composition and mux planning without
  // requiring a generation account or an authored project copy.
  const fixture = join(process.cwd(), "packages", "media-track", "preview");
  let output = "";
  await runCli([
    "plan",
    join(fixture, "build.svrun"),
    "--workspace",
    process.cwd(),
  ], { write: (text) => { output += text; } });
  const plan = JSON.parse(output) as {
    readonly format: string;
    readonly ok: boolean;
    readonly requestCount: number;
    readonly targets: readonly string[];
  };
  assert.equal(plan.format, "hypit.cli-plan@1");
  assert.equal(plan.ok, true);
  assert.equal(plan.requestCount > 0, true);
  assert.equal(plan.targets.length, 1);
});

test("depth-reference example plans depth conversion before H3 generation", async () => {
  const fixture = join(process.cwd(), "examples", "depth-guided-video-replication");
  for (const name of ["material.svrun", "production.svrun", "reuse-depth.svrun", "reuse-shot.svrun"]) {
    let checked = "";
    await runCli(["check", join(fixture, name), "--workspace", process.cwd()], {
      write: (text) => { checked += text; },
    });
    assert.equal((JSON.parse(checked) as { readonly sourceKind: string }).sourceKind, "run");
  }

  let output = "";
  await runCli(["plan", join(fixture, "material.svrun"), "--workspace", process.cwd()], {
    write: (text) => { output += text; },
  });
  const plan = JSON.parse(output) as {
    readonly ok: boolean;
    readonly requestCount: number;
    readonly needs: readonly {
      readonly capability: string;
      readonly summary: { readonly fields: Readonly<Record<string, string | number>>; readonly references: Readonly<Record<string, number>> };
      readonly pending: readonly { readonly input: string; readonly sourceStep?: string }[];
    }[];
  };
  assert.equal(plan.ok, true);
  assert.equal(plan.requestCount, 2);
  assert.deepEqual(plan.needs.map((request) => request.capability), [
    "@hypit/depth-video@1#depth-video",
    "@hypit/minimax-h3@1#minimax-h3",
  ]);
  const h3 = plan.needs.find((request) => request.capability === "@hypit/minimax-h3@1#minimax-h3")!;
  assert.equal(h3.summary.references.image, 5);
  assert.equal(h3.summary.references.audio, 1);
  assert.equal(h3.pending.some((input) => input.input === "referenceVideo"
    && decodeURIComponent(input.sourceStep ?? "").includes("depth-map:select-primary-video")), true);

  let runtimeOutput = "";
  await runCommand([
    "plan", join(fixture, "production.svrun"), "--workspace", process.cwd(),
    "--runtime", join(fixture, "hypit.runtime.json"), "--json",
  ], { write: (text) => { runtimeOutput += text; } }, videoCliDistribution);
  const runtimePlan = JSON.parse(runtimeOutput) as {
    readonly requestIssueCount: number;
    readonly providers: readonly { readonly capability: string; readonly endpoint?: string; readonly status: string }[];
  };
  assert.equal(runtimePlan.requestIssueCount, 0);
  for (const capability of ["@hypit/depth-video@1#depth-video", "@hypit/minimax-h3@1#minimax-h3"]) {
    const provider = runtimePlan.providers.find((item) => item.capability === capability)!;
    assert.deepEqual({ endpoint: provider.endpoint, status: provider.status }, { endpoint: "runninghub.default", status: "resolved" });
  }

  const root = await mkdtemp(join(tmpdir(), "hypit-depth-reference-reuse-"));
  try {
    const copied = join(root, "examples", "depth-guided-video-replication");
    await mkdir(join(root, "examples"), { recursive: true });
    await cp(fixture, copied, { recursive: true });
    await mkdir(join(root, "examples", "interview", "assets"), { recursive: true });
    await cp(join(process.cwd(), "examples", "interview", "assets", "chad.wav"),
      join(root, "examples", "interview", "assets", "chad.wav"));

    const copiedSource = join(copied, "depth-reference.svml");
    const source = await readFile(copiedSource, "utf8");
    await writeFile(copiedSource, source.replace("We made it. Keep moving.", "The Script now carries a deliberately longer replacement line."), "utf8");
    let changedOutput = "";
    await runCli(["plan", join(copied, "material.svrun"), "--workspace", root], {
      write: (text) => { changedOutput += text; },
    });
    const changedPlan = JSON.parse(changedOutput) as { readonly needs: readonly { readonly capability: string; readonly summary: { readonly fields: Readonly<Record<string, string | number>> } }[] };
    const changedH3 = changedPlan.needs.find((request) => request.capability === "@hypit/minimax-h3@1#minimax-h3")!;
    assert.notEqual(changedH3.summary.fields.prompt, h3.summary.fields.prompt);

    await writeFile(copiedSource, source.replace("The accepted speech timing owns event speech-start and event speech-end.", "A deliberately expanded semantic event contract now owns speech-start, speech-end, reaction-settled and edit-out."), "utf8");
    let retimedOutput = "";
    await runCli(["plan", join(copied, "material.svrun"), "--workspace", root], { write: (text) => { retimedOutput += text; } });
    const retimedPlan = JSON.parse(retimedOutput) as { readonly needs: readonly { readonly capability: string; readonly summary: { readonly fields: Readonly<Record<string, string | number>> } }[] };
    const retimedH3 = retimedPlan.needs.find((request) => request.capability === "@hypit/minimax-h3@1#minimax-h3")!;
    assert.notEqual(retimedH3.summary.fields.prompt, h3.summary.fields.prompt);

    const bytes = new Uint8Array([1, 2, 3]);
    const result = await FileBuildResult.create(join(root, ".hypit", "results"), {
      id: "bld_20260923T000000000Z_0000000001",
      source: { path: join(copied, "depth-reference.svml") },
      run: { path: join(copied, "material.svrun") },
      targets: ["depth-map.video", "generated-shot.video"],
      publishedOutputs: [
        { name: "depth-map.video", output: "logical:depth" },
        { name: "generated-shot.video", output: "logical:shot" },
      ],
    });
    await result.sync({
      state: {
        status: "complete",
        records: ["depth", "shot"].map((name) => ({
          id: `record:${name}`, type: artifactTypes.blob,
          value: { kind: "blob", resource: `res_${name}`, size: bytes.byteLength, mediaType: "video/mp4" },
        })),
        plan: { outputBindings: [
          { output: "logical:depth", record: "record:depth", type: artifactTypes.blob },
          { output: "logical:shot", record: "record:shot", type: artifactTypes.blob },
        ] },
      } as unknown as BuildState,
      resources: { async open() { return (async function* () { yield bytes; })(); } },
    });
    await result.finish({ outcome: "complete" });

    const distribution = {
      ...videoCliDistribution,
      bootstrapPackages: videoTestPackages,
      async openProjectResults() {
        return {
          location: { root, selection: { use: "test.results", config: {} } },
          repository: new FileBuildResultRepository(join(root, ".hypit", "results")),
          close() {},
        };
      },
    };
    const plannedCapabilities = async (name: string) => {
      let text = "";
      await runCommand(["plan", join(copied, name), "--workspace", root, "--json"], {
        write: (value) => { text += value; },
      }, distribution);
      return (JSON.parse(text) as { readonly needs: readonly { readonly capability: string }[] }).needs.map((need) => need.capability);
    };
    assert.deepEqual(await plannedCapabilities("reuse-depth.svrun"), ["@hypit/minimax-h3@1#minimax-h3"]);
    const reusedShot = await plannedCapabilities("reuse-shot.svrun");
    assert.equal(reusedShot.includes("@hypit/depth-video@1#depth-video"), false);
    assert.equal(reusedShot.includes("@hypit/minimax-h3@1#minimax-h3"), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("check compiles a data-only package Source export without a project copy", async () => {
  const root = await mkdtemp(join(tmpdir(), "hypit-cli-package-source-"));
  try {
    const kitRoot = join(root, "packages", "image-kits");
    await mkdir(join(kitRoot, "kits"), { recursive: true });
    await writeFile(join(kitRoot, "package.json"), JSON.stringify({
      name: "@acme/image-kits",
      version: "1.0.0",
      type: "module",
      exports: { "./ugc-v1": "./kits/ugc-v1.svs" },
    }), "utf8");
    await writeFile(join(kitRoot, "kits", "ugc-v1.svs"), `<?svml using="@hypit/text/svs@1"?>
<sheet version="1" id="ugc-v1">
  text-template.ugc-v1 { separator: paragraph; }
  text-template.ugc-v1.block.direction { kind: slot; order: 10; slot: direction; optional: false; }
</sheet>`, "utf8");
    const source = join(root, "main.svml");
    await writeFile(source, `<?svml using="@hypit/markup@1"?>
<svml>
  <import as="text" from="@hypit/text@1"/>
  <import as="kit" source="@acme/image-kits/ugc-v1"/>
  <text:Value id="direction">A useful photographed scene.</text:Value>
  <text:Render id="prompt" template={kit.ugc-v1}>
    <text:Set name="direction" text={direction}/>
  </text:Render>
</svml>`, "utf8");
    let output = "";
    await runCli(["check", source, "--workspace", root], {
      write: (text) => { output += text; },
    });
    const checked = JSON.parse(output) as { readonly sourceKind: string; readonly units: number };
    assert.equal(checked.sourceKind, "author");
    assert.equal(checked.units, 2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("check resolves every packaged preproduction and recreation Prompt Kit", async () => {
  const root = await mkdtemp(join(tmpdir(), "hypit-cli-production-kits-"));
  try {
    const source = join(root, "main.svml");
    await writeFile(source, `<?svml using="@hypit/markup@1"?>
<svml>
  <import as="text" from="@hypit/text@1"/>
  <import as="assets" source="@hypit/gpt-image-kits/asset-sheet"/>
  <import as="boards" source="@hypit/gpt-image-kits/storyboard"/>
  <import as="story-text" source="@hypit/gpt-image-kits/story-text-frame"/>
  <import as="seedance-shot" source="@hypit/seedance-kits/recreation-shot"/>
  <import as="h3-shot" source="@hypit/minimax-h3/reference-shot"/>
  <text:Value id="base">Approved production direction.</text:Value>
  <text:Value id="continuity">The ending state is stable.</text:Value>
  <text:Value id="references">References follow the selected Endpoint syntax.</text:Value>
  <text:Value id="sound">Joint native picture and sound.</text:Value>
  <text:Render id="asset" template={assets.asset-sheet-v1}><text:Set name="asset" text={base}/></text:Render>
  <text:Render id="board" template={boards.storyboard-v1}><text:Set name="shot" text={base}/><text:Set name="continuity" text={continuity}/></text:Render>
  <text:Render id="story-text-frame" template={story-text.story-text-frame-v1}><text:Set name="text" text={base}/><text:Set name="appearance" text={base}/><text:Set name="composition" text={base}/></text:Render>
  <text:Render id="seedance" template={seedance-shot.recreation-shot-v1}><text:Set name="depth-video" text={references}/><text:Set name="temporal-storyboard" text={references}/><text:Set name="shot-board" text={references}/><text:Set name="audio-reference" text={references}/><text:Set name="video-prompt" text={base}/><text:Set name="timing" text={base}/><text:Set name="continuity" text={continuity}/><text:Set name="sound" text={sound}/></text:Render>
  <text:Render id="h3" template={h3-shot.reference-shot-v1}><text:Set name="subject-definitions" text={base}/><text:Set name="depth-video" text={references}/><text:Set name="temporal-storyboard" text={references}/><text:Set name="shot-board" text={references}/><text:Set name="audio-reference" text={references}/><text:Set name="summary" text={base}/><text:Set name="retention-analysis" text={base}/><text:Set name="detailed-description" text={base}/><text:Set name="overall-soundscape" text={sound}/><text:Set name="non-diegetic-music" text={base}/></text:Render>
</svml>`, "utf8");
    let output = "";
    await runCli(["check", source, "--workspace", root], { write: (text) => { output += text; } });
    const checked = JSON.parse(output) as { readonly sourceKind: string };
    assert.equal(checked.sourceKind, "author");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("pricing keeps every planned generation after the old 20-request cutoff and exposes authored parameters", async () => {
  const root = await mkdtemp(join(tmpdir(), "hypit-pricing-"));
  try {
    const ids = Array.from({ length: 25 }, (_, index) => `portrait-${index}`);
    await writeFile(join(root, "main.svml"), `<?svml using="@hypit/markup@1"?>
<svml>
  <import as="copy" from="@hypit/text@1"/>
  <import as="gpt" from="@hypit/gpt-image@1"/>
  ${ids.map((id) => `<copy:Value id="${id}-prompt">An original ${id}.</copy:Value>
  <gpt:Image id="${id}" prompt={${id}-prompt} aspect-ratio="9:16" resolution="2K"/>`).join("\n")}
</svml>`);
    const source = join(root, "build.svrun");
    await writeFile(source, `<?svml using="@hypit/run-markup@1"?>
<svrun version="1"><author source="./main.svml"/>
  ${ids.map((id) => `<target output="${id}.image"/>`).join("\n")}
</svrun>`);
    let queried = 0;
    let output = "";
    await runCommand(["pricing", source, "--workspace", root, "--runtime", join(root, "runtime.json"),
      "--json", "--limit", "1"], { write: (text) => { output += text; } }, {
      ...videoCliDistribution,
      bootstrapPackages: videoTestPackages,
      openRuntimeHost: async (path, options) => ({
        ...await videoCliDistribution.openRuntimeHost(path, options),
        pricing: async (requests) => {
          queried = requests.length;
          return requests.map((request) => ({
            request: request.request, capability: request.capability, status: "resolved" as const,
            endpoint: "test.vendor", use: "test.provider",
            pricingDocuments: [{ source: "https://vendor.example/rates", data: { creditsPerImage: 2 } }],
          }));
        },
        createRuntime: async () => { throw new Error("pricing cannot execute a Build"); },
      }),
    });
    const report = JSON.parse(output);
    assert.equal(queried, 25);
    assert.equal(report.format, "hypit.cli-pricing@1");
    assert.equal(report.requestCount, 25);
    assert.equal(report.groups.length, 1);
    const group = report.groups[0];
    assert.equal(group.requests.length, 25);
    assert.deepEqual(group.pricingDocuments[0].data, { creditsPerImage: 2 });
    for (const request of group.requests) {
      assert.equal(request.summary.fields.resolution, "2K");
      assert.equal(request.summary.fields.aspectRatio, "9:16");
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
