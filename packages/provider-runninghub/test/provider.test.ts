import assert from "node:assert/strict";
import test from "node:test";
import { EndpointRegistry, MemoryResourceStore } from "@hypit/driver-node";
import { sealMinimaxH3Request, minimaxH3Endpoints } from "@hypit/minimax-h3";
import { depthVideoEndpoint, sealDepthVideoRequest } from "@hypit/depth-video";
import type { CanonicalValue, Need } from "@hypit/protocol";

import { createRunningHubProvider } from "../src/provider.js";

async function endpointFor(request: Need, fetch: typeof globalThis.fetch, operationTimeoutMs?: number) {
  const registry = new EndpointRegistry();
  await createRunningHubProvider({ fetch, pollIntervalMs: 0, ...(operationTimeoutMs === undefined ? {} : { operationTimeoutMs }) }).install(registry);
  const resolution = registry.resolve(request);
  assert.equal(resolution.status, "resolved");
  assert.equal(resolution.registration.kind, "asynchronous");
  return resolution.registration.endpoint;
}

test("RunningHub uploads, checkpoints, polls and collects a video", async () => {
  const resources = new MemoryResourceStore(); const reference = await resources.put(new Uint8Array([1, 2, 3]), "video/mp4");
  const request: Need = {
    id: "need:runninghub", capability: minimaxH3Endpoints.video!.capability, returns: minimaxH3Endpoints.video!.returns,
    constraints: sealMinimaxH3Request({ prompt: ["move"], duration: [5], referenceVideo: [{ role: "video", artifact: reference }] }) as unknown as CanonicalValue,
    result: "record:runninghub",
  };
  const endpoint = await endpointFor(request, async (input, init) => {
    const url = String(input);
    if (url.endsWith("/openapi/v2/media/upload/binary")) { assert(init?.body instanceof FormData); return Response.json({ data: { filename: "ref.mp4" } }); }
    if (url.endsWith("/task/openapi/create")) { assert.equal(JSON.parse(String(init?.body)).workflowId, "2086743729407733762"); return Response.json({ code: 0, data: { taskId: "task_run" } }); }
    if (url.endsWith("/openapi/v2/query")) return Response.json({ code: 0, data: { status: "SUCCESS", videoUrl: "https://media.test/run.mp4" } });
    if (url === "https://media.test/run.mp4") return new Response(new Uint8Array([7, 8, 9]), { headers: { "content-type": "video/mp4" } });
    throw new Error(`Unexpected request ${url}`);
  });
  let checkpointed = false;
  const context = { command: { kind: "fulfill-need" as const, id: "command:run", need: request }, need: request, resources, credentials: { apiKey: { secret: "test-key" } }, operation: "operation:run" };
  const started = await endpoint.start({ ...context, checkpoint: async () => { checkpointed = true; } }); assert.equal(started.status, "pending"); assert.equal(checkpointed, true);
  if (started.status !== "pending") return;
  const invalid = await endpoint.poll({ ...context, handle: { ...(started.handle as Record<string, CanonicalValue>), contract: "wrong" } }); assert.equal(invalid.status, "failed");
  const ready = await endpoint.poll({ ...context, handle: started.handle }); assert.equal(ready.status, "ready");
  if (ready.status !== "ready") return;
  const completed = await endpoint.collect!({ ...context, handle: ready.handle }); assert.equal(completed.status, "completed");
});

test("RunningHub reports submission failures", async () => {
  const request: Need = {
    id: "need:runninghub-failure", capability: minimaxH3Endpoints.video!.capability, returns: minimaxH3Endpoints.video!.returns,
    constraints: sealMinimaxH3Request({ prompt: ["move"], duration: [5] }) as unknown as CanonicalValue, result: "record:runninghub-failure",
  };
  const endpoint = await endpointFor(request, async () => Response.json({ msg: "rejected" }, { status: 500 }));
  const failed = await endpoint.start({ command: { kind: "fulfill-need", id: "command:failure", need: request }, need: request, resources: new MemoryResourceStore(), credentials: { apiKey: { secret: "test-key" } }, operation: "operation:failure" });
  assert.equal(failed.status, "failed");
});

test("RunningHub preserves create response code, message and data when no task id is returned", async () => {
  const request: Need = {
    id: "need:runninghub-create-evidence", capability: minimaxH3Endpoints.video!.capability, returns: minimaxH3Endpoints.video!.returns,
    constraints: sealMinimaxH3Request({ prompt: ["move"], duration: [5] }) as unknown as CanonicalValue,
    result: "record:runninghub-create-evidence",
  };
  const endpoint = await endpointFor(request, async () => Response.json({ code: 901, msg: "rate limited", data: { requestId: "req-7", retryAfter: 10 } }));
  const failed = await endpoint.start({ command: { kind: "fulfill-need", id: "command:create-evidence", need: request }, need: request,
    resources: new MemoryResourceStore(), credentials: { apiKey: { secret: "test-key" } }, operation: "operation:create-evidence" });
  assert.equal(failed.status, "failed");
  if (failed.status === "failed") {
    assert.match(failed.failure.message, /code.*901.*rate limited.*requestId.*req-7/isu);
    assert.doesNotMatch(failed.failure.message, /response has no taskId/iu);
  }
});

