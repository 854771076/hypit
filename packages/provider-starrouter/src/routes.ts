import { compileWireRequest, generationTypes, sealGeneratedImageSet, sealGeneratedVideoSet, selectWireModelForRequest } from "@hypit/generation";
import type { GenerationArtifactUrlResolver, GenerationRequest, GenerationWireMapping } from "@hypit/generation";
import { canonicalize } from "@hypit/protocol";
import type { BlobRef, CapabilityRef, CanonicalValue, StoredValue, TypeRef } from "@hypit/protocol";
import type { EndpointRequest, EndpointSupport } from "@hypit/endpoint-kit";
import { starRouterMappings } from "./mapping.js";

export type StarRouterPreparedRequest = {
  readonly model: string;
  readonly media: "image" | "video";
  readonly path: string;
  readonly references: readonly BlobRef[];
  readonly compile: (resolve: GenerationArtifactUrlResolver) => Promise<Record<string, unknown>>;
};

export type StarRouterRoute = GenerationWireMapping & {
  readonly key: string;
  readonly returns: TypeRef;
  readonly pollPath?: (taskId: string) => string;
  readonly supports: (request: EndpointRequest) => EndpointSupport;
  readonly prepare: (constraints: CanonicalValue) => StarRouterPreparedRequest;
  readonly packageResult: (artifacts: readonly BlobRef[]) => StoredValue;
};

function scalar(request: GenerationRequest, port: string): string | number | boolean | undefined {
  const value = request.ports[port]?.[0];
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? value : undefined;
}
function count(request: GenerationRequest, port: string): number { return request.ports[port]?.length ?? 0; }
const imageRatios = new Set(["1:1", "16:9", "9:16", "4:3", "3:4"]);
const videoRatios = new Set(["16:9", "9:16", "1:1", "4:3", "3:4"]);
export const starRouterMaxReferenceImageBytes = 16 * 1024 * 1024;
export const starRouterMaxReferenceMediaBytes = 200 * 1024 * 1024;

function videoReferences(request: GenerationRequest): readonly (BlobRef | undefined)[] {
  return ["firstFrame", "lastFrame", "referenceImage", "referenceVideo", "referenceAudio"]
    .flatMap((port) => request.ports[port] ?? [])
    .map((item) => (item as { artifact: BlobRef }).artifact);
}
function resolvedReferences(request: GenerationRequest, ports: readonly string[]): BlobRef[] {
  return ports.flatMap((port) => (request.ports[port] ?? []).map((item, index) => {
    const artifact = typeof item === "object" && item !== null ? (item as { artifact?: BlobRef }).artifact : undefined;
    if (artifact === undefined) throw new Error(`StarRouter ${port}[${index}] reference is unresolved`);
    return artifact;
  }));
}

function numberedReferenceLabelRejection(prompt: string, label: "图片" | "视频" | "音频", count: number): string | undefined {
  const found = new Set([...prompt.matchAll(new RegExp(`@${label}(\\d+)`, "gu"))].map((match) => match[1]!));
  for (let index = 1; index <= count; index++) {
    if (!found.has(String(index))) return `StarRouter Seedance prompt must include @${label}${index}`;
  }
  const unexpected = [...found].find((index) => !Number.isSafeInteger(Number(index))
    || Number(index) < 1 || Number(index) > count || String(Number(index)) !== index);
  return unexpected === undefined ? undefined : `StarRouter Seedance prompt contains unexpected @${label}${unexpected}`;
}

