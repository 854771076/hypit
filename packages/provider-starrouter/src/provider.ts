import { requestDeadline } from "@hypit/runtime-kit";
import type { AsyncEndpoint, EndpointCredential, EndpointInvocationContext, EndpointOutcome, EndpointRequest, EndpointSupport } from "@hypit/endpoint-kit";
import { defineEndpointPackage, wakeAfter } from "@hypit/endpoint-kit";
import type { GenerationArtifactUrlResolver } from "@hypit/generation";
import { canonicalize } from "@hypit/protocol";
import type { BlobRef } from "@hypit/protocol";
import { credentialRef } from "@hypit/runtime";
import type { CredentialRef, ResourceStore } from "@hypit/runtime";
import { starRouterMaxReferenceImageBytes, starRouterRouteForCapability, starRouterRoutes } from "./routes.js";
import type { StarRouterRoute } from "./routes.js";
import { prepareSeedanceAsset } from "./seedance-asset.js";
import { createStarRouterPublicAssetPublisher } from "./public-assets.js";
import type { StarRouterPublicAssets } from "./public-assets.js";

export const starRouterProviderModuleRef = { name: "@hypit/provider-starrouter", version: "1" } as const;
export type CreateStarRouterProviderOptions = {
  readonly instance?: string; readonly pool?: string; readonly baseUrl?: string; readonly apiKey?: CredentialRef;
  readonly defaultConcurrency?: number; readonly actionLimits?: import("@hypit/endpoint-kit").EndpointActionLimits;
  readonly pollIntervalMs?: number; readonly requestTimeoutMs?: number; readonly operationTimeoutMs?: number;
  readonly fetch?: typeof globalThis.fetch;
  readonly publicAssetUrl?: (artifact: BlobRef, artifacts: ResourceStore, fields?: Readonly<Record<string, string | number | boolean>>) => Promise<string>;
  readonly publicAssets?: StarRouterPublicAssets;
  readonly bytePlusAccessKeyId?: CredentialRef; readonly bytePlusAccessKeySecret?: CredentialRef;
  readonly seedanceAssetGroupId?: string; readonly seedanceAssetProjectName?: string;
};
type Output = { readonly url?: string; readonly base64?: string; readonly mediaType?: string };
type Handle = { readonly contract: "hypit.starrouter-operation@1"; readonly taskId: string; readonly route: string; readonly startedAt: number; readonly outputs?: readonly Output[] };

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
function object(value: unknown, subject: string): Record<string, unknown> { assert(value !== null && typeof value === "object" && !Array.isArray(value), `${subject} must be an object`); return value as Record<string, unknown>; }
function apiKey(credentials: Readonly<Record<string, EndpointCredential>>): string { const value = credentials.apiKey?.secret; assert(typeof value === "string" && value.length > 0, "StarRouter apiKey credential is unavailable"); return value; }
function failure(error: unknown, code = "STARROUTER_ERROR"): EndpointOutcome { return { status: "failed", failure: { code, message: error instanceof Error ? error.message : String(error) } }; }
function baseUrl(value: string): string { const result = value.trim().replace(/\/+$/u, ""); assert(result.length > 0, "StarRouter base URL is empty"); return result.replace(/\/v1$/u, ""); }
function responseEvidence(response: Record<string, unknown>): string {
  return JSON.stringify({ code: response.code ?? null, message: response.message ?? null,
    error: response.error ?? null, data: response.data ?? null }).slice(0, 2_000);
}
function networkFailure(error: unknown): boolean {
  return error instanceof TypeError || (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError"
    || /fetch failed|network|socket|ECONN|ETIMEDOUT|EAI_AGAIN/iu.test(error.message)));
}

class StarRouterHttpError extends Error {
  constructor(readonly status: number, readonly response: Record<string, unknown>, message: string) { super(message); }
}
function retryable(error: unknown): boolean {
  return networkFailure(error) || (error instanceof StarRouterHttpError && (error.status === 408 || error.status === 429 || error.status >= 500));
}

