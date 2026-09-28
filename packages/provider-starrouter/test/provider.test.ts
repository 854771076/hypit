import assert from "node:assert/strict";
import test from "node:test";
import { EndpointRegistry, MemoryResourceStore } from "@hypit/driver-node";
import { gptImageEndpoints, sealGptImage2Request } from "@hypit/gpt-image";
import { sealMinimaxH3Request, minimaxH3Endpoints } from "@hypit/minimax-h3";
import { sealSeedanceRequest, seedanceEndpointsByModel } from "@hypit/seedance";
import type { CanonicalValue, Need } from "@hypit/protocol";

import { createStarRouterProvider } from "../src/provider.js";
import type { CreateStarRouterProviderOptions } from "../src/provider.js";

async function endpointFor(request: Need, fetch: typeof globalThis.fetch, options: Partial<CreateStarRouterProviderOptions> = {}) {
  const registry = new EndpointRegistry();
  await createStarRouterProvider({ ...options, fetch, pollIntervalMs: 0 }).install(registry);
  const resolution = registry.resolve(request);
  assert.equal(resolution.status, "resolved");
  assert.equal(resolution.registration.kind, "asynchronous");
  return resolution.registration.endpoint;
}

test("StarRouter submits, checkpoints, polls and collects a video", async () => {
  const request: Need = {
    id: "need:starrouter-video", capability: minimaxH3Endpoints.video!.capability, returns: minimaxH3Endpoints.video!.returns,
    constraints: sealMinimaxH3Request({ prompt: ["move"], duration: [5], resolution: ["768P"], aspectRatio: ["16:9"] }) as unknown as CanonicalValue,
    result: "record:starrouter-video",
  };
  const endpoint = await endpointFor(request, async (input) => {
    const url = String(input);
    if (url.endsWith("/v1/videos")) return Response.json({ task_id: "task_star" });
    if (url.endsWith("/v1/videos/task_star")) return Response.json({ status: "SUCCEEDED", video_url: "https://media.test/star.mp4" });
    if (url === "https://media.test/star.mp4") return new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "video/mp4" } });
    throw new Error(`Unexpected request ${url}`);
  });
  const resources = new MemoryResourceStore(); let checkpointed = false;
  const context = { command: { kind: "fulfill-need" as const, id: "command:star", need: request }, need: request, resources, credentials: { apiKey: { secret: "test-key" } }, operation: "operation:star" };
  const started = await endpoint.start({ ...context, checkpoint: async () => { checkpointed = true; } });
  assert.equal(started.status, "pending"); assert.equal(checkpointed, true);
  if (started.status !== "pending") return;
  const invalid = await endpoint.poll({ ...context, handle: { ...(started.handle as Record<string, CanonicalValue>), route: "wrong" } }); assert.equal(invalid.status, "failed");
  const ready = await endpoint.poll({ ...context, handle: { ...(started.handle as Record<string, CanonicalValue>), pollPath: "/attacker-controlled" } }); assert.equal(ready.status, "ready");
  if (ready.status !== "ready") return;
  const wrongCollection = await endpoint.collect!({ ...context, handle: { ...(ready.handle as Record<string, CanonicalValue>), route: "wrong" } }); assert.equal(wrongCollection.status, "failed");
  const completed = await endpoint.collect!({ ...context, handle: ready.handle }); assert.equal(completed.status, "completed");
});

test("StarRouter does not repeat a paid submission when its response is lost", async () => {
  const request: Need = {
    id: "need:starrouter-unknown", capability: minimaxH3Endpoints.video!.capability, returns: minimaxH3Endpoints.video!.returns,
    constraints: sealMinimaxH3Request({ prompt: ["move"], duration: [5] }) as unknown as CanonicalValue,
    result: "record:starrouter-unknown",
  };
  let submissions = 0;
  const endpoint = await endpointFor(request, async () => { submissions += 1; throw new TypeError("fetch failed"); });
  const failed = await endpoint.start({ command: { kind: "fulfill-need", id: "command:unknown", need: request }, need: request,
    resources: new MemoryResourceStore(), credentials: { apiKey: { secret: "test-key" } }, operation: "operation:unknown" });
  assert.equal(failed.status, "failed");
  assert.equal(submissions, 1);
  if (failed.status === "failed") {
    assert.equal(failed.failure.code, "STARROUTER_SUBMISSION_OUTCOME_UNKNOWN");
    assert.match(failed.failure.message, /remote outcome is unknown.*not retried/iu);
  }
});

