import assert from "node:assert/strict";
import test from "node:test";

import { EndpointRegistry, MemoryResourceStore } from "@hypit/driver-node";
import type { AsyncEndpoint } from "@hypit/endpoint-kit";
import { canonicalize } from "@hypit/protocol";
import type { CanonicalValue, Need } from "@hypit/protocol";
import type { RuntimeEndpointAdapterImplementation } from "@hypit/runtime-kit";
import { sealSeedanceRequest, seedanceEndpoints } from "@hypit/seedance";

import { createLinghuStudioProvider } from "../src/provider.js";
import { hypitPackage } from "../src/activation.js";

function request(): Need {
  return {
    id: "need:linghu-video",
    capability: seedanceEndpoints.standard!.capability,
    returns: seedanceEndpoints.standard!.returns,
    constraints: sealSeedanceRequest("seedance-2", {
      prompt: ["一位演员自然地转身看向镜头。"],
      resolution: ["720p"],
      aspectRatio: ["9:16"],
      duration: [5],
      generateAudio: [true],
      webSearch: [false],
    }) as unknown as CanonicalValue,
    result: "record:linghu-video",
  };
}

async function endpointFor(fetcher: typeof globalThis.fetch): Promise<AsyncEndpoint> {
  const registry = new EndpointRegistry();
  await createLinghuStudioProvider({
    projectId: "project-1",
    models: { "@hypit/seedance@1#seedance-2": "linghu::seedance-2" },
    fetch: fetcher,
    pollIntervalMs: 0,
    requestTimeoutMs: 1_000,
  }).install(registry);
  const resolved = registry.resolve(request());
  assert.equal(resolved.status, "resolved");
  assert.equal(resolved.registration.kind, "asynchronous");
  return resolved.registration.endpoint;
}

test("灵狐工作室 Provider 以 API Key 提交、轮询并收集视频", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const endpoint = await endpointFor(async (input, init) => {
    const url = String(input);
    calls.push({ url, ...(init === undefined ? {} : { init }) });
    if (url.endsWith("/api/v1/models/video")) {
      assert.equal(init?.method, "POST");
      const headers = new Headers(init?.headers);
      assert.equal(headers.get("authorization"), "Bearer vvk_test");
      assert.equal(headers.get("idempotency-key"), "operation:linghu-video");
      assert.deepEqual(JSON.parse(String(init?.body)), {
        projectId: "project-1",
        model: "linghu::seedance-2",
        prompt: "一位演员自然地转身看向镜头。",
        options: {
          aspectRatio: "9:16",
          duration: 5,
          generateAudio: true,
          resolution: "720p",
          webSearch: false,
        },
      });
      return Response.json({ taskId: "task-1", status: "queued", statusUrl: "/api/v1/tasks/task-1" }, { status: 202 });
    }
    if (url.endsWith("/api/v1/tasks/task-1")) {
      return Response.json({ task: { id: "task-1", status: "completed", result: { videoUrl: "/m/video-1" } } });
    }
    if (url.endsWith("/m/video-1")) {
      return new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "video/mp4" } });
    }
    throw new Error(`未预期的请求：${url}`);
  });
  const resources = new MemoryResourceStore();
  const context = {
    command: { kind: "fulfill-need" as const, id: "command:linghu-video", need: request() },
    need: request(),
    resources,
    credentials: { apiKey: { secret: "vvk_test" } },
    operation: "operation:linghu-video",
  };
  const started = await endpoint.start(context);
  assert.equal(started.status, "pending");
  if (started.status !== "pending") return;
  const ready = await endpoint.poll({ ...context, handle: started.handle! });
  assert.equal(ready.status, "ready");
  if (ready.status !== "ready") return;
  const completed = await endpoint.collect!({ ...context, handle: ready.handle });
  assert.equal(completed.status, "completed");
  if (completed.status !== "completed") return;
  const value = completed.result.value;
  assert.equal(value.kind, "inline");
  const videos = value.kind === "inline"
    ? (value.value as { videos: Array<{ resource: string; mediaType: string }> }).videos
    : [];
  assert.equal(videos.length, 1);
  assert.equal(videos[0]?.mediaType, "video/mp4");
  assert.deepEqual(await resources.get(videos[0]!.resource as `res_${string}`), new Uint8Array([1, 2, 3]));
  assert.equal(calls.length, 3);
});

test("灵狐工作室只接收显式映射到账号目录的能力", async () => {
  const registry = new EndpointRegistry();
  await createLinghuStudioProvider({ projectId: "project-1" }).install(registry);
  assert.equal(registry.resolve(request()).status, "unsupported");
});

test("灵狐工作室 Runtime 配置加载项目、API Key 引用与模型映射", async () => {
  const adapter = hypitPackage.hostFacets[0]!.implementation as RuntimeEndpointAdapterImplementation;
  const activation = await adapter.activate({
    hostStateRoot: "/tmp",
    dataRoot: "/tmp",
    instance: "linghu-studio.default",
    pool: "linghu-studio.default",
    config: canonicalize({
      apiKey: { store: "platform", key: "linghu-studio.api-key" },
      projectId: "project-1",
      models: { "@hypit/seedance@1#seedance-2": "linghu::seedance-2" },
    }),
  });
  const registry = new EndpointRegistry();
  await activation.endpoint.install(registry);
  assert.equal(registry.resolve(request()).status, "resolved");
});
