import { createMarkupSurfaceHostFacet } from "@hypit/markup";
import { decodeNarrativeProjectionSurface, narrativeProjectionMarkupSurface, narrativeTemporalComponent,
  narrativeTemporalManifest, narrativeTemporalModuleRef } from "./index.js";

export const hypitPackage = {
  format: "hypit.node-package@1" as const,
  modules: [{ manifest: narrativeTemporalManifest }],
  components: [narrativeTemporalComponent],
  hostFacets: [createMarkupSurfaceHostFacet({ module: narrativeTemporalModuleRef,
    declaration: narrativeProjectionMarkupSurface, handler: decodeNarrativeProjectionSurface })],
};
export default hypitPackage;