test("StarRouter treats a successful response without task id as an unknown paid outcome", async () => {
  const request: Need = {
    id: "need:starrouter-missing-id", capability: minimaxH3Endpoints.video!.capability, returns: minimaxH3Endpoints.video!.returns,
    constraints: sealMinimaxH3Request({ prompt: ["move"], duration: [5] }) as unknown as CanonicalValue,
    result: "record:starrouter-missing-id",
  };
  const endpoint = await endpointFor(request, async () => Response.json({ code: 0, message: "accepted", data: { request_id: "req-9" } }));
  const failed = await endpoint.start({ command: { kind: "fulfill-need", id: "command:missing-id", need: request }, need: request,
    resources: new MemoryResourceStore(), credentials: { apiKey: { secret: "test-key" } }, operation: "operation:missing-id" });
  assert.equal(failed.status, "failed");
  if (failed.status === "failed") {
    assert.equal(failed.failure.code, "STARROUTER_SUBMISSION_OUTCOME_UNKNOWN");
    assert.match(failed.failure.message, /accepted.*request_id.*req-9/isu);
  }
});

test("StarRouter retries transient polling and download failures from its checkpoint", async () => {
  const request: Need = {
    id: "need:starrouter-transient", capability: minimaxH3Endpoints.video!.capability, returns: minimaxH3Endpoints.video!.returns,
    constraints: sealMinimaxH3Request({ prompt: ["move"], duration: [5] }) as unknown as CanonicalValue,
    result: "record:starrouter-transient",
  };
  let polls = 0; let downloads = 0;
  const endpoint = await endpointFor(request, async (input) => {
    const url = String(input);
    if (url.endsWith("/v1/videos")) return Response.json({ task_id: "task_transient" });
    if (url.endsWith("/v1/videos/task_transient")) {
      polls += 1;
      if (polls === 1) throw new TypeError("fetch failed");
      return Response.json({ status: "SUCCEEDED", video_url: "https://media.test/transient.mp4" });
    }
    downloads += 1;
    if (downloads === 1) return new Response("temporary", { status: 503 });
    return new Response(new Uint8Array([1]), { headers: { "content-type": "video/mp4" } });
  });
  const context = { command: { kind: "fulfill-need" as const, id: "command:transient", need: request }, need: request,
    resources: new MemoryResourceStore(), credentials: { apiKey: { secret: "test-key" } }, operation: "operation:transient" };
  const started = await endpoint.start(context); assert.equal(started.status, "pending");
  if (started.status !== "pending") return;
  assert.equal((await endpoint.poll({ ...context, handle: started.handle })).status, "pending");
  const ready = await endpoint.poll({ ...context, handle: started.handle }); assert.equal(ready.status, "ready");
  if (ready.status !== "ready") return;
  assert.equal((await endpoint.collect!({ ...context, handle: ready.handle })).status, "pending");
  assert.equal((await endpoint.collect!({ ...context, handle: ready.handle })).status, "completed");
});

test("StarRouter sends GPT Image references as multipart and reports service failures", async () => {
  const resources = new MemoryResourceStore(); const image = await resources.put(new Uint8Array([4, 5, 6]), "image/png");
  const request: Need = {
    id: "need:starrouter-image", capability: gptImageEndpoints.image!.capability, returns: gptImageEndpoints.image!.returns,
    constraints: sealGptImage2Request({ prompt: ["edit"], aspectRatio: ["1:1"], resolution: ["1K"], images: [{ role: "image", artifact: image }] }) as unknown as CanonicalValue,
    result: "record:starrouter-image",
  };
  let attempts = 0;
  const endpoint = await endpointFor(request, async (_input, init) => {
    attempts++;
    assert(init?.body instanceof FormData); assert.equal(init.body.getAll("image").length, 1);
    return attempts === 1 ? Response.json({ data: [{ b64_json: "AQID" }] }) : Response.json({ error: { message: "bad request" } }, { status: 400 });
  });
  const context = { command: { kind: "fulfill-need" as const, id: "command:image", need: request }, need: request, resources, credentials: { apiKey: { secret: "test-key" } }, operation: "operation:image" };
  const ready = await endpoint.start(context); assert.equal(ready.status, "ready");
  const failed = await endpoint.start(context); assert.equal(failed.status, "failed");
});

test("StarRouter without a public asset publisher rejects video references during planning", async () => {
  const request: Need = {
    id: "need:starrouter-reference", capability: minimaxH3Endpoints.video!.capability, returns: minimaxH3Endpoints.video!.returns,
    constraints: sealMinimaxH3Request({ prompt: ["move"], duration: [5], firstFrame: [{ role: "image", artifact: { kind: "blob", resource: "res_reference", size: 3, mediaType: "image/png" } }] }) as unknown as CanonicalValue,
    result: "record:starrouter-reference",
  };
  const registry = new EndpointRegistry(); await createStarRouterProvider().install(registry);
  const resolution = registry.resolve(request); assert.equal(resolution.status, "unsupported");
  const configured = new EndpointRegistry(); await createStarRouterProvider({ publicAssetUrl: async () => "https://media.test/reference.png" }).install(configured);
  assert.equal(configured.resolve(request).status, "resolved");
});

