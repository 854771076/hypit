import { createRuntimeEndpointAdapterFacet, runtimeConfigActionLimits, runtimeConfigCredentialRef, runtimeConfigExact, runtimeConfigObject, runtimeConfigPositiveInteger, runtimeConfigString } from "@hypit/runtime-kit";
import { createRunningHubProvider } from "./provider.js";

const adapter = createRuntimeEndpointAdapterFacet({
  use: "@hypit/provider-runninghub",
  activate(context) {
    if (context.pool === undefined) throw new Error("RunningHub Provider Pool is required"); const config = runtimeConfigObject(context.config, "RunningHub");
    runtimeConfigExact(config, ["baseUrl", "apiKey", "workflowId", "defaultConcurrency", "actionLimits", "pollIntervalMs", "requestTimeoutMs", "operationTimeoutMs"], "RunningHub");
    const apiKey = runtimeConfigCredentialRef(config.apiKey, "RunningHub apiKey"); if (apiKey === undefined) throw new Error("RunningHub apiKey CredentialRef is required"); const actionLimits = runtimeConfigActionLimits(config.actionLimits);
    const baseUrl = runtimeConfigString(config.baseUrl, "RunningHub baseUrl");
    if (baseUrl !== undefined) { const url = new URL(baseUrl); if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") throw new Error("RunningHub baseUrl must use HTTPS or loopback"); }
    const workflowId = runtimeConfigString(config.workflowId, "RunningHub workflowId"); const defaultConcurrency = runtimeConfigPositiveInteger(config.defaultConcurrency, "RunningHub defaultConcurrency"); const pollIntervalMs = runtimeConfigPositiveInteger(config.pollIntervalMs, "RunningHub pollIntervalMs"); const requestTimeoutMs = runtimeConfigPositiveInteger(config.requestTimeoutMs, "RunningHub requestTimeoutMs"); const operationTimeoutMs = runtimeConfigPositiveInteger(config.operationTimeoutMs, "RunningHub operationTimeoutMs");
    return { endpoint: createRunningHubProvider({ instance: context.instance, pool: context.pool, apiKey, ...(baseUrl === undefined ? {} : { baseUrl }), ...(workflowId === undefined ? {} : { workflowId }), ...(defaultConcurrency === undefined ? {} : { defaultConcurrency }), ...(actionLimits === undefined ? {} : { actionLimits }), ...(pollIntervalMs === undefined ? {} : { pollIntervalMs }), ...(requestTimeoutMs === undefined ? {} : { requestTimeoutMs }), ...(operationTimeoutMs === undefined ? {} : { operationTimeoutMs }) }) };
  },
});
export const hypitPackage = { format: "hypit.node-package@1" as const, hostFacets: [adapter] };
export default hypitPackage;
