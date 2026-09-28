import type { GenerationWireMapping } from "@hypit/generation";
import type { ModuleRef } from "@hypit/protocol";

const SEEDANCE: ModuleRef = { name: "@hypit/seedance", version: "1" };
const MINIMAX: ModuleRef = { name: "@hypit/minimax-h3", version: "1" };
const GPT_IMAGE: ModuleRef = { name: "@hypit/gpt-image", version: "1" };

const videoFields = {
  prompt: { as: "value", field: "prompt" },
  firstFrame: { as: "url", field: "first_frame", resourceFields: ["personReference"] },
  lastFrame: { as: "url", field: "last_frame", resourceFields: ["personReference"] },
  referenceImage: { as: "urlArray", field: "reference_images", resourceFields: ["personReference"] },
  referenceVideo: { as: "urlArray", field: "reference_videos", resourceFields: ["personReference", "durationSeconds"] },
  referenceAudio: { as: "urlArray", field: "reference_audios" },
  duration: { as: "value", field: "duration" },
  aspectRatio: { as: "value", field: "ratio" },
  resolution: { as: "value", field: "resolution" },
  generateAudio: { as: "value", field: "generate_audio" },
  webSearch: { as: "value", field: "web_search" },
} as const satisfies GenerationWireMapping["fields"];

const h3Fields = {
  prompt: videoFields.prompt,
  firstFrame: { as: "url", field: "first_frame" },
  lastFrame: { as: "url", field: "last_frame" },
  referenceImage: { as: "urlArray", field: "reference_images" },
  referenceVideo: { as: "urlArray", field: "reference_videos" },
  referenceAudio: videoFields.referenceAudio,
  duration: videoFields.duration,
  aspectRatio: videoFields.aspectRatio,
  resolution: videoFields.resolution,
} as const satisfies GenerationWireMapping["fields"];

export const starRouterMappings: readonly GenerationWireMapping[] = [
  ...([[
    "seedance-2", "dreamina-seedance-2-0-260128",
  ], [
    "seedance-2-fast", "dreamina-seedance-2-0-fast-260128",
  ]] as const).map(([name, model]) => ({ capability: { module: SEEDANCE, name }, result: "video" as const, routes: [{ model }], fields: videoFields })),
  {
    capability: { module: MINIMAX, name: "minimax-h3" }, result: "video", routes: [{ model: "MiniMax-H3" }], fields: h3Fields,
  },
  {
    capability: { module: GPT_IMAGE, name: "gpt-image-2" }, result: "image", routes: [{ model: "gpt-image-2" }],
    fields: {
      prompt: { as: "value", field: "prompt" },
      aspectRatio: { as: "value", field: "aspect_ratio" },
      resolution: { as: "value", field: "resolution" },
      background: { as: "value", field: "background" },
      images: { as: "urlArray", field: "images" },
    },
  },
];
