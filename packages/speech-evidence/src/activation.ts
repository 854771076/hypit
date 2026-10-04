import { speechEvidenceComponent } from "./component.js";
import { speechEvidenceManifest } from "./index.js";
export const hypitPackage = {
  format: "hypit.node-package@1" as const,
  modules: [{ manifest: speechEvidenceManifest }],
  components: [speechEvidenceComponent],
};
export default hypitPackage;
