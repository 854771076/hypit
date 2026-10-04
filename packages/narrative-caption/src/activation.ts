import { createMarkupSurfaceHostFacet } from "@hypit/markup";

import {
  decodeNarrativeCaptionTimingSurface,
  narrativeCaptionComponent,
  narrativeCaptionManifest,
  narrativeCaptionModuleRef,
  narrativeCaptionTimingMarkupSurface,
} from "./index.js";

export const hypitPackage = {
  format: "hypit.node-package@1" as const,
  modules: [{ manifest: narrativeCaptionManifest }],
  components: [narrativeCaptionComponent],
  hostFacets: [createMarkupSurfaceHostFacet({
    module: narrativeCaptionModuleRef,
    declaration: narrativeCaptionTimingMarkupSurface,
    handler: decodeNarrativeCaptionTimingSurface,
  })],
};
export default hypitPackage;
