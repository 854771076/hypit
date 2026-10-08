import assert from "node:assert/strict";
import test from "node:test";
import { sealDepthVideoRequest } from "../src/index.js";

const source = { kind: "blob" as const, resource: "res_depth-source" as const, size: 4, mediaType: "video/mp4" };

test("depth video requires exactly one video", () => {
  assert.equal(sealDepthVideoRequest({ source: [{ role: "video", artifact: source }] }).ports.source?.length, 1);
  assert.throws(() => sealDepthVideoRequest({ source: [] }), /source/u);
  assert.throws(() => sealDepthVideoRequest({ source: [
    { role: "video", artifact: source },
    { role: "video", artifact: { ...source, resource: "res_depth-source-2" } },
  ] }), /at most 1|source/u);
  assert.throws(() => sealDepthVideoRequest({ source: [{ role: "image", artifact: { ...source, mediaType: "image/png" } }] }), /video|role/u);
});