class StarRouterClient {
  constructor(readonly base: string, readonly timeout: number, readonly fetcher: typeof globalThis.fetch) {}
  async json(path: string, key: string, init: RequestInit = {}): Promise<Record<string, unknown>> {
    const deadline = requestDeadline(this.timeout);
    try {
      const response = await deadline.wait(this.fetcher(`${this.base}${path}`, { ...init, signal: deadline.signal, headers: { authorization: `Bearer ${key}`, ...(init.headers ?? {}) } }));
      const text = await deadline.wait(response.text());
      let body: unknown; try { body = text.length === 0 ? {} : JSON.parse(text); } catch { throw new Error(`StarRouter returned invalid JSON (${response.status})`); }
      const result = object(body, "StarRouter response");
      if (!response.ok) throw new StarRouterHttpError(response.status, result, `StarRouter request failed (${response.status}): ${String((body as { error?: { message?: unknown } })?.error?.message ?? text).slice(0, 500)}`);
      return result;
    } finally { deadline.finish(); }
  }
  async download(url: string): Promise<{ readonly bytes: Uint8Array; readonly mediaType: string }> {
    const deadline = requestDeadline(this.timeout);
    try { const response = await deadline.wait(this.fetcher(url, { signal: deadline.signal })); if (!response.ok) throw new StarRouterHttpError(response.status, {}, `StarRouter asset returned HTTP ${response.status}`); return { bytes: new Uint8Array(await deadline.wait(response.arrayBuffer())), mediaType: response.headers.get("content-type")?.split(";", 1)[0] ?? "application/octet-stream" }; }
    finally { deadline.finish(); }
  }
}

