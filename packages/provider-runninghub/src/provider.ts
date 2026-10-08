import { readFileSync } from "node:fs";
import { requestDeadline } from "@hypit/runtime-kit";
import type { AsyncEndpoint, EndpointCredential, EndpointOutcome } from "@hypit/endpoint-kit";
import { defineEndpointPackage, wakeAfter } from "@hypit/endpoint-kit";
import { canonicalize } from "@hypit/protocol";
import type { BlobRef } from "@hypit/protocol";
import { credentialRef } from "@hypit/runtime";
import type { CredentialRef } from "@hypit/runtime";
import { runningHubMaxUploadBytes, runningHubRouteForCapability, runningHubRoutes } from "./routes.js";
import type { RunningHubInputs } from "./routes.js";

export const runningHubProviderModuleRef = { name: "@hypit/provider-runninghub", version: "1" } as const;
export type CreateRunningHubProviderOptions = { readonly instance?: string; readonly pool?: string; readonly baseUrl?: string; readonly apiKey?: CredentialRef; readonly workflowId?: string; readonly defaultConcurrency?: number; readonly actionLimits?: import("@hypit/endpoint-kit").EndpointActionLimits; readonly pollIntervalMs?: number; readonly requestTimeoutMs?: number; readonly operationTimeoutMs?: number; readonly fetch?: typeof globalThis.fetch };
type Handle = { readonly contract: "hypit.runninghub-operation@1"; readonly taskId: string; readonly startedAt: number; readonly urls?: readonly string[] };
type Workflow = Record<string, { inputs: Record<string, unknown>; class_type: string; _meta?: Record<string, unknown> }>;
const workflowTemplate = JSON.parse(readFileSync(new URL("./minimax-h3-workflow.json", import.meta.url), "utf8")) as Workflow;
const depthVideoWorkflowTemplate = JSON.parse(readFileSync(new URL("./depth-video-workflow.json", import.meta.url), "utf8")) as Workflow;

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
function object(value: unknown, subject: string): Record<string, unknown> { assert(value !== null && typeof value === "object" && !Array.isArray(value), `${subject} must be an object`); return value as Record<string, unknown>; }
function apiKey(credentials: Readonly<Record<string, EndpointCredential>>): string { const value = credentials.apiKey?.secret; assert(typeof value === "string" && value.length > 0, "RunningHub apiKey credential is unavailable"); return value; }
function message(error: unknown): string { return error instanceof Error ? error.message : String(error); }
function failure(error: unknown, code = "RUNNINGHUB_ERROR"): EndpointOutcome { return { status: "failed", failure: { code, message: message(error) } }; }
function baseUrl(value: string): string { const result = value.trim().replace(/\/+$/u, ""); assert(result.length > 0, "RunningHub base URL is empty"); return result; }
function responseEvidence(response: Record<string, unknown>): string {
  return JSON.stringify({ code: response.code ?? null, msg: response.msg ?? null, data: response.data ?? null }).slice(0, 2_000);
}