test("RunningHub reports non-pending task business errors immediately", async () => {
  const request: Need = {
    id: "need:runninghub-poll-failure", capability: minimaxH3Endpoints.video!.capability, returns: minimaxH3Endpoints.video!.returns,
    constraints: sealMinimaxH3Request({ prompt: ["move"], duration: [5] }) as unknown as CanonicalValue, result: "record:runninghub-poll-failure",
  };
  const endpoint = await endpointFor(request, async (input) => String(input).endsWith("/task/openapi/create")
    ? Response.json({ code: 0, data: { taskId: "task_failed" } })
    : Response.json({ code: 901, msg: "task rejected" }));
  const context = { command: { kind: "fulfill-need" as const, id: "command:poll-failure", need: request }, need: request, resources: new MemoryResourceStore(), credentials: { apiKey: { secret: "test-key" } }, operation: "operation:poll-failure" };
  const started = await endpoint.start(context); assert.equal(started.status, "pending");
  if (started.status !== "pending") return;
  const failed = await endpoint.poll({ ...context, handle: started.handle }); assert.equal(failed.status, "failed");
});

test("RunningHub keeps explicit running task states pending without a response code", async () => {
  const request: Need = {
    id: "need:runninghub-running", capability: minimaxH3Endpoints.video!.capability, returns: minimaxH3Endpoints.video!.returns,
    constraints: sealMinimaxH3Request({ prompt: ["move"], duration: [5] }) as unknown as CanonicalValue, result: "record:runninghub-running",
  };
  const endpoint = await endpointFor(request, async (input) => String(input).endsWith("/task/openapi/create")
    ? Response.json({ code: 0, data: { taskId: "task_running" } })
    : Response.json({ data: { status: "RUNNING" } }));
  const context = { command: { kind: "fulfill-need" as const, id: "command:running", need: request }, need: request, resources: new MemoryResourceStore(), credentials: { apiKey: { secret: "test-key" } }, operation: "operation:running" };
  const started = await endpoint.start(context); assert.equal(started.status, "pending");
  if (started.status !== "pending") return;
  const pending = await endpoint.poll({ ...context, handle: started.handle }); assert.equal(pending.status, "pending");
});

test("RunningHub keeps successful tasks pending until output URLs are ready", async () => {
  const request: Need = {
    id: "need:runninghub-success-pending", capability: minimaxH3Endpoints.video!.capability, returns: minimaxH3Endpoints.video!.returns,
    constraints: sealMinimaxH3Request({ prompt: ["move"], duration: [5] }) as unknown as CanonicalValue, result: "record:runninghub-success-pending",
  };
  const endpoint = await endpointFor(request, async (input) => String(input).endsWith("/task/openapi/create")
    ? Response.json({ code: 0, data: { taskId: "task_success_pending" } })
    : Response.json({ data: { status: "SUCCESS" } }));
  const context = { command: { kind: "fulfill-need" as const, id: "command:success-pending", need: request }, need: request, resources: new MemoryResourceStore(), credentials: { apiKey: { secret: "test-key" } }, operation: "operation:success-pending" };
  const started = await endpoint.start(context); assert.equal(started.status, "pending");
  if (started.status !== "pending") return;
  const pending = await endpoint.poll({ ...context, handle: started.handle }); assert.equal(pending.status, "pending");
});

test("RunningHub keeps a checkpointed task pending across transient query failures", async () => {
  const request: Need = {
    id: "need:runninghub-query-retry", capability: minimaxH3Endpoints.video!.capability, returns: minimaxH3Endpoints.video!.returns,
    constraints: sealMinimaxH3Request({ prompt: ["move"], duration: [5] }) as unknown as CanonicalValue, result: "record:runninghub-query-retry",
  };
  let queries = 0;
  const endpoint = await endpointFor(request, async (input) => {
    if (String(input).endsWith("/task/openapi/create")) return Response.json({ code: 0, data: { taskId: "task_query_retry" } });
    queries++;
    if (queries === 1) throw new TypeError("fetch failed");
    return Response.json({ code: 0, data: { status: "RUNNING" } });
  });
  const context = { command: { kind: "fulfill-need" as const, id: "command:query-retry", need: request }, need: request, resources: new MemoryResourceStore(), credentials: { apiKey: { secret: "test-key" } }, operation: "operation:query-retry" };
  const started = await endpoint.start(context); assert.equal(started.status, "pending");
  if (started.status !== "pending") return;
  assert.equal((await endpoint.poll({ ...context, handle: started.handle })).status, "pending");
  assert.equal((await endpoint.poll({ ...context, handle: started.handle })).status, "pending");
});