function rejection(mapping: GenerationWireMapping, request: GenerationRequest): string | undefined {
  if (mapping.result === "image") {
    const ratio = String(scalar(request, "aspectRatio"));
    if (!imageRatios.has(ratio)) return `StarRouter GPT Image 2 does not accept ${ratio}`;
    if ((request.ports.images ?? []).some((item) => (item as { artifact?: BlobRef }).artifact?.size !== undefined && (item as { artifact: BlobRef }).artifact.size > starRouterMaxReferenceImageBytes)) return "StarRouter GPT Image 2 reference images must not exceed 16MB per item";
  }
  if (mapping.result === "video" && videoReferences(request).some((artifact) => (artifact?.size ?? 0) > starRouterMaxReferenceMediaBytes)) {
    return "StarRouter reference media must not exceed 200MB per item";
  }
  if (mapping.capability.module.name === "@hypit/seedance") {
    const duration = scalar(request, "duration");
    if (duration === -1 || typeof duration !== "number" || duration < 4 || duration > 15) return "StarRouter Seedance duration must be 4–15 seconds";
    const ratio = String(scalar(request, "aspectRatio"));
    if (!videoRatios.has(ratio)) return `StarRouter Seedance does not accept ${ratio}`;
    const resolution = String(scalar(request, "resolution"));
    if (!new Set(["480p", "720p", "1080p"]).has(resolution)) return `StarRouter Seedance does not accept ${resolution}`;
    if (scalar(request, "webSearch") === true) return "StarRouter Seedance has no web search field";
    const videos = request.ports.referenceVideo ?? [];
    const videoDurations = videos.map((item) => typeof item === "object" && item !== null ? item.fields?.durationSeconds : undefined);
    if (videoDurations.some((value) => typeof value !== "number" || !Number.isFinite(value) || value <= 0)) return "StarRouter Seedance video references require durationSeconds metadata";
    const totalVideoSeconds = videoDurations.reduce<number>((sum, value) => sum + Number(value), 0);
    if (videos.length > 0 && (totalVideoSeconds < 2 || totalVideoSeconds > 15)) return "StarRouter Seedance reference videos must total 2–15 seconds";
    const audios = request.ports.referenceAudio ?? [];
    const audioDurations = audios.map((item) => typeof item === "object" && item !== null ? item.fields?.durationSeconds : undefined);
    if (audioDurations.some((value) => typeof value !== "number" || !Number.isFinite(value) || value <= 0)) return "StarRouter Seedance audio references require durationSeconds metadata";
    const totalAudioSeconds = audioDurations.reduce<number>((sum, value) => sum + Number(value), 0);
    if (audios.length > 0 && totalAudioSeconds > 15) return "StarRouter Seedance reference audios must total at most 15 seconds";
    const prompt = String(scalar(request, "prompt") ?? "");
    const images = count(request, "firstFrame") + count(request, "lastFrame") + count(request, "referenceImage");
    const imageLabelRejection = numberedReferenceLabelRejection(prompt, "图片", images);
    if (imageLabelRejection !== undefined) return imageLabelRejection;
    const videoLabelRejection = numberedReferenceLabelRejection(prompt, "视频", videos.length);
    if (videoLabelRejection !== undefined) return videoLabelRejection;
    const audioLabelRejection = numberedReferenceLabelRejection(prompt, "音频", audios.length);
    if (audioLabelRejection !== undefined) return audioLabelRejection;
  }
  return undefined;
}

const mediaEntries = [
  ["first_frame", "image_url", "first_frame"], ["last_frame", "image_url", "last_frame"],
  ["reference_images", "image_url", "reference_image"], ["reference_videos", "video_url", "reference_video"],
  ["reference_audios", "audio_url", "reference_audio"],
] as const;

function content(input: Record<string, unknown>): Record<string, unknown>[] {
  const result: Record<string, unknown>[] = [{ type: "text", text: input.prompt }];
  for (const [field, type, role] of mediaEntries) {
    const value = input[field];
    const urls = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
    for (const url of urls) result.push({ type, [type]: { url }, role });
    delete input[field];
  }
  return result;
}

