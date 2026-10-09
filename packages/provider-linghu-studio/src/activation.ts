import {
  createRuntimeEndpointAdapterFacet,
  runtimeConfigActionLimits,
  runtimeConfigBoolean,
  runtimeConfigCredentialRef,
  runtimeConfigExact,
  runtimeConfigObject,
  runtimeConfigPositiveInteger,
  runtimeConfigString,
} from "@hypit/runtime-kit";

import { createLinghuStudioProvider } from "./provider.js";
import type { LinghuStudioPublicAssets } from "./public-assets.js";

function secureUrl(value: string, subject: string, allowLoopback = false): void {
  const url = new URL(value);
  if (url.protocol !== "https:" && !(allowLoopback && ["localhost", "127.0.0.1"].includes(url.hostname))) {
    throw new Error(`${subject} 必须使用 HTTPS${allowLoopback ? " 或回环地址" : ""}`);
  }
}

function publicAssets(value: Parameters<typeof runtimeConfigObject>[0] | undefined): LinghuStudioPublicAssets | undefined {
  if (value === undefined) return undefined;
  const config = runtimeConfigObject(value, "灵狐工作室 publicAssets");
  runtimeConfigExact(config, ["bucket", "publicBaseUrl", "prefix", "region", "endpoint", "forcePathStyle", "accessKeyId", "secretAccessKey", "sessionToken"], "灵狐工作室 publicAssets");
  const bucket = runtimeConfigString(config.bucket, "灵狐工作室 publicAssets.bucket");
  const publicBaseUrl = runtimeConfigString(config.publicBaseUrl, "灵狐工作室 publicAssets.publicBaseUrl");
  const accessKeyId = runtimeConfigCredentialRef(config.accessKeyId, "灵狐工作室 publicAssets.accessKeyId");
  const secretAccessKey = runtimeConfigCredentialRef(config.secretAccessKey, "灵狐工作室 publicAssets.secretAccessKey");
  if (bucket === undefined || publicBaseUrl === undefined || accessKeyId === undefined || secretAccessKey === undefined) {
    throw new Error("灵狐工作室 publicAssets 需要 bucket、publicBaseUrl、accessKeyId 和 secretAccessKey");
  }
  secureUrl(publicBaseUrl, "灵狐工作室 publicAssets.publicBaseUrl");
  const prefix = runtimeConfigString(config.prefix, "灵狐工作室 publicAssets.prefix");
  const region = runtimeConfigString(config.region, "灵狐工作室 publicAssets.region");
  const endpoint = runtimeConfigString(config.endpoint, "灵狐工作室 publicAssets.endpoint");
  if (endpoint !== undefined) secureUrl(endpoint, "灵狐工作室 publicAssets.endpoint", true);
  const forcePathStyle = runtimeConfigBoolean(config.forcePathStyle, "灵狐工作室 publicAssets.forcePathStyle");
  const sessionToken = runtimeConfigCredentialRef(config.sessionToken, "灵狐工作室 publicAssets.sessionToken");
  return {
    bucket,
    publicBaseUrl,
    accessKeyId,
    secretAccessKey,
    ...(prefix === undefined ? {} : { prefix }),
    ...(region === undefined ? {} : { region }),
    ...(endpoint === undefined ? {} : { endpoint }),
    ...(forcePathStyle === undefined ? {} : { forcePathStyle }),
    ...(sessionToken === undefined ? {} : { sessionToken }),
  };
}

const adapter = createRuntimeEndpointAdapterFacet({
  use: "@hypit/provider-linghu-studio",
  activate(context) {
    if (context.pool === undefined) throw new Error("灵狐工作室 Provider Pool 为必填项");
    const config = runtimeConfigObject(context.config, "灵狐工作室");
    runtimeConfigExact(config, ["baseUrl", "apiKey", "projectId", "models", "publicAssets", "defaultConcurrency", "actionLimits", "pollIntervalMs", "requestTimeoutMs", "operationTimeoutMs"], "灵狐工作室");
    const baseUrl = runtimeConfigString(config.baseUrl, "灵狐工作室 baseUrl");
    if (baseUrl !== undefined) secureUrl(baseUrl, "灵狐工作室 baseUrl", true);
    const apiKey = runtimeConfigCredentialRef(config.apiKey, "灵狐工作室 apiKey");
    if (apiKey === undefined) throw new Error("灵狐工作室 apiKey CredentialRef 为必填项");
    const projectId = runtimeConfigString(config.projectId, "灵狐工作室 projectId");
    if (projectId === undefined) throw new Error("灵狐工作室 projectId 为必填项");
    if (config.models === undefined) throw new Error("灵狐工作室 models 为必填项");
    const modelConfig = runtimeConfigObject(config.models, "灵狐工作室 models");
    const models = Object.fromEntries(Object.entries(modelConfig).map(([capability, value]) => {
      const model = runtimeConfigString(value, `灵狐工作室 models.${capability}`);
      if (model === undefined) throw new Error(`灵狐工作室 models.${capability} 不能为空`);
      return [capability, model];
    }));
    if (Object.keys(models).length === 0) throw new Error("灵狐工作室 models 至少需要配置一项能力映射");
    const defaultConcurrency = runtimeConfigPositiveInteger(config.defaultConcurrency, "灵狐工作室 defaultConcurrency");
    const actionLimits = runtimeConfigActionLimits(config.actionLimits);
    const pollIntervalMs = runtimeConfigPositiveInteger(config.pollIntervalMs, "灵狐工作室 pollIntervalMs");
    const requestTimeoutMs = runtimeConfigPositiveInteger(config.requestTimeoutMs, "灵狐工作室 requestTimeoutMs");
    const operationTimeoutMs = runtimeConfigPositiveInteger(config.operationTimeoutMs, "灵狐工作室 operationTimeoutMs");
    const assets = publicAssets(config.publicAssets);
    return {
      endpoint: createLinghuStudioProvider({
        instance: context.instance,
        pool: context.pool,
        projectId,
        models,
        apiKey,
        ...(baseUrl === undefined ? {} : { baseUrl }),
        ...(assets === undefined ? {} : { publicAssets: assets }),
        ...(defaultConcurrency === undefined ? {} : { defaultConcurrency }),
        ...(actionLimits === undefined ? {} : { actionLimits }),
        ...(pollIntervalMs === undefined ? {} : { pollIntervalMs }),
        ...(requestTimeoutMs === undefined ? {} : { requestTimeoutMs }),
        ...(operationTimeoutMs === undefined ? {} : { operationTimeoutMs }),
      }),
    };
  },
});

export const hypitPackage = { format: "hypit.node-package@1" as const, hostFacets: [adapter] };
export default hypitPackage;
