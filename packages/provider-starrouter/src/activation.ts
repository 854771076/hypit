import { createRuntimeEndpointAdapterFacet, runtimeConfigActionLimits, runtimeConfigBoolean, runtimeConfigCredentialRef, runtimeConfigExact, runtimeConfigObject, runtimeConfigPositiveInteger, runtimeConfigString } from "@hypit/runtime-kit";
import { createStarRouterProvider } from "./provider.js";
import type { StarRouterPublicAssets } from "./public-assets.js";

function https(value: string, subject: string, allowLoopback = false): void {
  const url = new URL(value);
  if (url.protocol !== "https:" && !(allowLoopback && ["localhost", "127.0.0.1"].includes(url.hostname))) throw new Error(`${subject} must use HTTPS${allowLoopback ? " or loopback" : ""}`);
}

function publicAssets(value: Parameters<typeof runtimeConfigObject>[0] | undefined): StarRouterPublicAssets | undefined {
  if (value === undefined) return undefined;
  const config = runtimeConfigObject(value, "StarRouter publicAssets");
  runtimeConfigExact(config, ["bucket", "publicBaseUrl", "prefix", "region", "endpoint", "forcePathStyle", "accessKeyId", "secretAccessKey", "sessionToken"], "StarRouter publicAssets");
  const bucket = runtimeConfigString(config.bucket, "StarRouter publicAssets.bucket");
  const publicBaseUrl = runtimeConfigString(config.publicBaseUrl, "StarRouter publicAssets.publicBaseUrl");
  const accessKeyId = runtimeConfigCredentialRef(config.accessKeyId, "StarRouter publicAssets.accessKeyId");
  const secretAccessKey = runtimeConfigCredentialRef(config.secretAccessKey, "StarRouter publicAssets.secretAccessKey");
  if (bucket === undefined || publicBaseUrl === undefined || accessKeyId === undefined || secretAccessKey === undefined) throw new Error("StarRouter publicAssets requires bucket, publicBaseUrl, accessKeyId and secretAccessKey");
  https(publicBaseUrl, "StarRouter publicAssets.publicBaseUrl");
  const prefix = runtimeConfigString(config.prefix, "StarRouter publicAssets.prefix");
  const region = runtimeConfigString(config.region, "StarRouter publicAssets.region");
  const endpoint = runtimeConfigString(config.endpoint, "StarRouter publicAssets.endpoint");
  if (endpoint !== undefined) https(endpoint, "StarRouter publicAssets.endpoint", true);
  const forcePathStyle = runtimeConfigBoolean(config.forcePathStyle, "StarRouter publicAssets.forcePathStyle");
  const sessionToken = runtimeConfigCredentialRef(config.sessionToken, "StarRouter publicAssets.sessionToken");
  return { bucket, publicBaseUrl, accessKeyId, secretAccessKey, ...(prefix === undefined ? {} : { prefix }), ...(region === undefined ? {} : { region }), ...(endpoint === undefined ? {} : { endpoint }), ...(forcePathStyle === undefined ? {} : { forcePathStyle }), ...(sessionToken === undefined ? {} : { sessionToken }) };
}

const adapter = createRuntimeEndpointAdapterFacet({
  use: "@hypit/provider-starrouter",
  activate(context) {
    if (context.pool === undefined) throw new Error("StarRouter Provider Pool is required");
    const config = runtimeConfigObject(context.config, "StarRouter");
    runtimeConfigExact(config, ["baseUrl", "apiKey", "publicAssets", "bytePlusAccessKeyId", "bytePlusAccessKeySecret", "seedanceAssetGroupId", "seedanceAssetProjectName", "defaultConcurrency", "actionLimits", "pollIntervalMs", "requestTimeoutMs", "operationTimeoutMs"], "StarRouter");
    const baseUrl = runtimeConfigString(config.baseUrl, "StarRouter baseUrl");
    if (baseUrl !== undefined) https(baseUrl, "StarRouter baseUrl", true);
    const apiKey = runtimeConfigCredentialRef(config.apiKey, "StarRouter apiKey"); if (apiKey === undefined) throw new Error("StarRouter apiKey CredentialRef is required");
    const bytePlusAccessKeyId = runtimeConfigCredentialRef(config.bytePlusAccessKeyId, "StarRouter BytePlus access key ID");
    const bytePlusAccessKeySecret = runtimeConfigCredentialRef(config.bytePlusAccessKeySecret, "StarRouter BytePlus access key secret");
    const seedanceAssetGroupId = runtimeConfigString(config.seedanceAssetGroupId, "StarRouter seedanceAssetGroupId");
    const seedanceAssetProjectName = runtimeConfigString(config.seedanceAssetProjectName, "StarRouter seedanceAssetProjectName");
    const assetConfigured = bytePlusAccessKeyId !== undefined || bytePlusAccessKeySecret !== undefined || seedanceAssetGroupId !== undefined;
    if (assetConfigured && (bytePlusAccessKeyId === undefined || bytePlusAccessKeySecret === undefined || seedanceAssetGroupId === undefined)) throw new Error("StarRouter Seedance face-reference review requires bytePlusAccessKeyId, bytePlusAccessKeySecret and seedanceAssetGroupId");
    const actionLimits = runtimeConfigActionLimits(config.actionLimits);
    const defaultConcurrency = runtimeConfigPositiveInteger(config.defaultConcurrency, "StarRouter defaultConcurrency");
    const pollIntervalMs = runtimeConfigPositiveInteger(config.pollIntervalMs, "StarRouter pollIntervalMs");
    const requestTimeoutMs = runtimeConfigPositiveInteger(config.requestTimeoutMs, "StarRouter requestTimeoutMs");
    const operationTimeoutMs = runtimeConfigPositiveInteger(config.operationTimeoutMs, "StarRouter operationTimeoutMs");
    const publishedAssets = publicAssets(config.publicAssets);
    return { endpoint: createStarRouterProvider({ instance: context.instance, pool: context.pool, ...(baseUrl === undefined ? {} : { baseUrl }), apiKey, ...(publishedAssets === undefined ? {} : { publicAssets: publishedAssets }), ...(assetConfigured ? { bytePlusAccessKeyId: bytePlusAccessKeyId!, bytePlusAccessKeySecret: bytePlusAccessKeySecret!, seedanceAssetGroupId: seedanceAssetGroupId!, ...(seedanceAssetProjectName === undefined ? {} : { seedanceAssetProjectName }) } : {}), ...(defaultConcurrency === undefined ? {} : { defaultConcurrency }), ...(actionLimits === undefined ? {} : { actionLimits }), ...(pollIntervalMs === undefined ? {} : { pollIntervalMs }), ...(requestTimeoutMs === undefined ? {} : { requestTimeoutMs }), ...(operationTimeoutMs === undefined ? {} : { operationTimeoutMs }) }) };
  },
});
export const hypitPackage = { format: "hypit.node-package@1" as const, hostFacets: [adapter] };
export default hypitPackage;