function imageSize(resolution: unknown, aspectRatio: unknown): string {
  const edge = { "1K": 1024, "2K": 2048, "4K": 3840 }[String(resolution)] ?? 1024;
  const [wide = 1, high = 1] = String(aspectRatio).split(":").map(Number);
  const ratio = wide > 0 && high > 0 ? wide / high : 1;
  const align = (value: number, mode: "round" | "ceil" | "floor" = "round") => Math.max(64, Math[mode](value / 64) * 64);
  let width = align(ratio >= 1 ? edge : edge * ratio);
  let height = align(ratio >= 1 ? edge / ratio : edge);
  if (width * height < 1_048_576) {
    const scale = Math.sqrt(1_048_576 / (width * height));
    if (ratio >= 1) { height = align(height * scale, "ceil"); width = align(height * ratio, "ceil"); }
    else { width = align(width * scale, "ceil"); height = align(width / ratio, "ceil"); }
  } else if (width * height > 8_294_400) {
    const scale = Math.sqrt(8_294_400 / (width * height));
    width = align(width * scale, "floor"); height = align(height * scale, "floor");
  }
  return `${width}x${height}`;
}

function normalize(mapping: GenerationWireMapping, model: string, input: Record<string, unknown>): Record<string, unknown> {
  if (mapping.result === "image") {
    const body = { model, prompt: input.prompt, size: imageSize(input.resolution, input.aspect_ratio), ...(input.background === undefined ? {} : { background: input.background }) };
    return body;
  }
  const items = content(input);
  if (mapping.capability.module.name === "@hypit/minimax-h3") {
    const body = { model, prompt: input.prompt, duration: input.duration, size: input.resolution ?? "768P", ratio: input.ratio, metadata: { content: items } };
    return Object.fromEntries(Object.entries(body).filter(([, value]) => value !== undefined));
  }
  const body = { model, content: items, duration: input.duration, resolution: input.resolution, ratio: input.ratio, generate_audio: input.generate_audio, watermark: false };
  return Object.fromEntries(Object.entries(body).filter(([, value]) => value !== undefined));
}

function capabilityKey(capability: CapabilityRef): string { return `${capability.module.name}@${capability.module.version}#${capability.name}`; }

export const starRouterRoutes: readonly StarRouterRoute[] = starRouterMappings.map((mapping) => ({
  ...mapping,
  key: capabilityKey(mapping.capability),
  returns: mapping.result === "image" ? generationTypes.imageSet : generationTypes.videoSet,
  ...(mapping.result === "image" ? {} : { pollPath: mapping.capability.module.name === "@hypit/minimax-h3"
    ? (taskId: string) => `/v1/videos/${encodeURIComponent(taskId)}`
    : (taskId: string) => `/volcengine/doubao/contents/generations/tasks/${encodeURIComponent(taskId)}` }),
  supports: (request) => {
    const reason = rejection(mapping, request.constraints as unknown as GenerationRequest);
    return reason === undefined ? { status: "supported" } : { status: "unsupported", reason };
  },
  prepare: (constraints) => {
    const request = constraints as unknown as GenerationRequest;
    const reason = rejection(mapping, request);
    if (reason !== undefined) throw new Error(reason);
    const references = resolvedReferences(request, mapping.result === "image"
      ? ["images"]
      : ["firstFrame", "lastFrame", "referenceImage", "referenceVideo", "referenceAudio"]);
    const model = selectWireModelForRequest(mapping, request);
    return {
      model, media: mapping.result === "image" ? "image" as const : "video" as const,
      path: mapping.result === "image" ? references.length > 0 ? "/v1/images/edits" : "/v1/images/generations" : model.startsWith("MiniMax-") ? "/v1/videos" : "/volcengine/doubao/contents/generations/tasks",
      references: mapping.result === "image" ? references : [],
      compile: async (resolve) => normalize(mapping, model, (await compileWireRequest(mapping, request, resolve)).input as Record<string, unknown>),
    };
  },
  packageResult: (artifacts) => ({ kind: "inline", value: canonicalize(mapping.result === "image" ? sealGeneratedImageSet({ images: artifacts }) : sealGeneratedVideoSet({ videos: artifacts })) }),
}));

const byCapability = new Map(starRouterRoutes.map((route) => [route.key, route]));
export function starRouterRouteForCapability(capability: CapabilityRef): StarRouterRoute | undefined { return byCapability.get(capabilityKey(capability)); }
