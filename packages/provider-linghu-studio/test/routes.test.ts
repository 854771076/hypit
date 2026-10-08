import test from "node:test";

import { assertMappingCoversPorts } from "@hypit/generation";
import { gptImage2Ports } from "@hypit/gpt-image";
import { grokImaginePorts } from "@hypit/grok-imagine";
import { minimaxH3Ports } from "@hypit/minimax-h3";
import { nanoBananaPorts } from "@hypit/nano-banana";
import { pixversePorts } from "@hypit/pixverse";
import { seedancePorts } from "@hypit/seedance";
import { seedream5LitePorts } from "@hypit/seedream";

import { linghuStudioMappings } from "../src/mapping.js";

test("每个灵狐工作室映射都完整覆盖对应模型端口", () => {
  const tables = {
    ...seedancePorts,
    ...grokImaginePorts,
    ...pixversePorts,
    ...nanoBananaPorts,
    "minimax-h3": minimaxH3Ports,
    "gpt-image-2": gptImage2Ports,
    "seedream-5-lite": seedream5LitePorts,
  };
  for (const mapping of linghuStudioMappings) {
    assertMappingCoversPorts(tables[mapping.capability.name as keyof typeof tables], mapping);
  }
});
