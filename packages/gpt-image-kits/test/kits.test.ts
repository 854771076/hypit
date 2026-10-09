import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parseSvs } from "@hypit/svs";
import { renderText, sealTextBindings, textTemplateFromSvsRecipes } from "@hypit/text";
import { selectStoryboardStrategy } from "../src/storyboard-strategy.js";

const cases = [
  { file: "phone-ugc-v1.svs", id: "phone-ugc-v1", bindings: { shot: "A stable medium shot." }, marker: "iPhone" },
  { file: "asset-sheet-v1.svs", id: "asset-sheet-v1", bindings: { asset: "One approved performer." }, marker: "CHARACTER BOARD" },
  { file: "asset-sheet-v1.svs", id: "asset-sheet-v1", bindings: { "asset-type": "scene", asset: "One approved kitchen." }, marker: "all visible dressing" },
  { file: "asset-sheet-v1.svs", id: "asset-sheet-v1", bindings: { "asset-type": "prop", asset: "One approved cup.", "visible-text": "ACME" }, marker: "ACME" },
  { file: "storyboard-v1.svs", id: "storyboard-v1", bindings: { shot: "She picks up the cup.", continuity: "Cup begins on the table and ends in her right hand." }, marker: "KEYFRAME" },
  { file: "storyboard-v1.svs", id: "storyboard-v1", bindings: { "board-type": "temporal", shot: "She picks up the cup.", continuity: "Cup begins on the table and ends in her right hand.", "visible-text": "10 → 09" }, marker: "10 → 09" },
  { file: "storyboard-v1.svs", id: "storyboard-v1", bindings: { "board-type": "narrative", shot: "She notices the empty chair and understands the betrayal.", continuity: "The chair remains in frame and she ends facing it." }, marker: "NARRATIVE STORYBOARD" },
  { file: "storyboard-v1.svs", id: "storyboard-v1", bindings: { "board-type": "shot-board", shot: "Speaker/listener coverage.", continuity: "Both remain on their established sides." }, marker: "SHOT BOARD" },
  { file: "storyboard-v1.svs", id: "storyboard-v1", bindings: { "board-type": "blocking", shot: "A cook moves from the refrigerator to the stove and then the table.", continuity: "The refrigerator, stove, and table remain fixed landmarks." }, marker: "BLOCKING STORYBOARD" },
  { file: "storyboard-v1.svs", id: "storyboard-v1", bindings: { "board-type": "choreography", shot: "A dancer performs a sixteen-step floor routine.", continuity: "The dancer's body identity and orientation remain consistent." }, marker: "CHOREOGRAPHY STORYBOARD" },
  { file: "story-text-frame-v1.svs", id: "story-text-frame-v1", bindings: { text: "00:00:03", appearance: "Cold white seven-segment digits.", composition: "Centered inside the approved device display." }, marker: "immutable approved story-text asset" },
] as const;

test("GPT image Kits render their required production contracts", () => {
  for (const item of cases) {
    const source = readFileSync(new URL(`../kits/${item.file}`, import.meta.url), "utf8");
    const recipes = parseSvs(item.file, source.slice(source.indexOf("<sheet"))).recipes.map((recipe) => recipe.value);
    const template = textTemplateFromSvsRecipes(recipes, item.id);
    const output = renderText(template, sealTextBindings(item.bindings));
    assert.match(output.value, new RegExp(item.marker, "u"), item.file);
  }
});

test("storyboard types keep narrative beats separate from technical coverage", () => {
  const source = readFileSync(new URL("../kits/storyboard-v1.svs", import.meta.url), "utf8");
  const recipes = parseSvs("storyboard-v1.svs", source.slice(source.indexOf("<sheet"))).recipes.map((recipe) => recipe.value);
  const template = textTemplateFromSvsRecipes(recipes, "storyboard-v1");
  const narrative = renderText(template, sealTextBindings({
    "board-type": "narrative",
    shot: "She opens the letter and realizes the truth.",
    continuity: "The letter stays in her hands; the realization is visible in her reaction.",
  })).value;
  const coverage = renderText(template, sealTextBindings({
    "board-type": "shot-board",
    shot: "A two-person conversation with a handoff.",
    continuity: "Both remain on their established sides; the object ends in B's hand.",
  })).value;
  assert.match(narrative, /causality, discovery, emotional turn/iu);
  assert.match(narrative, /do not prescribe a coverage plan/iu);
  assert.match(coverage, /technical coverage plan/iu);
  assert.match(coverage, /not use this type to explain an emotional arc/iu);
});

test("story-text frame preserves the exact approved reading and bans captions", () => {
  const file = "story-text-frame-v1.svs";
  const source = readFileSync(new URL(`../kits/${file}`, import.meta.url), "utf8");
  const recipes = parseSvs(file, source.slice(source.indexOf("<sheet"))).recipes.map((recipe) => recipe.value);
  const template = textTemplateFromSvsRecipes(recipes, "story-text-frame-v1");
  const output = renderText(template, sealTextBindings({
    text: "00:00:03",
    appearance: "Cold white seven-segment digits.",
    composition: "Centered inside the approved device display.",
  })).value;
  assert.match(output, /00:00:03/u);
  assert.match(output, /add no subtitles, captions, translations/iu);
  assert.match(output, /semantic reference state for a temporal storyboard/iu);
  assert.match(output, /Do not paste, composite, or locally retouch it over generated video/iu);
});

test("multi-cell storyboards default to six panels and lock hard visual states for video reference", () => {
  const source = readFileSync(new URL("../kits/storyboard-v1.svs", import.meta.url), "utf8");
  const recipes = parseSvs("storyboard-v1.svs", source.slice(source.indexOf("<sheet"))).recipes.map((recipe) => recipe.value);
  const template = textTemplateFromSvsRecipes(recipes, "storyboard-v1");
  const output = renderText(template, sealTextBindings({
    "board-type": "temporal",
    shot: "A device counts down from 03 to 01.",
    continuity: "One device, one viewpoint and unchanged typography.",
    "visible-text": "00:00:03 → 00:00:02 → 00:00:01",
  })).value;
  assert.match(output, /default to six clearly ordered cells/iu);
  assert.match(output, /hard-to-reproduce detail.*exact state in its own cell/iu);
  assert.match(output, /semantic reference for the video model/iu);
});

test("storyboard strategy selects the smallest board for the actual scene", () => {
  assert.deepEqual(selectStoryboardStrategy({ brief: "姜宁在拥挤食堂掉笔，陆珩弯腰捡起递给她，两人短暂对视后离开。", forVideo: true }), {
    boardType: "narrative",
    companionBoardType: "shot-board",
    needsPreviz3d: false,
    reason: "任务需要让观众读懂信息揭示、因果或情绪变化，而非先解决机位覆盖。",
    matchedSignals: ["短暂对视"],
  });
  assert.equal(selectStoryboardStrategy({ brief: "人物从冰箱走到灶台再端菜到餐桌", forVideo: true }).boardType, "blocking");
  assert.equal(selectStoryboardStrategy({ brief: "复杂连续运镜穿过人群并绕过障碍", forVideo: true, spatialRisk: true }).needsPreviz3d, true);
  assert.equal(selectStoryboardStrategy({ brief: "普通静态人物设定" }).boardType, "single-frame");
  assert.equal(selectStoryboardStrategy({ brief: "任何内容", boardType: "shot-board", forVideo: true }).boardType, "shot-board");
});
