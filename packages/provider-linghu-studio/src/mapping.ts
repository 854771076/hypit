import type { GenerationWireMapping } from "@hypit/generation";
import type { ModuleRef } from "@hypit/protocol";

export type LinghuStudioMapping = Omit<GenerationWireMapping, "result"> & {
  readonly result: "image" | "video";
};

const SEEDANCE: ModuleRef = { name: "@hypit/seedance", version: "1" };
const GPT_IMAGE: ModuleRef = { name: "@hypit/gpt-image", version: "1" };
const NANO_BANANA: ModuleRef = { name: "@hypit/nano-banana", version: "1" };
const SEEDREAM: ModuleRef = { name: "@hypit/seedream", version: "1" };
const MINIMAX: ModuleRef = { name: "@hypit/minimax-h3", version: "1" };
const GROK: ModuleRef = { name: "@hypit/grok-imagine", version: "1" };
const PIXVERSE: ModuleRef = { name: "@hypit/pixverse", version: "1" };

const seedanceFields = {
  prompt: { as: "value", field: "prompt" },
  referenceImage: { as: "urlArray", field: "reference_image_urls", resourceFields: ["personReference"] },
  referenceVideo: { as: "urlArray", field: "reference_videos", resourceFields: ["personReference"] },
  referenceAudio: { as: "urlArray", field: "reference_audios" },
  firstFrame: { as: "url", field: "first_frame", resourceFields: ["personReference"] },
  lastFrame: { as: "url", field: "last_frame", resourceFields: ["personReference"] },
  resolution: { as: "value", field: "resolution" },
  aspectRatio: { as: "value", field: "aspect_ratio" },
  duration: { as: "value", field: "seconds" },
  generateAudio: { as: "value", field: "generate_audio" },
  webSearch: { as: "value", field: "web_search" },
} as const satisfies GenerationWireMapping["fields"];

function seedance(name: string): LinghuStudioMapping {
  return { capability: { module: SEEDANCE, name }, result: "video", routes: [{ model: name }], fields: seedanceFields };
}

export const linghuStudioMappings: readonly LinghuStudioMapping[] = [
  seedance("seedance-2"),
  seedance("seedance-2-fast"),
  seedance("seedance-2-mini"),
  seedance("seedance-2.5"),
  {
    capability: { module: MINIMAX, name: "minimax-h3" }, result: "video", routes: [{ model: "minimax-h3" }],
    fields: {
      prompt: { as: "value", field: "prompt" }, duration: { as: "value", field: "seconds" },
      resolution: { as: "value", field: "resolution" }, aspectRatio: { as: "value", field: "aspect_ratio" },
      referenceImage: { as: "urlArray", field: "reference_image_urls" }, referenceVideo: { as: "urlArray", field: "reference_videos" },
      referenceAudio: { as: "urlArray", field: "reference_audios" }, firstFrame: { as: "url", field: "first_frame" },
      lastFrame: { as: "url", field: "last_frame" },
    },
  },
  ...(["grok-imagine-video", "grok-imagine-video-1.5-preview"] as const).map((name) => ({
    capability: { module: GROK, name }, result: "video" as const, routes: [{ model: name }],
    fields: {
      prompt: { as: "value" as const, field: "prompt" }, duration: { as: "value" as const, field: "seconds" },
      resolution: { as: "value" as const, field: "resolution" }, aspectRatio: { as: "value" as const, field: "aspect_ratio" },
      images: { as: "itemObject" as const, field: "reference_images", urlKey: "url", fieldKeys: {} },
    },
  })),
  ...([["pixverse-v6", "pixverse/v6"], ["pixverse-c1", "pixverse/c1"]] as const).map(([name, model]) => ({
    capability: { module: PIXVERSE, name }, result: "video" as const, routes: [{ model }],
    fields: {
      prompt: { as: "value" as const, field: "prompt" }, firstFrame: { as: "url" as const, field: "first_frame" },
      lastFrame: { as: "url" as const, field: "last_frame" }, referenceImage: { as: "urlArray" as const, field: "reference_image_urls" },
      ...(name === "pixverse-v6" ? { referenceVideo: { as: "urlArray" as const, field: "reference_videos" } } : {}),
      duration: { as: "value" as const, field: "seconds" }, quality: { as: "value" as const, field: "resolution" },
      aspectRatio: { as: "value" as const, field: "aspect_ratio" }, generateAudio: { as: "value" as const, field: "generate_audio" },
      ...(name === "pixverse-v6" ? {
        multiClip: { as: "value" as const, field: "multi_clip" }, seed: { as: "value" as const, field: "seed" },
      } : {}),
    },
  })),
  {
    capability: { module: GPT_IMAGE, name: "gpt-image-2" }, result: "image", routes: [{ model: "gpt-image-2" }],
    fields: {
      prompt: { as: "value", field: "prompt" }, aspectRatio: { as: "value", field: "aspect_ratio" },
      resolution: { as: "value", field: "resolution" }, background: { as: "value", field: "background" },
      images: { as: "itemObject", field: "reference_images", urlKey: "url", fieldKeys: {} },
    },
  },
  ...(["nano-banana-2", "nano-banana-pro"] as const).map((name) => ({
    capability: { module: NANO_BANANA, name }, result: "image" as const, routes: [{ model: name }],
    fields: {
      prompt: { as: "value" as const, field: "prompt" }, aspectRatio: { as: "value" as const, field: "aspect_ratio" },
      resolution: { as: "value" as const, field: "resolution" }, outputFormat: { as: "value" as const, field: "output_format" },
      images: { as: "itemObject" as const, field: "reference_images", urlKey: "url", fieldKeys: {} },
    },
  })),
  {
    capability: { module: SEEDREAM, name: "seedream-5-lite" }, result: "image", routes: [{ model: "seedream-5-lite" }],
    fields: {
      prompt: { as: "value", field: "prompt" }, aspectRatio: { as: "value", field: "aspect_ratio" },
      quality: { as: "value", field: "quality" }, outputFormat: { as: "value", field: "output_format" },
      nsfwCheck: { as: "value", field: "nsfw_checker" },
      images: { as: "itemObject", field: "reference_images", urlKey: "url", fieldKeys: {} },
    },
  },
];
