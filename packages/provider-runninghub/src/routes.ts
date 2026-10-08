import { generationTypes, sealGeneratedVideoSet } from "@hypit/generation";
import type { GenerationRequest } from "@hypit/generation";
import { canonicalize } from "@hypit/protocol";
import type { BlobRef, CapabilityRef, CanonicalValue, StoredValue, TypeRef } from "@hypit/protocol";
import type { EndpointRequest, EndpointSupport } from "@hypit/endpoint-kit";

const capability = { module: { name: "@hypit/minimax-h3", version: "1" }, name: "minimax-h3" } as const;
export const runningHubMaxUploadBytes = 200 * 1024 * 1024;
const ratios: Readonly<Record<string, string>> = { "16:9": "16:9 (Widescreen)", "9:16": "9:16 (Portrait Widescreen)" };
const megapixels: Readonly<Record<string, number>> = { "768P": 0.9, "2K": 2 };

export type RunningHubInputs =
  | { readonly kind: "minimax-h3"; readonly prompt: string; readonly duration: number; readonly aspectRatio: string; readonly megapixels: number; readonly assets: readonly BlobRef[] }
  | { readonly kind: "depth-video"; readonly assets: readonly BlobRef[] };
export type RunningHubPreparedRequest = { readonly workflowId: string; readonly inputs: RunningHubInputs };
export type RunningHubRoute = {
  readonly capability: CapabilityRef;
  readonly returns: TypeRef;
  readonly supports: (request: EndpointRequest) => EndpointSupport;
  readonly prepare: (constraints: CanonicalValue) => RunningHubPreparedRequest;
  readonly packageResult: (artifacts: readonly BlobRef[]) => StoredValue;
};

function scalar(request: GenerationRequest, port: string): string | number | undefined {
  const value = request.ports[port]?.[0];
  return typeof value === "string" || typeof value === "number" ? value : undefined;
}
function artifact(item: unknown): BlobRef | undefined {
  return typeof item === "object" && item !== null ? (item as { artifact?: BlobRef }).artifact : undefined;
}
function assets(request: GenerationRequest, port: string): BlobRef[] {
  return (request.ports[port] ?? []).map((item, index) => {
    const value = artifact(item);
    if (value === undefined) throw new Error(`RunningHub ${port}[${index}] reference is unresolved`);
    return value;
  });
}
function rejection(request: GenerationRequest): string | undefined {
  const ratio = String(scalar(request, "aspectRatio") ?? "16:9");
  if (ratios[ratio] === undefined) return `RunningHub MiniMax H3 supports only 16:9 and 9:16, not ${ratio}`;
  const duration = Number(scalar(request, "duration"));
  if (!Number.isInteger(duration) || duration < 4 || duration > 15) return "RunningHub MiniMax H3 duration must be 4–15 seconds";
  if (count(request, "referenceImage") + count(request, "firstFrame") + count(request, "lastFrame") > 9) return "RunningHub MiniMax H3 accepts at most 9 images";
  if (count(request, "referenceVideo") > 2) return "RunningHub MiniMax H3 accepts at most 2 videos";
  if (count(request, "referenceAudio") > 2) return "RunningHub MiniMax H3 accepts at most 2 audio references";
  for (const port of ["firstFrame", "lastFrame", "referenceImage", "referenceVideo", "referenceAudio"]) {
    if ((request.ports[port] ?? []).some((item) => (artifact(item)?.size ?? 0) > runningHubMaxUploadBytes)) {
      return "RunningHub reference media must not exceed 200MB per item";
    }
  }
  return undefined;
}
function count(request: GenerationRequest, port: string): number { return request.ports[port]?.length ?? 0; }

export const runningHubRoutes: readonly RunningHubRoute[] = [{
  capability,
  returns: generationTypes.videoSet,
  supports: (request) => {
    const reason = rejection(request.constraints as unknown as GenerationRequest);
    return reason === undefined ? { status: "supported" } : { status: "unsupported", reason };
  },
  prepare: (constraints) => {
    const request = constraints as unknown as GenerationRequest;
    const reason = rejection(request);
    if (reason !== undefined) throw new Error(reason);
    const ratio = String(scalar(request, "aspectRatio") ?? "16:9");
    const resolution = String(scalar(request, "resolution") ?? "768P");
    return {
      workflowId: "2086743729407733762",
      inputs: {
        kind: "minimax-h3",
        prompt: String(scalar(request, "prompt") ?? ""), duration: Math.max(5, Number(scalar(request, "duration"))),
        aspectRatio: ratios[ratio]!, megapixels: megapixels[resolution] ?? megapixels["768P"]!,
        assets: [
          ...assets(request, "firstFrame"), ...assets(request, "lastFrame"), ...assets(request, "referenceImage"),
          ...assets(request, "referenceVideo"), ...assets(request, "referenceAudio"),
        ],
      },
    };
  },
  packageResult: (artifacts) => ({ kind: "inline", value: canonicalize(sealGeneratedVideoSet({ videos: artifacts })) }),
}, {
  capability: { module: { name: "@hypit/depth-video", version: "1" }, name: "depth-video" },
  returns: generationTypes.videoSet,
  supports: (endpointRequest) => {
    const request = endpointRequest.constraints as unknown as GenerationRequest;
    const inputs = request.ports.source ?? [];
    if (inputs.length !== 1) {
      return { status: "unsupported", reason: "RunningHub depth video requires exactly one video source" };
    }
    const source = artifact(inputs[0]);
    if (source === undefined) return { status: "supported" };
    if (!source.mediaType.startsWith("video/")) return { status: "unsupported", reason: "RunningHub depth video requires exactly one video source" };
    return source.size <= runningHubMaxUploadBytes
      ? { status: "supported" }
      : { status: "unsupported", reason: "RunningHub source video must not exceed 200MB" };
  },
  prepare: (constraints) => {
    const request = constraints as unknown as GenerationRequest;
    const source = assets(request, "source");
    if (source.length !== 1 || !source[0]!.mediaType.startsWith("video/")) throw new Error("RunningHub depth video requires exactly one video source");
    if (source[0]!.size > runningHubMaxUploadBytes) throw new Error("RunningHub source video must not exceed 200MB");
    return { workflowId: "2098674379113979905", inputs: { kind: "depth-video", assets: source } };
  },
  packageResult: (artifacts) => ({ kind: "inline", value: canonicalize(sealGeneratedVideoSet({ videos: artifacts })) }),
}];

function capabilityKey(value: CapabilityRef): string { return `${value.module.name}@${value.module.version}#${value.name}`; }
const byCapability = new Map(runningHubRoutes.map((route) => [capabilityKey(route.capability), route]));
export function runningHubRouteForCapability(value: CapabilityRef): RunningHubRoute | undefined { return byCapability.get(capabilityKey(value)); }