test("StarRouter retries Seedance face references through a reviewed BytePlus asset", async () => {
  const image = { kind: "blob" as const, resource: "res_person" as const, size: 3, mediaType: "image/png" };
  const request: Need = {
    id: "need:starrouter-face", capability: seedanceEndpointsByModel["seedance-2"].capability, returns: seedanceEndpointsByModel["seedance-2"].returns,
    constraints: sealSeedanceRequest("seedance-2", {
      prompt: ["@图片1 中的人物挥手"], duration: [5], resolution: ["720p"], aspectRatio: ["9:16"], generateAudio: [false], webSearch: [false],
      referenceImage: [{ role: "image", artifact: image, fields: { personReference: true } }],
    }) as unknown as CanonicalValue,
    result: "record:starrouter-face",
  };
  const starRouterBodies: Record<string, unknown>[] = [];
  const endpoint = await endpointFor(request, async (input, init) => {
    const url = String(input);
    if (url.startsWith("https://ark.ap-southeast-1.byteplusapi.com/")) {
      return Response.json({ Result: { Id: "asset-1", Status: "Active" } });
    }
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    starRouterBodies.push(body);
    return starRouterBodies.length === 1
      ? Response.json({ code: " ", error: { code: "InputImageSensitiveContentDetected.PrivacyInformation", message: "real person" } }, { status: 400 })
      : Response.json({ task_id: "task_face" });
  }, {
    publicAssetUrl: async () => "https://media.test/person.png",
    seedanceAssetGroupId: "group-test",
    bytePlusAccessKeyId: { store: "os", key: "byteplus.access-key-id" },
    bytePlusAccessKeySecret: { store: "os", key: "byteplus.access-key-secret" },
  });
  const started = await endpoint.start({
    command: { kind: "fulfill-need", id: "command:face", need: request }, need: request,
    resources: new MemoryResourceStore(),
    credentials: {
      apiKey: { secret: "test-key" }, bytePlusAccessKeyId: { secret: "access-key" }, bytePlusAccessKeySecret: { secret: "access-secret" },
    },
    operation: "operation:face",
  });
  assert.equal(started.status, "pending");
  assert.equal(starRouterBodies.length, 2);
  const retryContent = starRouterBodies[1]!.content as Array<Record<string, unknown>>;
  assert.deepEqual(retryContent.find((item) => item.type === "image_url"), {
    type: "image_url", image_url: { url: "asset://asset-1" }, role: "reference_image",
  });
});

test("StarRouter publishes the same resource separately when reference metadata differs", async () => {
  const shared = { kind: "blob" as const, resource: "res_shared" as const, size: 3, mediaType: "image/png" };
  const request: Need = {
    id: "need:starrouter-metadata", capability: seedanceEndpointsByModel["seedance-2"].capability, returns: seedanceEndpointsByModel["seedance-2"].returns,
    constraints: sealSeedanceRequest("seedance-2", {
      prompt: ["@图片1 and @图片2"], duration: [5], resolution: ["720p"], aspectRatio: ["9:16"], generateAudio: [false], webSearch: [false],
      referenceImage: [
        { role: "image", artifact: shared, fields: { personReference: true } },
        { role: "image", artifact: shared, fields: { personReference: false } },
      ],
    }) as unknown as CanonicalValue,
    result: "record:starrouter-metadata",
  };
  const published: Array<Readonly<Record<string, string | number | boolean>> | undefined> = [];
  const endpoint = await endpointFor(request, async (_input, init) => {
    const body = JSON.parse(String(init?.body)) as { content: Array<{ image_url?: { url?: string } }> };
    assert.deepEqual(body.content.filter((item) => item.image_url).map((item) => item.image_url?.url), ["https://media.test/1", "https://media.test/2"]);
    return Response.json({ task_id: "task_metadata" });
  }, {
    publicAssetUrl: async (_artifact, _resources, fields) => {
      published.push(fields);
      return `https://media.test/${published.length}`;
    },
  });
  const started = await endpoint.start({
    command: { kind: "fulfill-need", id: "command:metadata", need: request }, need: request,
    resources: new MemoryResourceStore(), credentials: { apiKey: { secret: "test-key" } }, operation: "operation:metadata",
  });
  assert.equal(started.status, "pending");
  assert.deepEqual(published, [{ personReference: true }, { personReference: false }]);
});
