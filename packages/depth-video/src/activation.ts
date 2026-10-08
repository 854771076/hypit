import { createMarkupSurfaceHostFacet } from "@hypit/markup";
import { depthVideoDefinition, depthVideoModuleRef, depthVideoSurface } from "./index.js";
import { decodeDepthVideoSurface } from "./surface.js";

export const hypitPackage = {
  format: "hypit.node-package@1" as const,
  modules: [{ manifest: depthVideoDefinition.manifest }],
  components: [depthVideoDefinition.component],
  hostFacets: [depthVideoDefinition.hostFacet, createMarkupSurfaceHostFacet({
    module: depthVideoModuleRef, declaration: depthVideoSurface, handler: decodeDepthVideoSurface,
  })],
};
export default hypitPackage;