test("RunningHub rejects upload business errors even when a filename is present", async () => {
  const resources = new MemoryResourceStore(); const reference = await resources.put(new Uint8Array([1]), "video/mp4");
  const request: Need = {
    id: "need:runninghub-upload-failure", capability: minimaxH3Endpoints.video!.capability, returns: minimaxH3Endpoints.video!.returns,
    constraints: sealMinimaxH3Request({ prompt: ["move"], duration: [5], referenceVideo: [{ role: "video", artifact: reference }] }) as unknown as CanonicalValue,
    result: "record:runninghub-upload-failure",
  };
  const endpoint = await endpointFor(request, async () => Response.json({ code: 901, msg: "rejected", data: { filename: "invalid.mp4" } }));
  const failed = await endpoint.start({ command: { kind: "fulfill-need", id: "command:upload-failure", need: request }, need: request, resources, credentials: { apiKey: { secret: "test-key" } }, operation: "operation:upload-failure" });
  assert.equal(failed.status, "failed");
});

test("RunningHub depth video completes its asynchronous lifecycle", async () => {
  const resources = new MemoryResourceStore(); const source = await resources.put(new Uint8Array([1, 2]), "video/mp4");
  const request: Need = {
    id: "need:runninghub-depth", capability: depthVideoEndpoint.capability, returns: depthVideoEndpoint.returns,
    constraints: sealDepthVideoRequest({ source: [{ role: "video", artifact: source }] }) as unknown as CanonicalValue,
    result: "record:runninghub-depth",
  };
  let polls = 0; let downloads = 0;
  const endpoint = await endpointFor(request, async (input, init) => {
    const url = String(input);
    if (url.endsWith("/openapi/v2/media/upload/binary")) return Response.json({ data: { filename: "source.mp4" } });
    if (url.endsWith("/task/openapi/create")) {
      const body = JSON.parse(String(init?.body)); const workflow = JSON.parse(body.workflow);
      assert.equal(body.workflowId, "2098674379113979905"); assert.equal(workflow["21"].inputs.video, "source.mp4");
      assert.equal(workflow["6"].inputs.audio, undefined);
      return Response.json({ code: 0, data: { taskId: "task_depth" } });
    }
    if (url.endsWith("/openapi/v2/query")) {
      polls++;
      return polls === 1
        ? Response.json({ data: { status: "RUNNING" } })
        : Response.json({ code: 0, data: { status: "SUCCESS", videoUrl: "https://media.test/depth.mp4" } });
    }
    if (url === "https://media.test/depth.mp4") {
      downloads++;
      return downloads === 1
        ? new Response("temporary failure", { status: 503 })
        : new Response(new Uint8Array([7, 8, 9]), { headers: { "content-type": "video/mp4" } });
    }
    throw new Error(`Unexpected request ${url}`);
  });
  let checkpointed = false;
  const context = { command: { kind: "fulfill-need" as const, id: "command:depth", need: request }, need: request, resources, credentials: { apiKey: { secret: "test-key" } }, operation: "operation:depth" };
  const started = await endpoint.start({ ...context, checkpoint: async () => { checkpointed = true; } });
  assert.equal(started.status, "pending");
  assert.equal(checkpointed, true);
  if (started.status !== "pending") return;
  const pending = await endpoint.poll({ ...context, handle: started.handle });
  assert.equal(pending.status, "pending");
  const ready = await endpoint.poll({ ...context, handle: started.handle });
  assert.equal(ready.status, "ready");
  if (ready.status !== "ready") return;
  assert.equal((await endpoint.collect!({ ...context, handle: ready.handle })).status, "pending");
  assert.equal((await endpoint.collect!({ ...context, handle: ready.handle })).status, "completed");
});

test("RunningHub bounds output download retries by the operation deadline", async () => {
  const request: Need = {
    id: "need:runninghub-download-timeout", capability: minimaxH3Endpoints.video!.capability, returns: minimaxH3Endpoints.video!.returns,
    constraints: sealMinimaxH3Request({ prompt: ["move"], duration: [5] }) as unknown as CanonicalValue,
    result: "record:runninghub-download-timeout",
  };
  const endpoint = await endpointFor(request, async () => new Response("temporary failure", { status: 503 }), 1);
  const outcome = await endpoint.collect!({
    command: { kind: "fulfill-need", id: "command:download-timeout", need: request }, need: request,
    resources: new MemoryResourceStore(), credentials: { apiKey: { secret: "test-key" } }, operation: "operation:download-timeout",
    handle: { contract: "hypit.runninghub-operation@1", taskId: "task_download_timeout", startedAt: 0, urls: ["https://media.test/run.mp4"] },
  });
  assert.equal(outcome.status, "failed");
  if (outcome.status === "failed") assert.equal(outcome.failure.code, "RUNNINGHUB_OPERATION_TIMEOUT");
});
