import { createRuntimeEndpointAdapterFacet, runtimeConfigActionLimits, runtimeConfigCredentialRef, runtimeConfigExact, runtimeConfigObject, runtimeConfigPositiveInteger, runtimeConfigString } from "@hypit/runtime-kit";
import { createStarRouterProvider } from "./provider.js";

const adapter = createRuntimeEndpointAdapterFacet({
  use: "@hypit/provider-starrouter",
  activate(context) {
    if (context.pool === undefined) throw new Error("StarRouter Provider Pool is required");
    const config = runtimeConfigObject(context.config, "StarRouter");
    runtimeConfigExact(config, ["baseUrl", "apiKey", "bytePlusAccessKeyId", "bytePlusAccessKeySecret", "seedanceAssetGroupId", "seedanceAssetProjectName", "defaultConcurrency", "actionLimits", "pollIntervalMs", "requestTimeoutMs", "operationTimeoutMs"], "StarRouter");
    const baseUrl = runtimeConfigString(config.baseUrl, "StarRouter baseUrl");
    if (baseUrl !== undefined) { const url = new URL(baseUrl); if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") throw new Error("StarRouter baseUrl must use HTTPS or loopback"); }
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
    return { endpoint: createStarRouterProvider({ instance: context.instance, pool: context.pool, ...(baseUrl === undefined ? {} : { baseUrl }), apiKey, ...(assetConfigured ? { bytePlusAccessKeyId: bytePlusAccessKeyId!, bytePlusAccessKeySecret: bytePlusAccessKeySecret!, seedanceAssetGroupId: seedanceAssetGroupId!, ...(seedanceAssetProjectName === undefined ? {} : { seedanceAssetProjectName }) } : {}), ...(defaultConcurrency === undefined ? {} : { defaultConcurrency }), ...(actionLimits === undefined ? {} : { actionLimits }), ...(pollIntervalMs === undefined ? {} : { pollIntervalMs }), ...(requestTimeoutMs === undefined ? {} : { requestTimeoutMs }), ...(operationTimeoutMs === undefined ? {} : { operationTimeoutMs }) }) };
  },
});
export const hypitPackage = { format: "hypit.node-package@1" as const, hostFacets: [adapter] };
export default hypitPackage;
