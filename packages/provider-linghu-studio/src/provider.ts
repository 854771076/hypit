import { requestDeadline } from "@hypit/runtime-kit";
import type { AsyncEndpoint, EndpointCredential, EndpointOutcome } from "@hypit/endpoint-kit";
import { defineEndpointPackage, wakeAfter } from "@hypit/endpoint-kit";
import { canonicalize } from "@hypit/protocol";
import type { BlobRef, CanonicalValue, CapabilityRef } from "@hypit/protocol";
import { credentialRef, decodeOAuth2Credential } from "@hypit/runtime";
import type { CredentialRef, ResourceStore } from "@hypit/runtime";

import { linghuStudioRouteForCapability, linghuStudioRoutes } from "./routes.js";
import type { LinghuStudioCapability } from "./routes.js";
import { createLinghuStudioPublicAssetPublisher } from "./public-assets.js";
import type { LinghuStudioPublicAssets } from "./public-assets.js";

export const linghuStudioProviderModuleRef = { name: "@hypit/provider-linghu-studio", version: "1" } as const;

export type CreateLinghuStudioProviderOptions = {
  readonly instance?: string;
  readonly pool?: string;
  readonly baseUrl?: string;
  readonly apiKey?: CredentialRef;
  readonly projectId: string;
  readonly models?: Readonly<Record<string, string>>;
  readonly publicAssets?: LinghuStudioPublicAssets;
  readonly defaultConcurrency?: number;
  readonly actionLimits?: import("@hypit/endpoint-kit").EndpointActionLimits;
  readonly pollIntervalMs?: number;
  readonly requestTimeoutMs?: number;
  readonly operationTimeoutMs?: number;
  readonly fetch?: typeof globalThis.fetch;
  readonly publicAssetUrl?: (
    artifact: BlobRef,
    resources: ResourceStore,
    fields?: Readonly<Record<string, string | number | boolean>>,
  ) => Promise<string>;
};

type Handle = {
  readonly contract: "hypit.linghu-studio-operation@1";
  readonly taskId: string;
  readonly startedAt: number;
  readonly urls?: readonly string[];
};

// 目录模型条目：除模型 key 外，保留目录接口声明的能力元数据（如 referenceOnly、
// 分辨率/时长枚举），供提交前做本地约束校验，避免把必然失败的请求发到付费接口。
export type LinghuStudioCatalogModel = {
  readonly modelKey: string;
  /** capabilities 下与当前能力对应的一段元数据；字段由远端目录决定，按需读取。 */
  readonly capabilities: Readonly<Record<string, unknown>>;
};

function optionalRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

class LinghuStudioHttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function object(value: unknown, subject: string): Record<string, unknown> {
  assert(value !== null && typeof value === "object" && !Array.isArray(value), `${subject} must be an object`);
  return value as Record<string, unknown>;
}

function key(credentials: Readonly<Record<string, EndpointCredential>>): string {
  const value = credentials.apiKey?.secret;
  assert(typeof value === "string" && value.length > 0, "灵狐工作室 API Key 不可用");
  const oauth = decodeOAuth2Credential(value);
  if (oauth === undefined) return value;
  assert(oauth.expiresAt === undefined || oauth.expiresAt > Date.now(), "灵狐工作室登录已过期，请重新执行 hypit auth login");
  return oauth.accessToken;
}

