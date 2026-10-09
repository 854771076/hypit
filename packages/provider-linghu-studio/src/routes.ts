import {
  compileWireRequest,
  generationTypes,
  sealGeneratedImageSet,
  sealGeneratedVideoSet,
  selectWireModelForRequest,
} from "@hypit/generation";
import type { GenerationArtifactUrlResolver, GenerationRequest } from "@hypit/generation";
import { canonicalize } from "@hypit/protocol";
import type { BlobRef, CapabilityRef, CanonicalValue, StoredValue, TypeRef } from "@hypit/protocol";
import type { EndpointRequest, EndpointSupport } from "@hypit/endpoint-kit";

import { linghuStudioMappings } from "./mapping.js";
import type { LinghuStudioMapping } from "./mapping.js";

export type LinghuStudioCapability = "image" | "video";
export type LinghuStudioPreparedRequest = { readonly capability: LinghuStudioCapability; readonly model: string; readonly body: CanonicalValue };
export type LinghuStudioRoute = LinghuStudioMapping & {
  readonly key: string;
  readonly returns: TypeRef;
  readonly supports: (request: EndpointRequest) => EndpointSupport;
  readonly prepare: (constraints: CanonicalValue, resolve: GenerationArtifactUrlResolver, modelOverride?: string) => Promise<LinghuStudioPreparedRequest>;
  readonly packageResult: (artifacts: readonly BlobRef[]) => StoredValue;
};

function capabilityKey(value: CapabilityRef): string { return `${value.module.name}@${value.module.version}#${value.name}`; }
function scalar(input: Record<string, unknown>, name: string): string | number | boolean | undefined {
  const item = input[name];
  return typeof item === "string" || typeof item === "number" || typeof item === "boolean" ? item : undefined;
}
function strings(input: Record<string, unknown>, name: string): string[] {
  const item = input[name];
  if (!Array.isArray(item)) return [];
  return item.flatMap((entry) => {
    if (typeof entry === "string" && entry.length > 0) return [entry];
    if (entry !== null && typeof entry === "object" && typeof (entry as { url?: unknown }).url === "string") return [(entry as { url: string }).url];
    return [];
  });
}
function compact(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && (!Array.isArray(item) || item.length > 0)));
}
function videoBody(model: string, input: Record<string, unknown>): CanonicalValue {
  const referenceImages = [...strings(input, "reference_image_urls"), ...strings(input, "reference_images")];
  const firstFrame = scalar(input, "first_frame");
  return canonicalize({ model, prompt: String(scalar(input, "prompt") ?? ""),
    ...(typeof firstFrame === "string" ? { imageUrl: firstFrame } : referenceImages.length > 0 ? { imageUrl: referenceImages[0] } : {}),
    options: compact({ resolution: scalar(input, "resolution"), aspectRatio: scalar(input, "aspect_ratio"), duration: scalar(input, "seconds"),
      generateAudio: scalar(input, "generate_audio"), webSearch: scalar(input, "web_search"), lastFrameImageUrl: scalar(input, "last_frame"),
      multiClip: scalar(input, "multi_clip"), seed: scalar(input, "seed"),
      videoReferenceImages: referenceImages, videoReferenceVideos: strings(input, "reference_videos"), videoReferenceAudios: strings(input, "reference_audios") }) });
}
function imageBody(model: string, input: Record<string, unknown>): CanonicalValue {
  return canonicalize({ model, prompt: String(scalar(input, "prompt") ?? ""), referenceImages: strings(input, "reference_images"),
    options: compact({ aspectRatio: scalar(input, "aspect_ratio"), resolution: scalar(input, "resolution"), background: scalar(input, "background"),
      quality: scalar(input, "quality"), outputFormat: scalar(input, "output_format"), nsfwCheck: scalar(input, "nsfw_checker") }) });
}
export const linghuStudioRoutes: readonly LinghuStudioRoute[] = linghuStudioMappings.map((mapping) => ({
  ...mapping,
  key: capabilityKey(mapping.capability),
  returns: mapping.result === "image" ? generationTypes.imageSet : generationTypes.videoSet,
  supports: () => ({ status: "supported" }),
  prepare: async (constraints, resolve, modelOverride) => {
    const request = constraints as unknown as GenerationRequest;
    const compiled = await compileWireRequest(mapping, request, resolve);
    const model = modelOverride?.trim() || selectWireModelForRequest(mapping, request);
    const input = compiled.input as Record<string, unknown>;
    return {
      capability: mapping.result === "image" ? "image" : "video",
      model,
      body: mapping.result === "image" ? imageBody(model, input) : videoBody(model, input),
    };
  },
  packageResult: (artifacts) => ({ kind: "inline", value: canonicalize(mapping.result === "image"
    ? sealGeneratedImageSet({ images: artifacts }) : sealGeneratedVideoSet({ videos: artifacts })) }),
}));

const byCapability = new Map(linghuStudioRoutes.map((route) => [route.key, route]));
export function linghuStudioRouteForCapability(capability: CapabilityRef): LinghuStudioRoute | undefined { return byCapability.get(capabilityKey(capability)); }
