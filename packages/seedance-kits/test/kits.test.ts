import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parseSvs } from "@hypit/svs";
import { renderText, sealTextBindings, textTemplateFromSvsRecipes } from "@hypit/text";

const cases = [
  { file: "speaker-v1.svs", id: "speaker-v1", bindings: { dialogue: "HOST: Meaning comes first." }, marker: "@audio1 is the speaker's voice-timbre reference" },
  { file: "broll-v1.svs", id: "broll-v1", bindings: { story: "A hand opens the product." }, marker: "NATIVE SOUND" },
  { file: "broll-v1.svs", id: "broll-v1", bindings: { "audio-mode": "silent", story: "A hand opens the product." }, marker: "SILENT WAIVER" },
  { file: "podcast-v1.svs", id: "podcast-v1", bindings: { dialogue: "A: Hello.\nB: Hi." }, marker: "Host A uses @audio1" },
  { file: "call-v1.svs", id: "call-v1", bindings: { dialogue: "A: Hello.\nB: Hi." }, marker: "both tiles are live feeds" },
  { file: "street-interview-v1.svs", id: "street-interview-v1", bindings: { dialogue: "A: Why?\nB: Because." }, marker: "MICROPHONE CONTRACT" },
  { file: "motion-reference-v1.svs", id: "motion-reference-v1", bindings: {}, marker: "body motion" },
  { file: "camera-reference-v1.svs", id: "camera-reference-v1", bindings: {}, marker: "camera framing" },
  { file: "recreation-shot-v1.svs", id: "recreation-shot-v1", bindings: { "reference-dialect": "provider", "depth-video": "@video1 supplies depth.", "temporal-storyboard": "@image1 supplies action order.", "shot-board": "@image2 supplies staging.", "audio-reference": "@audio1 supplies the voice and sound identity.", "video-prompt": "She lifts the cup.", timing: "The contact starts on event cup-contact at frame 42.", continuity: "The cup ends in her right hand.", sound: "Quiet room tone and one ceramic contact." }, marker: "follow the selected Endpoint" },
] as const;

test("Seedance Kits are finite data programs with distinct rendered semantics", () => {
  for (const item of cases) {
    const source = readFileSync(new URL(`../kits/${item.file}`, import.meta.url), "utf8");
    const recipes = parseSvs(item.file, source.slice(source.indexOf("<sheet"))).recipes.map((recipe) => recipe.value);
    const template = textTemplateFromSvsRecipes(recipes, item.id);
    const output = renderText(template, sealTextBindings(item.bindings));
    assert.match(output.value, new RegExp(item.marker, "u"), item.file);
  }
});

test("recreation-shot requires depth, both boards, video prompt and audio reference", () => {
  const file = "recreation-shot-v1.svs";
  const source = readFileSync(new URL(`../kits/${file}`, import.meta.url), "utf8");
  const recipes = parseSvs(file, source.slice(source.indexOf("<sheet"))).recipes.map((recipe) => recipe.value);
  const template = textTemplateFromSvsRecipes(recipes, "recreation-shot-v1");
  const bindings = {
    "depth-video": "@video1 supplies depth.",
    "temporal-storyboard": "@image1 supplies action order.",
    "shot-board": "@image2 supplies staging.",
    "audio-reference": "@audio1 supplies the performance.",
    "video-prompt": "She lifts the cup.",
    continuity: "The cup ends in her right hand.",
    sound: "Quiet room tone.",
    timing: "The contact starts on frame 42.",
  } as const;
  for (const required of ["depth-video", "temporal-storyboard", "shot-board", "audio-reference", "video-prompt"] as const) {
    const missing = { ...bindings } as Record<string, string>;
    delete missing[required];
    assert.throws(() => renderText(template, sealTextBindings(missing)), new RegExp(`${required}.*missing`, "iu"));
  }
  assert.throws(() => renderText(template, sealTextBindings({ ...bindings, "reference-dialect": "starrouter" })), /choice matched no case/iu);
});

test("recreation-shot preserves per-turn languages and regenerates instead of patching video", () => {
  const source = readFileSync(new URL("../kits/recreation-shot-v1.svs", import.meta.url), "utf8");
  const recipes = parseSvs("recreation-shot-v1.svs", source.slice(source.indexOf("<sheet"))).recipes.map((recipe) => recipe.value);
  const template = textTemplateFromSvsRecipes(recipes, "recreation-shot-v1");
  const output = renderText(template, sealTextBindings({
    "depth-video": "@video1 is the required depth video.",
    "temporal-storyboard": "@image1 is the required six-panel temporal storyboard.",
    "shot-board": "@image2 is the required six-panel shot board.",
    "audio-reference": "@audio1 is the required source-language performance reference.",
    "video-prompt": "One full-frame conversation shot.",
    timing: "A speaks, then B replies.",
    continuity: "Both remain on their established sides.",
    dialogue: "A [ja]: \"待って\"\nB [en]: \"No.\"",
    sound: "One continuous room tone.",
  })).value;
  assert.match(output, /declared language.*each dialogue turn/iu);
  assert.match(output, /do not translate.*switch languages/iu);
  assert.match(output, /never patch.*generated video/iu);
  assert.match(output, /identity mismatch.*reject.*regenerate/iu);
});