function resolverFor(context: EndpointInvocationContext, publish: CreateStarRouterProviderOptions["publicAssetUrl"], publicAssets: StarRouterPublicAssets | undefined): GenerationArtifactUrlResolver {
  const cache = new Map<string, Promise<string>>();
  const publisher = publish ?? (publicAssets === undefined ? undefined : createStarRouterPublicAssetPublisher(publicAssets, context.credentials));
  return (artifact, fields) => {
    assert(publisher !== undefined, "StarRouter reference media requires a public asset publisher");
    const key = JSON.stringify([artifact.resource, Object.entries(fields ?? {}).sort(([left], [right]) => left.localeCompare(right))]);
    const existing = cache.get(key); if (existing !== undefined) return existing;
    const value = publisher(artifact, context.resources, fields); cache.set(key, value); return value;
  };
}
function outputUrls(value: unknown, found: string[] = []): string[] {
  if (value === null || typeof value !== "object") return found;
  for (const [name, item] of Object.entries(value)) {
    if (["video_url", "videoUrl", "download_url", "downloadUrl", "result_url", "output_url", "url"].includes(name) && typeof item === "string" && /^https?:\/\//u.test(item)) found.push(item);
    else if (item !== null && typeof item === "object") outputUrls(item, found);
  }
  return [...new Set(found)];
}
function support(route: StarRouterRoute, hasPublisher: boolean, request: EndpointRequest): EndpointSupport {
  const result = route.supports(request);
  if (result.status === "unsupported" || route.result === "image" || hasPublisher) return result;
  const ports = (request.constraints as unknown as { readonly ports?: Readonly<Record<string, readonly unknown[]>> }).ports ?? {};
  const hasReferences = ["firstFrame", "lastFrame", "referenceImage", "referenceVideo", "referenceAudio"].some((port) => (ports[port]?.length ?? 0) > 0);
  return hasReferences ? { status: "unsupported", reason: "StarRouter video references require a public asset publisher" } : result;
}

type SeedanceAssetConfig = { readonly groupId: string; readonly projectName: string; readonly fetch: typeof globalThis.fetch };
const seedanceRetryCodes = new Set(["InputImageSensitiveContentDetected.PrivacyInformation", "fail_to_fetch_task"]);
function errorCode(error: StarRouterHttpError): string {
  const nested = error.response.error;
  const direct = String(error.response.code ?? "").trim();
  return direct || String(nested !== null && typeof nested === "object" ? (nested as { code?: unknown }).code ?? "" : "").trim();
}
function seedanceFaceRetry(error: unknown, route: StarRouterRoute, config: SeedanceAssetConfig | undefined): error is StarRouterHttpError {
  return config !== undefined && error instanceof StarRouterHttpError && seedanceRetryCodes.has(errorCode(error))
    && route.capability.module.name === "@hypit/seedance";
}
async function reviewedSeedanceBody(body: Record<string, unknown>, credentials: Readonly<Record<string, EndpointCredential>>, config: SeedanceAssetConfig): Promise<Record<string, unknown>> {
  const accessKeyId = credentials.bytePlusAccessKeyId?.secret; const accessKeySecret = credentials.bytePlusAccessKeySecret?.secret;
  assert(typeof accessKeyId === "string" && accessKeyId.length > 0 && typeof accessKeySecret === "string" && accessKeySecret.length > 0, "BytePlus Ark Asset credentials are unavailable");
  const content = Array.isArray(body.content) ? body.content : [];
  return {
    ...body,
    content: await Promise.all(content.map(async (item) => {
      if (item === null || typeof item !== "object" || Array.isArray(item) || (item as { type?: unknown }).type !== "image_url") return item;
      const image = (item as { image_url?: unknown }).image_url; const url = image !== null && typeof image === "object" ? (image as { url?: unknown }).url : undefined;
      if (typeof url !== "string" || !/^https?:\/\//iu.test(url)) return item;
      return { ...item, image_url: { url: await prepareSeedanceAsset({ sourceUrl: url, groupId: config.groupId, projectName: config.projectName, accessKeyId, accessKeySecret, fetch: config.fetch }) } };
    })),
  };
}

function endpoint(client: StarRouterClient, pollIntervalMs: number, operationTimeoutMs: number, publish: CreateStarRouterProviderOptions["publicAssetUrl"], publicAssets: StarRouterPublicAssets | undefined, asset: SeedanceAssetConfig | undefined): AsyncEndpoint {
  const timedOut = (handle: Handle): boolean => Date.now() - handle.startedAt > operationTimeoutMs;
  const timeout = (handle: Handle): EndpointOutcome => ({ status: "failed", failure: { code: "STARROUTER_OPERATION_TIMEOUT", message: `StarRouter task ${handle.taskId} timed out` }, receipt: { id: handle.taskId } });
  return {
    async start(context) {
      let submitting = false;
      try {
        const route = starRouterRouteForCapability(context.need.capability); assert(route !== undefined, "StarRouter does not implement this capability");
        const prepared = route.prepare(context.need.constraints);
        const body = await prepared.compile(prepared.references.length > 0 ? async (artifact) => artifact.resource : resolverFor(context, publish, publicAssets));
        let init: RequestInit = { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
        if (prepared.references.length > 0) {
          const form = new FormData();
          for (const [name, value] of Object.entries(body)) if (value !== undefined) form.append(name, String(value));
          const field = prepared.references.length > 1 ? "image[]" : "image";
          for (const reference of prepared.references) {
            assert(reference.size <= starRouterMaxReferenceImageBytes, `StarRouter reference ${reference.resource} exceeds 16MB`);
            const bytes = await context.resources.get(reference.resource);
            assert(bytes !== undefined && bytes.byteLength === reference.size, `StarRouter reference ${reference.resource} is unavailable`);
            const part = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
            form.append(field, new Blob([part], { type: reference.mediaType }), reference.resource);
          }
          init = { method: "POST", body: form };
        }
        let response: Record<string, unknown>;
        try { submitting = true; response = await client.json(prepared.path, apiKey(context.credentials), init); submitting = false; }
        catch (error) {
          if (!seedanceFaceRetry(error, route, asset) || init.body instanceof FormData) throw error;
          assert(asset !== undefined, "StarRouter Seedance asset review is unavailable");
          const reviewed = await reviewedSeedanceBody(body, context.credentials, asset);
          submitting = true;
          response = await client.json(prepared.path, apiKey(context.credentials), { ...init, body: JSON.stringify(reviewed) });
          submitting = false;
        }
        if (prepared.media === "image") {
          const data = Array.isArray(response.data) ? response.data.map((item) => object(item, "StarRouter image")) : [];
          const outputs: Output[] = [];
          for (const item of data) {
            if (typeof item.url === "string") outputs.push({ url: item.url });
            else if (typeof item.b64_json === "string") outputs.push({ base64: item.b64_json, mediaType: "image/png" });
          }
          assert(outputs.length > 0, "StarRouter image response has no output");
          const handle: Handle = { contract: "hypit.starrouter-operation@1", taskId: context.operation, route: route.key, startedAt: Date.now(), outputs };
          const receipt = { id: handle.taskId }; await context.checkpoint?.({ handle: canonicalize(handle), receipt });
          return { status: "ready", handle: canonicalize(handle), receipt };
        }
        const taskValue = response.task_id ?? response.id ?? object(response.data ?? {}, "StarRouter response data").task_id ?? object(response.data ?? {}, "StarRouter response data").id;
        const taskId = typeof taskValue === "string" || typeof taskValue === "number" ? String(taskValue).trim() : "";
        if (taskId.length === 0) return failure(new Error(`StarRouter returned a successful submission response without a task id; remote outcome is unknown and this request was not retried: ${responseEvidence(response)}`), "STARROUTER_SUBMISSION_OUTCOME_UNKNOWN");
        const handle: Handle = { contract: "hypit.starrouter-operation@1", taskId, route: route.key, startedAt: Date.now() };
        const receipt = { id: taskId }; await context.checkpoint?.({ handle: canonicalize(handle), receipt });
        return { ...wakeAfter(canonicalize(handle), pollIntervalMs, Date.now(), { phase: "submitted" }), receipt };
      } catch (error) {
        return submitting && networkFailure(error)
          ? failure(new Error(`StarRouter submission response was lost; remote outcome is unknown and this request was not retried: ${error instanceof Error ? error.message : String(error)}`), "STARROUTER_SUBMISSION_OUTCOME_UNKNOWN")
          : failure(error);
      }
    },
    async poll(context) {
      let handle: Handle | undefined;
      try {
        handle = object(context.handle, "StarRouter handle") as unknown as Handle; const route = starRouterRouteForCapability(context.need.capability);
        assert(route !== undefined && route.pollPath !== undefined && handle.contract === "hypit.starrouter-operation@1" && handle.route === route.key, "StarRouter handle is invalid");
        if (timedOut(handle)) return timeout(handle);
        const response = await client.json(route.pollPath(handle.taskId), apiKey(context.credentials));
        const status = String((response.data as { status?: unknown } | undefined)?.status ?? response.status ?? response.state ?? "PENDING").toUpperCase();
        if (["FAILED", "ERROR"].includes(status)) return { status: "failed", failure: { code: "STARROUTER_TASK_FAILED", message: String(response.message ?? "StarRouter task failed") }, receipt: { id: handle.taskId } };
        if (!["SUCCEEDED", "SUCCESS", "DONE", "COMPLETED", "FINISHED"].includes(status)) return { ...wakeAfter(canonicalize(handle), pollIntervalMs, Date.now(), { phase: status.toLowerCase() }), receipt: { id: handle.taskId } };
        const urls = outputUrls(response); assert(urls.length > 0, "StarRouter task completed without output URL");
        return { status: "ready", handle: canonicalize({ ...handle, outputs: urls.map((url) => ({ url })) }), receipt: { id: handle.taskId } };
      } catch (error) {
        if (handle === undefined || !retryable(error)) return failure(error);
        if (timedOut(handle)) return timeout(handle);
        return { ...wakeAfter(canonicalize(handle), pollIntervalMs, Date.now(), { phase: "network-retry" }), receipt: { id: handle.taskId } };
      }
    },
    async collect(context) {
      let handle: Handle | undefined;
      try {
        handle = object(context.handle, "StarRouter handle") as unknown as Handle; const route = starRouterRouteForCapability(context.need.capability);
        assert(route !== undefined && handle.contract === "hypit.starrouter-operation@1" && handle.route === route.key && Array.isArray(handle.outputs), "StarRouter collection handle is invalid");
        const artifacts: BlobRef[] = [];
        for (const output of handle.outputs) {
          if (output.url !== undefined) { const asset = await client.download(output.url); artifacts.push(await context.resources.put(asset.bytes, asset.mediaType)); }
          else { assert(output.base64 !== undefined, "StarRouter output is empty"); artifacts.push(await context.resources.put(Buffer.from(output.base64, "base64"), output.mediaType ?? "image/png")); }
        }
        return { status: "completed", result: { value: route.packageResult(artifacts) }, receipt: { id: handle.taskId } };
      } catch (error) {
        if (handle === undefined || !retryable(error)) return failure(error);
        if (timedOut(handle)) return timeout(handle);
        return { ...wakeAfter(canonicalize(handle), pollIntervalMs, Date.now(), { phase: "download-retry" }), receipt: { id: handle.taskId } };
      }
    },
  };
}

export function createStarRouterProvider(options: CreateStarRouterProviderOptions = {}) {
  const requestTimeoutMs = options.requestTimeoutMs ?? 300_000; const operationTimeoutMs = options.operationTimeoutMs ?? 30 * 60_000;
  const fetcher = options.fetch ?? globalThis.fetch; const client = new StarRouterClient(baseUrl(options.baseUrl ?? "https://starrouter.io"), requestTimeoutMs, fetcher);
  const assetConfigured = options.bytePlusAccessKeyId !== undefined || options.bytePlusAccessKeySecret !== undefined || options.seedanceAssetGroupId !== undefined;
  assert(!assetConfigured || (options.bytePlusAccessKeyId !== undefined && options.bytePlusAccessKeySecret !== undefined && options.seedanceAssetGroupId?.trim()), "StarRouter Seedance face-reference review requires both BytePlus credentials and seedanceAssetGroupId");
  const asset = !assetConfigured ? undefined : { groupId: options.seedanceAssetGroupId!.trim(), projectName: options.seedanceAssetProjectName?.trim() || "hypit", fetch: fetcher };
  const asyncEndpoint = endpoint(client, options.pollIntervalMs ?? 10_000, operationTimeoutMs, options.publicAssetUrl, options.publicAssets, asset);
  const credentials = { apiKey: options.apiKey ?? credentialRef("os", "starrouter.api-key"), ...(asset === undefined ? {} : { bytePlusAccessKeyId: options.bytePlusAccessKeyId!, bytePlusAccessKeySecret: options.bytePlusAccessKeySecret! }), ...(options.publicAssets === undefined ? {} : { publicAssetAccessKeyId: options.publicAssets.accessKeyId, publicAssetSecretAccessKey: options.publicAssets.secretAccessKey, ...(options.publicAssets.sessionToken === undefined ? {} : { publicAssetSessionToken: options.publicAssets.sessionToken }) }) };
  const credentialInputs = { apiKey: { label: "StarRouter API key" }, ...(asset === undefined ? {} : { bytePlusAccessKeyId: { label: "BytePlus Ark access key ID" }, bytePlusAccessKeySecret: { label: "BytePlus Ark access key secret" } }), ...(options.publicAssets === undefined ? {} : { publicAssetAccessKeyId: { label: "Public asset S3 access key ID" }, publicAssetSecretAccessKey: { label: "Public asset S3 secret access key" }, ...(options.publicAssets.sessionToken === undefined ? {} : { publicAssetSessionToken: { label: "Public asset S3 session token" } }) }) };
  const hasPublisher = options.publicAssetUrl !== undefined || options.publicAssets !== undefined;
  return defineEndpointPackage({ module: starRouterProviderModuleRef, facet: "gateway", instance: options.instance ?? "starrouter.default", pool: options.pool ?? options.instance ?? "starrouter.default", pricing: { kind: "page", url: "https://starrouter.io" }, credentials, credentialInputs, defaultConcurrency: options.defaultConcurrency ?? 4, ...(options.actionLimits === undefined ? {} : { actionLimits: options.actionLimits }), capabilities: starRouterRoutes.map((route) => ({ capability: route.capability, returns: route.returns, lifecycle: "asynchronous" as const, endpoint: asyncEndpoint, capacity: route.capability.name, supports: (request) => support(route, hasPublisher, request) })) });
}
