import { createMarkupSurfaceHostFacet } from "@hypit/markup";

import {
  decodeNarrativeAlignmentAdjustSurface,
  narrativeAlignmentAdjustComponent,
  narrativeAlignmentAdjustManifest,
  narrativeAlignmentAdjustMarkupSurfaces,
  narrativeAlignmentAdjustModuleRef,
} from "./index.js";

export const hypitPackage = {
  format: "hypit.node-package@1" as const,
  modules: [{ manifest: narrativeAlignmentAdjustManifest }],
  components: [narrativeAlignmentAdjustComponent],
  hostFacets: [createMarkupSurfaceHostFacet({
    module: narrativeAlignmentAdjustModuleRef,
    declaration: narrativeAlignmentAdjustMarkupSurfaces.find((item) => item.name === "narrative-alignment")!,
    handler: decodeNarrativeAlignmentAdjustSurface,
  })],
};

export default hypitPackage;