class RunningHubHttpError extends Error { constructor(readonly status: number, detail: string) { super(detail); } }
function networkFailure(error: unknown): boolean {
  return error instanceof TypeError || (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError" || /fetch failed|network|socket|ECONN|ETIMEDOUT|EAI_AGAIN/iu.test(error.message)));
}
function retryable(error: unknown): boolean { return networkFailure(error) || (error instanceof RunningHubHttpError && (error.status === 408 || error.status === 429 || error.status >= 500)); }

class RunningHubClient {
  constructor(readonly base: string, readonly timeout: number, readonly fetcher: typeof globalThis.fetch) {}
  async json(path: string, key: string, init: RequestInit = {}): Promise<Record<string, unknown>> {
    const deadline = requestDeadline(this.timeout);
    try {
      const response = await deadline.wait(this.fetcher(`${this.base}${path}`, { ...init, signal: deadline.signal, headers: { authorization: `Bearer ${key}`, ...(init.headers ?? {}) } }));
      const text = await deadline.wait(response.text()); let body: unknown;
      try { body = text.length === 0 ? {} : JSON.parse(text); } catch { throw new Error(`RunningHub returned invalid JSON (${response.status})`); }
      if (!response.ok) throw new RunningHubHttpError(response.status, `RunningHub request failed (${response.status}): ${String((body as { msg?: unknown }).msg ?? text).slice(0, 500)}`);
      return object(body, "RunningHub response");
    } finally { deadline.finish(); }
  }
  async upload(asset: BlobRef, resources: import("@hypit/runtime").ResourceStore, key: string): Promise<string> {
    assert(asset.size <= runningHubMaxUploadBytes, `RunningHub reference ${asset.resource} exceeds 200MB`);
    const bytes = await resources.get(asset.resource); assert(bytes !== undefined && bytes.byteLength === asset.size, `RunningHub reference ${asset.resource} is unavailable`);
    const part = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const form = new FormData(); form.append("file", new Blob([part], { type: asset.mediaType }), asset.resource);
    const response = await this.json("/openapi/v2/media/upload/binary", key, { method: "POST", body: form });
    assert(response.code === undefined || [0, 200].includes(Number(response.code)), `RunningHub upload failed: ${String(response.msg ?? response.code)}`);
    const data = object(response.data ?? {}, "RunningHub upload data"); const filename = data.filename ?? data.fileName;
    assert(typeof filename === "string" && filename.length > 0, "RunningHub upload response has no filename"); return filename;
  }
  async download(url: string): Promise<{ readonly bytes: Uint8Array; readonly mediaType: string }> {
    const deadline = requestDeadline(this.timeout);
    try { const response = await deadline.wait(this.fetcher(url, { signal: deadline.signal })); if (!response.ok) throw new RunningHubHttpError(response.status, `RunningHub asset returned HTTP ${response.status}`); return { bytes: new Uint8Array(await deadline.wait(response.arrayBuffer())), mediaType: response.headers.get("content-type")?.split(";", 1)[0] ?? "application/octet-stream" }; }
    finally { deadline.finish(); }
  }
}

function workflow(inputs: RunningHubInputs, uploaded: readonly string[]): Workflow {
  if (inputs.kind === "depth-video") {
    const value = structuredClone(depthVideoWorkflowTemplate); const source = value["21"];
    assert(source !== undefined && uploaded.length === 1, "RunningHub depth video workflow template is incomplete");
    source.inputs.video = uploaded[0];
    return value;
  }
  const value = structuredClone(workflowTemplate); const prompt = value["25"]; const duration = value["28"]; const resolution = value["26"]; const h3 = value["31"];
  assert(prompt !== undefined && duration !== undefined && resolution !== undefined && h3 !== undefined, "RunningHub H3 workflow template is incomplete");
  prompt.inputs.value = inputs.prompt; duration.inputs.value = inputs.duration; resolution.inputs.aspect_ratio = inputs.aspectRatio; resolution.inputs.megapixels = inputs.megapixels;
  const offsets = { image: 100, video: 120, audio: 140 }; const indexes = { image: 0, video: 0, audio: 0 };
  inputs.assets.forEach((asset, position) => {
    const kind = asset.mediaType.split("/", 1)[0] as keyof typeof offsets; const index = indexes[kind]++; const id = String(offsets[kind] + index);
    value[id] = kind === "video" ? { inputs: { video: uploaded[position], force_rate: 0, custom_width: 0, custom_height: 0, frame_load_cap: 0, skip_first_frames: 0, select_every_nth: 1 }, class_type: "VHS_LoadVideo" } : kind === "image" ? { inputs: { image: uploaded[position] }, class_type: "LoadImage" } : { inputs: { audio: uploaded[position] }, class_type: "LoadAudio" };
    h3.inputs[`ref_${kind}s.ref_${kind}_${index}`] = [id, 0];
  });
  return value;
}
function urls(value: unknown, found: string[] = []): string[] { if (value === null || typeof value !== "object") return found; for (const [name, item] of Object.entries(value)) { if (["url", "fileUrl", "videoUrl", "video_url", "downloadUrl", "download_url"].includes(name) && typeof item === "string" && /^https?:\/\//u.test(item)) found.push(item); else if (item !== null && typeof item === "object") urls(item, found); } return [...new Set(found)]; }

function endpoint(client: RunningHubClient, workflowId: string | undefined, pollIntervalMs: number, operationTimeoutMs: number): AsyncEndpoint {
  const timedOut = (handle: Handle): boolean => Date.now() - handle.startedAt > operationTimeoutMs;
  const timeout = (handle: Handle): EndpointOutcome => ({ status: "failed", failure: { code: "RUNNINGHUB_OPERATION_TIMEOUT", message: `RunningHub task ${handle.taskId} timed out` }, receipt: { id: handle.taskId } });
  return {
    async start(context) {
      let creating = false;
      try {
        const route = runningHubRouteForCapability(context.need.capability); assert(route !== undefined, "RunningHub does not implement this capability"); const prepared = route.prepare(context.need.constraints); const key = apiKey(context.credentials);
        const uploaded: string[] = []; for (const asset of prepared.inputs.assets) uploaded.push(await client.upload(asset, context.resources, key));
        const selectedWorkflowId = prepared.inputs.kind === "minimax-h3" ? workflowId ?? prepared.workflowId : prepared.workflowId;
        creating = true;
        const response = await client.json("/task/openapi/create", key, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ apiKey: key, workflowId: selectedWorkflowId, workflow: JSON.stringify(workflow(prepared.inputs, uploaded)), addMetadata: false }) });
        const taskValue = object(response.data ?? {}, "RunningHub response data").taskId;
        const taskId = typeof taskValue === "string" || typeof taskValue === "number" ? String(taskValue).trim() : "";
        assert(Number(response.code) === 0 && taskId.length > 0,
          `RunningHub create response is not a confirmed submission: ${responseEvidence(response)}`);
        const handle: Handle = { contract: "hypit.runninghub-operation@1", taskId, startedAt: Date.now() }; const receipt = { id: taskId };
        await context.checkpoint?.({ handle: canonicalize(handle), receipt }); return { ...wakeAfter(canonicalize(handle), pollIntervalMs, Date.now(), { phase: "submitted" }), receipt };
      } catch (error) { return creating && networkFailure(error) ? failure(new Error(`RunningHub submission response was lost; remote outcome is unknown and this request was not retried: ${message(error)}`), "RUNNINGHUB_SUBMISSION_OUTCOME_UNKNOWN") : failure(error); }
    },
    async poll(context) {
      let handle: Handle | undefined;
      try {
        handle = object(context.handle, "RunningHub handle") as unknown as Handle; assert(handle.contract === "hypit.runninghub-operation@1", "RunningHub handle is invalid");
        if (timedOut(handle)) return timeout(handle);
        const response = await client.json("/openapi/v2/query", apiKey(context.credentials), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ taskId: handle.taskId }) });
        const data = object(response.data ?? response, "RunningHub task"); const status = String(data.status ?? "").toUpperCase();
        if (["QUEUED", "RUNNING", "PENDING"].includes(status) || [804, 813].includes(Number(response.code))) return { ...wakeAfter(canonicalize(handle), pollIntervalMs, Date.now(), { phase: status.toLowerCase() || "pending" }), receipt: { id: handle.taskId } };
        if (["FAILED", "ERROR"].includes(status) || Number(response.code) === 805) return { status: "failed", failure: { code: "RUNNINGHUB_TASK_FAILED", message: String(data.errorMessage ?? response.msg ?? "RunningHub task failed") }, receipt: { id: handle.taskId } };
        const output = urls(data.results ?? data);
        if (output.length > 0) return { status: "ready", handle: canonicalize({ ...handle, urls: output }), receipt: { id: handle.taskId } };
        if (["SUCCESS", "SUCCEEDED", "COMPLETED"].includes(status)) return { ...wakeAfter(canonicalize(handle), pollIntervalMs, Date.now(), { phase: "pending" }), receipt: { id: handle.taskId } };
        if (![0, 200].includes(Number(response.code))) return { status: "failed", failure: { code: "RUNNINGHUB_TASK_FAILED", message: String(response.msg ?? response.code ?? status ?? "RunningHub task failed") }, receipt: { id: handle.taskId } };
        return { ...wakeAfter(canonicalize(handle), pollIntervalMs, Date.now(), { phase: status.toLowerCase() || "pending" }), receipt: { id: handle.taskId } };
      } catch (error) { return handle !== undefined && retryable(error) ? { ...wakeAfter(canonicalize(handle), pollIntervalMs, Date.now(), { phase: "network-retry" }), receipt: { id: handle.taskId } } : failure(error); }
    },
    async collect(context) {
      let handle: Handle | undefined;
      try { handle = object(context.handle, "RunningHub handle") as unknown as Handle; const route = runningHubRouteForCapability(context.need.capability); assert(route !== undefined && handle.contract === "hypit.runninghub-operation@1" && Array.isArray(handle.urls), "RunningHub collection handle is invalid"); if (timedOut(handle)) return timeout(handle); const artifacts: BlobRef[] = []; for (const url of handle.urls) { const asset = await client.download(url); artifacts.push(await context.resources.put(asset.bytes, asset.mediaType)); } return { status: "completed", result: { value: route.packageResult(artifacts) }, receipt: { id: handle.taskId } }; }
      catch (error) {
        if (handle === undefined || !retryable(error)) return failure(error);
        if (timedOut(handle)) return timeout(handle);
        return { ...wakeAfter(canonicalize(handle), pollIntervalMs, Date.now(), { phase: "download-retry" }), receipt: { id: handle.taskId } };
      }
    },
  };
}

export function createRunningHubProvider(options: CreateRunningHubProviderOptions = {}) {
  const client = new RunningHubClient(baseUrl(options.baseUrl ?? "https://www.runninghub.ai"), options.requestTimeoutMs ?? 300_000, options.fetch ?? globalThis.fetch); const asyncEndpoint = endpoint(client, options.workflowId, options.pollIntervalMs ?? 10_000, options.operationTimeoutMs ?? 30 * 60_000);
  return defineEndpointPackage({ module: runningHubProviderModuleRef, facet: "gateway", instance: options.instance ?? "runninghub.default", pool: options.pool ?? options.instance ?? "runninghub.default", pricing: { kind: "page", url: "https://www.runninghub.ai" }, credentials: { apiKey: options.apiKey ?? credentialRef("os", "runninghub.api-key") }, credentialInputs: { apiKey: { label: "RunningHub API key" } }, defaultConcurrency: options.defaultConcurrency ?? 2, ...(options.actionLimits === undefined ? {} : { actionLimits: options.actionLimits }), capabilities: runningHubRoutes.map((route) => ({ capability: route.capability, returns: route.returns, lifecycle: "asynchronous" as const, endpoint: asyncEndpoint, capacity: route.capability.name, supports: route.supports })) });
}
