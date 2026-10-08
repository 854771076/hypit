import assert from "node:assert/strict";
import test from "node:test";
import { assertMappingCoversPorts } from "@hypit/generation";
import type { BlobRef, CanonicalValue } from "@hypit/protocol";
import { gptImage2Ports } from "@hypit/gpt-image";
import { sealGptImage2Request } from "@hypit/gpt-image";
import { sealMinimaxH3Request } from "@hypit/minimax-h3";
import { minimaxH3Ports } from "@hypit/minimax-h3";
import { sealSeedanceRequest } from "@hypit/seedance";
import { seedancePorts } from "@hypit/seedance";

import { starRouterMappings } from "../src/mapping.js";
import { starRouterRouteForCapability } from "../src/routes.js";

const image: BlobRef = { kind: "blob", resource: "res_image", size: 3, mediaType: "image/png" };
const video: BlobRef = { kind: "blob", resource: "res_video", size: 3, mediaType: "video/mp4" };
const audio: BlobRef = { kind: "blob", resource: "res_audio", size: 3, mediaType: "audio/wav" };
const resolve = async (artifact: BlobRef) => `https://example.test/${artifact.resource}`;

test("every StarRouter mapping covers its model ports", () => {
  const tables = { ...seedancePorts, "minimax-h3": minimaxH3Ports, "gpt-image-2": gptImage2Ports };
  for (const mapping of starRouterMappings) assertMappingCoversPorts(tables[mapping.capability.name as keyof typeof tables], mapping);
});

test("MiniMax H3 request becomes StarRouter multimodal content", async () => {
  const route = starRouterRouteForCapability({ module: { name: "@hypit/minimax-h3", version: "1" }, name: "minimax-h3" })!;
  const request = sealMinimaxH3Request({
    prompt: ["move"], duration: [6], resolution: ["2K"],
    firstFrame: [{ role: "image", artifact: image }],
    referenceVideo: [{ role: "video", artifact: video }],
    referenceAudio: [{ role: "audio", artifact: audio }],
  });
  assert.deepEqual(await route.prepare(request as unknown as CanonicalValue).compile(resolve), {
    model: "MiniMax-H3", prompt: "move", duration: 6, size: "2K",
    metadata: { content: [
      { type: "text", text: "move" },
      { type: "image_url", image_url: { url: "https://example.test/res_image" }, role: "first_frame" },
      { type: "video_url", video_url: { url: "https://example.test/res_video" }, role: "reference_video" },
      { type: "audio_url", audio_url: { url: "https://example.test/res_audio" }, role: "reference_audio" },
    ] },
  });
});

