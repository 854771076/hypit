import assert from "node:assert/strict";
import test from "node:test";

import { artifactTypes } from "@hypit/artifact";
import { parseStructuredElement } from "@hypit/markup";
import type { SurfaceResolvedReference } from "@hypit/markup";
import { textTypes } from "@hypit/text";

import { decodeMinimaxReferenceVideoSurface } from "../src/surface.js";

test("H3 ReferenceVideo preserves firstFrame beside full references", async () => {
  const references = new Map<string, SurfaceResolvedReference>([
    ["prompt", { path: "prompt", ref: { kind: "component-output", component: "prompt", output: "text" }, type: textTypes.text }],
    ...["tail.image", "actor.image", "motion.video", "voice.audio"].map((path) => [path, {
      path,
      ref: { kind: "component-output" as const, component: path.split(".")[0]!, output: path.split(".")[1]! },
      type: artifactTypes.blob,
    }] as const),
  ]);
  const source = `<h3:ReferenceVideo id="shot" prompt={prompt} duration="5" resolution="768P" aspect-ratio="9:16" first-frame={tail.image}>
    <h3:Reference image={actor.image}/>
    <h3:Reference video={motion.video}/>
    <h3:Reference audio={voice.audio}/>
  </h3:ReferenceVideo>`;
  const element = parseStructuredElement({ name: "h3.svml", text: source }, 0).element;
  const result = await decodeMinimaxReferenceVideoSurface({
    sourceName: "h3.svml",
    element,
    resolveReference: (path) => references.get(path),
    resolveAsset: () => { throw new Error("no asset"); },
  });
  const bindings = result.records.filter((record) => record.id.endsWith(".binding"));
  assert.equal(bindings.length, 4);
  assert.match(bindings[0]!.type.name, /FirstFrame/u);
  assert.deepEqual(result.components[0]!.inputs["media-0001:artifact"], references.get("tail.image")!.ref);
});

test("H3 ReferenceVideo does not accept a first frame without subject references", () => {
  const references = new Map<string, SurfaceResolvedReference>([
    ["direction", { path: "direction", ref: { kind: "component-output", component: "direction", output: "text" }, type: textTypes.text }],
    ["first.image", { path: "first.image", ref: { kind: "component-output", component: "first", output: "image" }, type: artifactTypes.blob }],
  ]);
  const element = parseStructuredElement({ name: "h3.svml", text: '<h3:ReferenceVideo id="continued" prompt={direction} duration="5" first-frame={first.image}/>' }, 0).element;
  assert.throws(
    () => decodeMinimaxReferenceVideoSurface({ sourceName: "h3.svml", element, resolveReference: (path) => references.get(path), resolveAsset: () => { throw new Error("no asset"); } }),
    /requires at least one Reference/,
  );
});
