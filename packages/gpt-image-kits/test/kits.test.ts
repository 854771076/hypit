import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parseSvs } from "@hypit/svs";
import { renderText, sealTextBindings, textTemplateFromSvsRecipes } from "@hypit/text";

const cases = [
  { file: "phone-ugc-v1.svs", id: "phone-ugc-v1", bindings: { shot: "A stable medium shot." }, marker: "iPhone" },
  { file: "asset-sheet-v1.svs", id: "asset-sheet-v1", bindings: { asset: "One approved performer." }, marker: "CHARACTER BOARD" },
  { file: "asset-sheet-v1.svs", id: "asset-sheet-v1", bindings: { "asset-type": "scene", asset: "One approved kitchen." }, marker: "all visible dressing" },
  { file: "asset-sheet-v1.svs", id: "asset-sheet-v1", bindings: { "asset-type": "prop", asset: "One approved cup.", "visible-text": "ACME" }, marker: "ACME" },
  { file: "storyboard-v1.svs", id: "storyboard-v1", bindings: { shot: "She picks up the cup.", continuity: "Cup begins on the table and ends in her right hand." }, marker: "SINGLE FRAME" },
  { file: "storyboard-v1.svs", id: "storyboard-v1", bindings: { "board-type": "temporal", shot: "She picks up the cup.", continuity: "Cup begins on the table and ends in her right hand.", "visible-text": "10 → 09" }, marker: "10 → 09" },
  { file: "storyboard-v1.svs", id: "storyboard-v1", bindings: { "board-type": "shot-board", shot: "Speaker/listener coverage.", continuity: "Both remain on their established sides." }, marker: "SHOT BOARD" },
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