function normalizeBaseUrl(value: string): string {
  const url = new URL(value.trim().replace(/\/+$/u, ""));
  assert(url.protocol === "https:" || ["localhost", "127.0.0.1"].includes(url.hostname), "灵狐工作室 baseUrl 必须使用 HTTPS 或回环地址");
  return url.toString().replace(/\/+$/u, "");
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function failure(error: unknown, code = "LINGHU_STUDIO_ERROR"): EndpointOutcome {
  return { status: "failed", failure: { code, message: message(error) } };
}

function networkFailure(error: unknown): boolean {
  return error instanceof TypeError || (error instanceof Error && (
    error.name === "AbortError"
    || error.name === "TimeoutError"
    || /fetch failed|network|socket|ECONN|ETIMEDOUT|EAI_AGAIN/iu.test(error.message)
  ));
}

function retryable(error: unknown): boolean {
  return networkFailure(error) || (error instanceof LinghuStudioHttpError && (
    error.status === 408 || error.status === 429 || error.status >= 500
  ));
}

function capabilityKey(capability: CapabilityRef): string {
  return `${capability.module.name}@${capability.module.version}#${capability.name}`;
}

class LinghuStudioClient {
  constructor(
    readonly baseUrl: string,
    readonly timeoutMs: number,
    readonly fetcher: typeof globalThis.fetch,
  ) {}

  async json(path: string, apiKey: string, init: RequestInit = {}): Promise<Record<string, unknown>> {
    const deadline = requestDeadline(this.timeoutMs);
    try {
      const response = await deadline.wait(this.fetcher(new URL(path, `${this.baseUrl}/`).toString(), {
        ...init,
        signal: deadline.signal,
        headers: {
          accept: "application/json",
          authorization: `Bearer ${apiKey}`,
          ...(init.headers ?? {}),
        },
      }));
      const text = await deadline.wait(response.text());
      let body: unknown;
      try {
        body = text.length === 0 ? {} : JSON.parse(text);
      } catch {
        throw new Error(`灵狐工作室返回了无效 JSON（HTTP ${response.status}）`);
      }
      if (!response.ok) {
        const record = body !== null && typeof body === "object" && !Array.isArray(body)
          ? body as Record<string, unknown>
          : {};
        const detail = record.error !== null && typeof record.error === "object"
          ? (record.error as Record<string, unknown>).message
          : record.message;
        throw new LinghuStudioHttpError(response.status, `灵狐工作室请求失败（HTTP ${response.status}）：${String(detail ?? text).slice(0, 500)}`);
      }
      return object(body, "灵狐工作室响应");
    } finally {
      deadline.finish();
    }
  }

  async catalog(capability: LinghuStudioCapability, apiKey: string): Promise<ReadonlyMap<string, LinghuStudioCatalogModel>> {
    const response = await this.json(`/api/v1/models/${capability}`, apiKey);
    const models = Array.isArray(response.models) ? response.models : [];
    const entries = new Map<string, LinghuStudioCatalogModel>();
    for (const item of models) {
      const model = optionalRecord(item);
      const modelKey = typeof model?.modelKey === "string" ? model.modelKey.trim() : "";
      // 只登记目录明确启用且带 modelKey 的模型；其余（含 disabled）视为不可用。
      if (model === undefined || model.enabled === false || modelKey.length === 0) continue;
      entries.set(modelKey, {
        modelKey,
        capabilities: optionalRecord(optionalRecord(model.capabilities)?.[capability]) ?? {},
      });
    }
    return entries;
  }

  async download(url: string): Promise<{ readonly bytes: Uint8Array; readonly mediaType: string }> {
    const deadline = requestDeadline(this.timeoutMs);
    try {
      const response = await deadline.wait(this.fetcher(new URL(url, `${this.baseUrl}/`).toString(), { signal: deadline.signal }));
      if (!response.ok) throw new LinghuStudioHttpError(response.status, `灵狐工作室媒体下载失败（HTTP ${response.status}）`);
      return {
        bytes: new Uint8Array(await deadline.wait(response.arrayBuffer())),
        mediaType: response.headers.get("content-type")?.split(";", 1)[0] ?? "application/octet-stream",
      };
    } finally {
      deadline.finish();
    }
  }
}

function resultUrls(result: Record<string, unknown>, capability: "image" | "video"): string[] {
  const key = capability === "image" ? "imageUrl" : "videoUrl";
  const value = result[key];
  const singular = typeof value === "string" && value.length > 0 ? [value] : [];
  const plural = capability === "image" && Array.isArray(result.imageUrls)
    ? result.imageUrls.filter((item): item is string => typeof item === "string" && item.length > 0)
    : [];
  return [...new Set([...singular, ...plural])];
}

// 判定请求是否携带任何参考素材端口（参考图/视频/音频、首尾帧）。
// support() 的公开素材检查与 start() 的 referenceOnly 约束必须共用同一判定口径。
function hasReferenceAssets(
  route: (typeof linghuStudioRoutes)[number],
  constraints: CanonicalValue,
): boolean {
  const ports = (constraints as unknown as { readonly ports?: Readonly<Record<string, readonly unknown[]>> }).ports ?? {};
  return Object.entries(route.fields).some(([port, field]) => (
    (field.as === "url" || field.as === "urlArray" || field.as === "itemObject") && (ports[port]?.length ?? 0) > 0
  ));
}

function support(route: (typeof linghuStudioRoutes)[number], options: {
  readonly model?: string;
  readonly hasPublisher: boolean;
}, request: import("@hypit/endpoint-kit").EndpointRequest): import("@hypit/endpoint-kit").EndpointSupport {
  if (options.model === undefined || options.model.trim().length === 0) {
    return { status: "unsupported", reason: `灵狐工作室未配置 ${route.key} 对应的目录模型 key` };
  }
  const base = route.supports(request);
  if (base.status === "unsupported" || options.hasPublisher) return base;
  return hasReferenceAssets(route, request.constraints)
    ? { status: "unsupported", reason: "灵狐工作室参考素材需要配置 publicAssets 公开素材发布器" }
    : base;
}

function endpoint(options: {
  readonly client: LinghuStudioClient;
  readonly projectId: string;
  readonly models: Readonly<Record<string, string>>;
  readonly pollIntervalMs: number;
  readonly operationTimeoutMs: number;
  readonly publicAssetUrl?: CreateLinghuStudioProviderOptions["publicAssetUrl"];
  readonly publicAssets?: LinghuStudioPublicAssets;
}): AsyncEndpoint {
  const timedOut = (handle: Handle) => Date.now() - handle.startedAt > options.operationTimeoutMs;
  const timeout = (handle: Handle): EndpointOutcome => ({
    status: "failed",
    failure: { code: "LINGHU_STUDIO_OPERATION_TIMEOUT", message: `灵狐工作室任务 ${handle.taskId} 超时` },
    receipt: { id: handle.taskId },
  });
  return {
    async start(context) {
      let submitting = false;
      try {
        const route = linghuStudioRouteForCapability(context.need.capability);
        assert(route !== undefined, "灵狐工作室不支持当前能力");
        const publisher = options.publicAssetUrl
          ?? (options.publicAssets === undefined ? undefined : createLinghuStudioPublicAssetPublisher(options.publicAssets, context.credentials));
        const resolve = async (artifact: BlobRef, fields?: Readonly<Record<string, string | number | boolean>>) => {
          assert(publisher !== undefined, "灵狐工作室参考素材要求配置公网素材发布器");
          return await publisher(artifact, context.resources, fields);
        };
        const prepared = await route.prepare(
          context.need.constraints,
          resolve,
          options.models[capabilityKey(context.need.capability)],
        );
        const catalog = await options.client.catalog(prepared.capability, key(context.credentials));
        const catalogModel = catalog.get(prepared.model);
        assert(catalogModel !== undefined, `灵狐工作室目录中不存在或未启用模型 ${prepared.model}`);
        // 目录声明 referenceOnly 的模型只能做参考素材生成；这里在付费提交前拦下纯文本请求。
        assert(
          catalogModel.capabilities.referenceOnly !== true || hasReferenceAssets(route, context.need.constraints),
          `灵狐工作室模型 ${prepared.model} 仅支持参考素材生成（referenceOnly），当前请求没有参考图/视频/音频或首尾帧`,
        );
        const requestBody = object(prepared.body, "灵狐工作室请求");
        submitting = true;
        const response = await options.client.json(`/api/v1/models/${prepared.capability}`, key(context.credentials), {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "idempotency-key": context.operation,
          },
          body: JSON.stringify({ projectId: options.projectId, ...requestBody }),
        });
        submitting = false;
        const taskId = typeof response.taskId === "string" ? response.taskId.trim() : "";
        assert(taskId.length > 0, "灵狐工作室提交响应缺少 taskId");
        const handle: Handle = {
          contract: "hypit.linghu-studio-operation@1",
          taskId,
          startedAt: Date.now(),
        };
        const receipt = { id: taskId };
        await context.checkpoint?.({ handle: canonicalize(handle), receipt });
        return { ...wakeAfter(canonicalize(handle), options.pollIntervalMs, Date.now(), { phase: "submitted" }), receipt };
      } catch (error) {
        return submitting && networkFailure(error)
          ? failure(new Error(`灵狐工作室提交响应丢失；远端结果未知，未自动重复提交：${message(error)}`), "LINGHU_STUDIO_SUBMISSION_OUTCOME_UNKNOWN")
          : failure(error);
      }
    },
    async poll(context) {
      let handle: Handle | undefined;
      try {
        handle = object(context.handle, "灵狐工作室 handle") as unknown as Handle;
        assert(handle.contract === "hypit.linghu-studio-operation@1", "灵狐工作室 handle 无效");
        if (timedOut(handle)) return timeout(handle);
        const response = await options.client.json(`/api/v1/tasks/${encodeURIComponent(handle.taskId)}`, key(context.credentials));
        // 兼容 API 直接返回任务对象和使用 task 包装任务对象的两个版本。
        const task = object(response.task ?? response, "灵狐工作室任务");
        const status = String(task.status ?? "").toLowerCase();
        if (["queued", "processing", "pending", "running"].includes(status)) {
          return { ...wakeAfter(canonicalize(handle), options.pollIntervalMs, Date.now(), { phase: status }), receipt: { id: handle.taskId } };
        }
        if (["failed", "canceled", "cancelled"].includes(status)) {
          const error = task.error !== null && typeof task.error === "object" ? task.error as Record<string, unknown> : {};
          return {
            status: "failed",
            failure: {
              code: status === "failed" ? "LINGHU_STUDIO_TASK_FAILED" : "LINGHU_STUDIO_TASK_CANCELED",
              message: String(error.message ?? `灵狐工作室任务状态为 ${status}`),
            },
            receipt: { id: handle.taskId },
          };
        }
        assert(["completed", "succeeded"].includes(status), `灵狐工作室返回未知任务状态：${status || "empty"}`);
        const route = linghuStudioRouteForCapability(context.need.capability);
        assert(route !== undefined, "灵狐工作室不支持当前能力");
        const result = object(task.result, "灵狐工作室任务结果");
        const urls = resultUrls(result, route.result);
        assert(urls.length > 0, "灵狐工作室任务已完成但没有媒体结果 URL");
        return {
          status: "ready",
          handle: canonicalize({ ...handle, urls }),
          receipt: { id: handle.taskId },
        };
      } catch (error) {
        if (handle !== undefined && retryable(error)) {
          return { ...wakeAfter(canonicalize(handle), options.pollIntervalMs, Date.now(), { phase: "network-retry" }), receipt: { id: handle.taskId } };
        }
        return failure(error);
      }
    },
    async collect(context) {
      let handle: Handle | undefined;
      try {
        handle = object(context.handle, "灵狐工作室 handle") as unknown as Handle;
        assert(handle.contract === "hypit.linghu-studio-operation@1" && Array.isArray(handle.urls), "灵狐工作室收集 handle 无效");
        if (timedOut(handle)) return timeout(handle);
        const route = linghuStudioRouteForCapability(context.need.capability);
        assert(route !== undefined, "灵狐工作室不支持当前能力");
        const artifacts: BlobRef[] = [];
        for (const url of handle.urls) {
          const downloaded = await options.client.download(url);
          artifacts.push(await context.resources.put(downloaded.bytes, downloaded.mediaType));
        }
        return {
          status: "completed",
          result: { value: route.packageResult(artifacts) },
          receipt: { id: handle.taskId },
        };
      } catch (error) {
        if (handle === undefined || !retryable(error)) return failure(error);
        if (timedOut(handle)) return timeout(handle);
        return {
          ...wakeAfter(canonicalize(handle), options.pollIntervalMs, Date.now(), { phase: "download-retry" }),
          receipt: { id: handle.taskId },
        };
      }
    },
  };
}