test("StarRouter validates image and Seedance request boundaries", async () => {
  const imageRoute = starRouterRouteForCapability({ module: { name: "@hypit/gpt-image", version: "1" }, name: "gpt-image-2" })!;
  const auto = sealGptImage2Request({ prompt: ["draw"], aspectRatio: ["auto"], resolution: ["1K"] });
  assert.equal(imageRoute.supports({ capability: imageRoute.capability, returns: imageRoute.returns, constraints: auto as unknown as CanonicalValue }).status, "unsupported");
  const oversized = sealGptImage2Request({ prompt: ["edit"], aspectRatio: ["1:1"], resolution: ["1K"], images: [{ role: "image", artifact: { ...image, size: 16 * 1024 * 1024 + 1 } }] });
  assert.equal(imageRoute.supports({ capability: imageRoute.capability, returns: imageRoute.returns, constraints: oversized as unknown as CanonicalValue }).status, "unsupported");
  const square4k = sealGptImage2Request({ prompt: ["draw"], aspectRatio: ["1:1"], resolution: ["4K"] });
  assert.equal((await imageRoute.prepare(square4k as unknown as CanonicalValue).compile(resolve)).size, "2880x2880");
  const pendingImage = { ...square4k, ports: { ...square4k.ports, images: [{ role: "image" }] } };
  assert.equal(imageRoute.supports({ capability: imageRoute.capability, returns: imageRoute.returns, constraints: pendingImage as unknown as CanonicalValue }).status, "supported");
  assert.throws(() => imageRoute.prepare(pendingImage as unknown as CanonicalValue), /images\[0\] reference is unresolved/u);

  const videoRoute = starRouterRouteForCapability({ module: { name: "@hypit/seedance", version: "1" }, name: "seedance-2" })!;
  const person = sealSeedanceRequest("seedance-2", {
    prompt: ["move @图片1"], duration: [5], resolution: ["720p"], aspectRatio: ["16:9"], generateAudio: [true], webSearch: [false],
    referenceImage: [{ role: "image", artifact: image, fields: { personReference: true } }],
  });
  assert.equal(videoRoute.supports({ capability: videoRoute.capability, returns: videoRoute.returns, constraints: person as unknown as CanonicalValue }).status, "supported");
  const missingLabel = sealSeedanceRequest("seedance-2", {
    prompt: ["move"], duration: [5], resolution: ["720p"], aspectRatio: ["16:9"], generateAudio: [true], webSearch: [false],
    referenceImage: [{ role: "image", artifact: image, fields: { personReference: false } }],
  });
  assert.equal(videoRoute.supports({ capability: videoRoute.capability, returns: videoRoute.returns, constraints: missingLabel as unknown as CanonicalValue }).status, "unsupported");
  const labelled = sealSeedanceRequest("seedance-2", {
    prompt: ["move @图片1"], duration: [5], resolution: ["720p"], aspectRatio: ["16:9"], generateAudio: [true], webSearch: [false],
    referenceImage: [{ role: "image", artifact: image, fields: { personReference: false } }],
  });
  assert.equal(videoRoute.supports({ capability: videoRoute.capability, returns: videoRoute.returns, constraints: labelled as unknown as CanonicalValue }).status, "supported");
  for (const prompt of ["move @图片10", "move @图片1 and @图片2", "move @图片01"]) {
    const invalidLabels = sealSeedanceRequest("seedance-2", {
      prompt: [prompt], duration: [5], resolution: ["720p"], aspectRatio: ["16:9"], generateAudio: [true], webSearch: [false],
      referenceImage: [{ role: "image", artifact: image, fields: { personReference: false } }],
    });
    assert.equal(videoRoute.supports({ capability: videoRoute.capability, returns: videoRoute.returns, constraints: invalidLabels as unknown as CanonicalValue }).status, "unsupported");
  }
  const videoReference = sealSeedanceRequest("seedance-2", {
    prompt: ["move @视频1"], duration: [5], resolution: ["720p"], aspectRatio: ["16:9"], generateAudio: [true], webSearch: [false],
    referenceVideo: [{ role: "video", artifact: { ...image, resource: "res_video", mediaType: "video/mp4" }, fields: { personReference: false } }],
  });
  assert.equal(videoRoute.supports({ capability: videoRoute.capability, returns: videoRoute.returns, constraints: videoReference as unknown as CanonicalValue }).status, "unsupported");
  for (const durationSeconds of [1, 16]) {
    const invalidDuration = sealSeedanceRequest("seedance-2", {
      prompt: ["move @视频1"], duration: [5], resolution: ["720p"], aspectRatio: ["16:9"], generateAudio: [true], webSearch: [false],
      referenceVideo: [{ role: "video", artifact: { ...image, resource: "res_video", mediaType: "video/mp4" }, fields: { personReference: false, durationSeconds } }],
    });
    assert.equal(videoRoute.supports({ capability: videoRoute.capability, returns: videoRoute.returns, constraints: invalidDuration as unknown as CanonicalValue }).status, "unsupported");
  }
  const missingVideoLabel = sealSeedanceRequest("seedance-2", {
    prompt: ["move"], duration: [5], resolution: ["720p"], aspectRatio: ["16:9"], generateAudio: [true], webSearch: [false],
    referenceVideo: [{ role: "video", artifact: { ...image, resource: "res_video", mediaType: "video/mp4" }, fields: { personReference: false, durationSeconds: 5 } }],
  });
  assert.equal(videoRoute.supports({ capability: videoRoute.capability, returns: videoRoute.returns, constraints: missingVideoLabel as unknown as CanonicalValue }).status, "unsupported");
  const audioReference = sealSeedanceRequest("seedance-2", {
    prompt: ["move @图片1 with @音频1"], duration: [5], resolution: ["720p"], aspectRatio: ["16:9"], generateAudio: [true], webSearch: [false],
    referenceImage: [{ role: "image", artifact: image, fields: { personReference: false } }],
    referenceAudio: [{ role: "audio", artifact: { ...image, resource: "res_audio", mediaType: "audio/wav" }, fields: { durationSeconds: 5 } }],
  });
  assert.equal(videoRoute.supports({ capability: videoRoute.capability, returns: videoRoute.returns, constraints: audioReference as unknown as CanonicalValue }).status, "supported");
  const missingAudioDuration = sealSeedanceRequest("seedance-2", {
    prompt: ["move @图片1 with @音频1"], duration: [5], resolution: ["720p"], aspectRatio: ["16:9"], generateAudio: [true], webSearch: [false],
    referenceImage: [{ role: "image", artifact: image, fields: { personReference: false } }],
    referenceAudio: [{ role: "audio", artifact: { ...image, resource: "res_audio", mediaType: "audio/wav" } }],
  });
  assert.equal(videoRoute.supports({ capability: videoRoute.capability, returns: videoRoute.returns, constraints: missingAudioDuration as unknown as CanonicalValue }).status, "unsupported");
  const oversizedVideo = sealSeedanceRequest("seedance-2", {
    prompt: ["move @视频1"], duration: [5], resolution: ["720p"], aspectRatio: ["16:9"], generateAudio: [true], webSearch: [false],
    referenceVideo: [{ role: "video", artifact: { ...image, resource: "res_video", size: 200 * 1024 * 1024 + 1, mediaType: "video/mp4" }, fields: { personReference: false, durationSeconds: 5 } }],
  });
  assert.equal(videoRoute.supports({ capability: videoRoute.capability, returns: videoRoute.returns, constraints: oversizedVideo as unknown as CanonicalValue }).status, "unsupported");
  const pendingVideo = { ...oversizedVideo, ports: { ...oversizedVideo.ports, referenceVideo: [{ role: "video", fields: { personReference: false, durationSeconds: 5 } }] } };
  assert.equal(videoRoute.supports({ capability: videoRoute.capability, returns: videoRoute.returns, constraints: pendingVideo as unknown as CanonicalValue }).status, "supported");
  assert.throws(() => videoRoute.prepare(pendingVideo as unknown as CanonicalValue), /referenceVideo\[0\] reference is unresolved/u);
});

