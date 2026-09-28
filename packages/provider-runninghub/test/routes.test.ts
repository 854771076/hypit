import assert from "node:assert/strict";
import test from "node:test";
import type { BlobRef, CanonicalValue } from "@hypit/protocol";
import { sealMinimaxH3Request } from "@hypit/minimax-h3";
import { sealDepthVideoRequest } from "@hypit/depth-video";

import { runningHubRouteForCapability } from "../src/routes.js";

const image: BlobRef = { kind: "blob", resource: "res_first", size: 3, mediaType: "image/png" };

test("MiniMax H3 request becomes RunningHub workflow inputs", () => {
  const route = runningHubRouteForCapability({ module: { name: "@hypit/minimax-h3", version: "1" }, name: "minimax-h3" })!;
  const request = sealMinimaxH3Request({
    prompt: ["move"], duration: [6], resolution: ["2K"],
    firstFrame: [{ role: "image", artifact: image }],
  });
  const prepared = route.prepare(request as unknown as CanonicalValue);
  assert.equal(prepared.workflowId, "2086743729407733762");
  assert.deepEqual(prepared.inputs, {
    kind: "minimax-h3",
    prompt: "move", duration: 6, aspectRatio: "16:9 (Widescreen)", megapixels: 2,
    assets: [image],
  });
});

test("RunningHub normalizes four seconds and rejects a third video reference", () => {
  const route = runningHubRouteForCapability({ module: { name: "@hypit/minimax-h3", version: "1" }, name: "minimax-h3" })!;
  const short = sealMinimaxH3Request({ prompt: ["move"], duration: [4], resolution: ["768P"] });
  const prepared = route.prepare(short as unknown as CanonicalValue).inputs;
  assert.equal(prepared.kind === "minimax-h3" ? prepared.duration : undefined, 5);
  const videos = [0, 1, 2].map((index) => ({ role: "video" as const, artifact: { ...image, resource: `res_video_${index}` as const, mediaType: "video/mp4" } }));
  const crowded = sealMinimaxH3Request({ prompt: ["move"], duration: [5], referenceVideo: videos });
  assert.equal(route.supports({ capability: route.capability, returns: route.returns, constraints: crowded as unknown as CanonicalValue }).status, "unsupported");
  const oversized = sealMinimaxH3Request({ prompt: ["move"], duration: [5], referenceVideo: [{ role: "video", artifact: { ...videos[0]!.artifact, size: 200 * 1024 * 1024 + 1 } }] });
  assert.equal(route.supports({ capability: route.capability, returns: route.returns, constraints: oversized as unknown as CanonicalValue }).status, "unsupported");
  const pending = { ...short, ports: { ...short.ports, referenceVideo: [{ role: "video" }] } };
  assert.equal(route.supports({ capability: route.capability, returns: route.returns, constraints: pending as unknown as CanonicalValue }).status, "supported");
  assert.throws(() => route.prepare(pending as unknown as CanonicalValue), /referenceVideo\[0\] reference is unresolved/u);
});

test("depth video uses the fixed RunningHub workflow", () => {
  const route = runningHubRouteForCapability({ module: { name: "@hypit/depth-video", version: "1" }, name: "depth-video" })!;
  const source: BlobRef = { ...image, resource: "res_depth", mediaType: "video/mp4" };
  const prepared = route.prepare(sealDepthVideoRequest({ source: [{ role: "video", artifact: source }] }) as unknown as CanonicalValue);
  assert.equal(prepared.workflowId, "2098674379113979905");
  assert.deepEqual(prepared.inputs, { kind: "depth-video", assets: [source] });
  const oversized = sealDepthVideoRequest({ source: [{ role: "video", artifact: { ...source, size: 200 * 1024 * 1024 + 1 } }] });
  assert.equal(route.supports({ capability: route.capability, returns: route.returns, constraints: oversized as unknown as CanonicalValue }).status, "unsupported");
  const pending = { ...oversized, ports: { ...oversized.ports, source: [{ role: "video" }] } };
  assert.equal(route.supports({ capability: route.capability, returns: route.returns, constraints: pending as unknown as CanonicalValue }).status, "supported");
  assert.throws(() => route.prepare(pending as unknown as CanonicalValue), /source\[0\] reference is unresolved/u);
});
