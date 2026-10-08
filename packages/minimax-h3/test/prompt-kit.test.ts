import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parseSvs } from "@hypit/svs";
import { renderText, sealTextBindings, textTemplateFromSvsRecipes } from "@hypit/text";

test("H3 reference-shot Kit renders the six required Ref2VA sections in order", () => {
  const file = "reference-shot-v1.svs";
  const source = readFileSync(new URL(`../kits/${file}`, import.meta.url), "utf8");
  const recipes = parseSvs(file, source.slice(source.indexOf("<sheet"))).recipes.map((recipe) => recipe.value);
  const template = textTemplateFromSvsRecipes(recipes, "reference-shot-v1");
  const output = renderText(template, sealTextBindings({
    "subject-definitions": "<Subject 1> is the approved lead.",
    "depth-video": "<Video 1> is the required depth video.",
    "temporal-storyboard": "<Picture 1> is the required temporal storyboard.",
    "shot-board": "<Picture 2> is the required shot board.",
    "audio-reference": "<Audio 1> is the required performance reference.",
    summary: "One atomic shot.",
    "retention-analysis": "Preserve identity and structure.",
    "detailed-description": "The lead crosses the room.",
    "overall-soundscape": "Synchronized footsteps and room tone.",
    "non-diegetic-music": "N/A",
  }));
  assert.deepEqual(output.value.match(/^[a-z_]+:/gmu), [
    "subject_definitions:",
    "summary:",
    "retention_analysis:",
    "detailed_description:",
    "overall_soundscape:",
    "non_diegetic_music:",
  ]);
});

test("H3 reference-shot blocks rendering when a mandatory production reference is absent", () => {
  const file = "reference-shot-v1.svs";
  const source = readFileSync(new URL(`../kits/${file}`, import.meta.url), "utf8");
  const recipes = parseSvs(file, source.slice(source.indexOf("<sheet"))).recipes.map((recipe) => recipe.value);
  const template = textTemplateFromSvsRecipes(recipes, "reference-shot-v1");
  const bindings = {
    "subject-definitions": "<Subject 1> is the approved lead.",
    "depth-video": "<Video 1> is the required depth video.",
    "temporal-storyboard": "<Picture 1> is the required temporal storyboard.",
    "shot-board": "<Picture 2> is the required shot board.",
    "audio-reference": "<Audio 1> is the required performance reference.",
    summary: "One atomic shot.",
    "retention-analysis": "Preserve identity and structure.",
    "detailed-description": "The lead crosses the room.",
    "overall-soundscape": "Synchronized footsteps and room tone.",
    "non-diegetic-music": "N/A",
  } as const;
  for (const required of ["depth-video", "temporal-storyboard", "shot-board", "audio-reference", "detailed-description"] as const) {
    const missing = { ...bindings } as Record<string, string>;
    delete missing[required];
    assert.throws(() => renderText(template, sealTextBindings(missing)), new RegExp(`${required}.*missing`, "iu"));
  }
});