test("StarRouter Seedance sends a character image and timed depth reference video", async () => {
  const route = starRouterRouteForCapability({ module: { name: "@hypit/seedance", version: "1" }, name: "seedance-2" })!;
  const video = { ...image, resource: "res_depth", mediaType: "video/mp4" } as BlobRef;
  const request = sealSeedanceRequest("seedance-2", {
    prompt: ["@图片1 defines the character. Follow @视频1 only for depth, motion and camera structure."],
    duration: [6], resolution: ["720p"], aspectRatio: ["9:16"], generateAudio: [false], webSearch: [false],
    referenceImage: [{ role: "image", artifact: image, fields: { personReference: true } }],
    referenceVideo: [{ role: "video", artifact: video, fields: { personReference: false, durationSeconds: 6 } }],
  });
  assert.equal(route.supports({ capability: route.capability, returns: route.returns, constraints: request as unknown as CanonicalValue }).status, "supported");
  assert.deepEqual(await route.prepare(request as unknown as CanonicalValue).compile(resolve), {
    model: "dreamina-seedance-2-0-260128",
    content: [
      { type: "text", text: "@图片1 defines the character. Follow @视频1 only for depth, motion and camera structure." },
      { type: "image_url", image_url: { url: "https://example.test/res_image" }, role: "reference_image" },
      { type: "video_url", video_url: { url: "https://example.test/res_depth" }, role: "reference_video" },
    ],
    duration: 6, resolution: "720p", ratio: "9:16", generate_audio: false, watermark: false,
  });
});