export function createLinghuStudioProvider(options: CreateLinghuStudioProviderOptions) {
  assert(options.projectId.trim().length > 0, "灵狐工作室 projectId 不能为空");
  const baseUrl = normalizeBaseUrl(options.baseUrl ?? "https://ai-short-studio.vvicat.dev");
  const client = new LinghuStudioClient(
    baseUrl,
    options.requestTimeoutMs ?? 300_000,
    options.fetch ?? globalThis.fetch,
  );
  const asyncEndpoint = endpoint({
    client,
    projectId: options.projectId.trim(),
    models: options.models ?? {},
    pollIntervalMs: options.pollIntervalMs ?? 5_000,
    operationTimeoutMs: options.operationTimeoutMs ?? 30 * 60_000,
    ...(options.publicAssetUrl === undefined ? {} : { publicAssetUrl: options.publicAssetUrl }),
    ...(options.publicAssets === undefined ? {} : { publicAssets: options.publicAssets }),
  });
  const publicAssetCredentials = options.publicAssets === undefined ? {} : {
    publicAssetAccessKeyId: options.publicAssets.accessKeyId,
    publicAssetSecretAccessKey: options.publicAssets.secretAccessKey,
    ...(options.publicAssets.sessionToken === undefined ? {} : { publicAssetSessionToken: options.publicAssets.sessionToken }),
  };
  return defineEndpointPackage({
    module: linghuStudioProviderModuleRef,
    facet: "gateway",
    instance: options.instance ?? "linghu-studio.default",
    pool: options.pool ?? options.instance ?? "linghu-studio.default",
    pricing: { kind: "page", url: "https://ai-short-studio.vvicat.dev" },
    credentials: { apiKey: options.apiKey ?? credentialRef("os", "linghu-studio.api-key"), ...publicAssetCredentials },
    credentialInputs: {
      apiKey: {
        label: "灵狐工作室账户",
        acquisition: {
          kind: "oauth2-pkce",
          authorizationEndpoint: `${baseUrl}/api/sso/memhub/start`,
          tokenEndpoint: `${baseUrl}/api/v1/auth/cli/token`,
          clientId: "hypit-cli",
          scopes: ["cli:access"],
          authorizationParameters: { mode: "cli" },
          tokenExchange: "json-code-verifier",
          requestTimeoutMs: options.requestTimeoutMs ?? 300_000,
        },
      },
      ...(options.publicAssets === undefined ? {} : {
        publicAssetAccessKeyId: { label: "公开素材存储 Access Key ID" },
        publicAssetSecretAccessKey: { label: "公开素材存储 Secret Access Key" },
        ...(options.publicAssets.sessionToken === undefined ? {} : { publicAssetSessionToken: { label: "公开素材存储 Session Token" } }),
      }),
    },
    defaultConcurrency: options.defaultConcurrency ?? 2,
    ...(options.actionLimits === undefined ? {} : { actionLimits: options.actionLimits }),
    capabilities: linghuStudioRoutes.map((route) => ({
      capability: route.capability,
      returns: route.returns,
      lifecycle: "asynchronous" as const,
      endpoint: asyncEndpoint,
      capacity: route.result,
      supports: (request) => support(route, {
        ...(options.models?.[route.key] === undefined ? {} : { model: options.models[route.key] }),
        hasPublisher: options.publicAssetUrl !== undefined || options.publicAssets !== undefined,
      }, request),
    })),
  });
}
