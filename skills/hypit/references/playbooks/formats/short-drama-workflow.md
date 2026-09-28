# Short-drama production workflow

Use this workflow for an original, adapted or reference-led short drama. It turns
[Short drama](short-drama.md) into auditable project work. The complete project contract, module router,
prompt library, recovery tools and Dashboard are bundled with the installed CLI. Run
`hypit short-drama root`, then read `skills/short-drama/SKILL.md` under the returned directory before
continuing. Resolve every reference returned by `hypit short-drama modules required` from that same
directory; do not replace those contracts with this summary. This indirection is required because the
Hypit Skill may be installed independently from the npm package. Hypit Runtime remains the preferred
owner of paid media generation, Results and deterministic editing where an equivalent component exists.

```bash
hypit short-drama init <project-id> --profile standard
hypit short-drama init <project-id> --profile viral-recreation
hypit short-drama status
hypit short-drama check
hypit short-drama dashboard
hypit short-drama root
hypit short-drama modules required <stage>
hypit short-drama advance <next-stage>
hypit short-drama rewind <earliest-affected-stage>
```

Run only the current stage. The `.short-drama/` project, versioned documents, module runs, immutable
prompt requests, asset/task ledgers and delivery manifest are the single source of truth. Every module
run binds real inputs and outputs by SHA-256; later checks fail closed if an input, selected version,
reference contract or evidence file changes.

## Analysis

- `manage-drama-projects`: establish the workspace, profile, source rights, target format and the
  existing Hypit production files that own the work.
- `analyze-drama-source`: cover the full source. Separate sourced fact, user constraint, interpretation
  and unresolved question; record chronology, conflict, people, places, props, visual risks and precise
  evidence locations.
- `define-drama-brief`: lock goal, audience, genre, tone, conflict, languages, aspect ratio, episode
  count, duration target, rating, supplied material and forbidden changes.
- `design-drama-bible`: establish world rules, motives, relationships, character arcs, conflict
  escalation, plants, payoffs and ending without changing the approved Brief.
- `outline-drama-series`: give every episode a stable id, opening handoff, causal event, information or
  satisfaction gain, closing hook, key assets and honest duration range.

For `viral-recreation`, replace source-only analysis with `use-short-drama-studio`,
`configure-generation-providers`, `analyze-reference-video`, `use-hypit-video` and
`design-video-recreation`. Preserve detected language per dialogue turn, rights mode, structural
mechanism, timing evidence and forbidden identity/audio/music reuse. Read
[Reference video](../../creation/reference-video.md) and
[Recreation policy](../craft/recreation-policy.md).

## Script

- `short-drama`: apply goal–obstacle–strategy–change to every passage. Silent listeners still have an
  active judgment, concealment, waiting or relationship task.
- `write-drama-episode`: output scene headings, visible action, exact dialogue/voice-over, present
  characters and props. Adaptations add no unsourced events; original work stays inside the Bible and
  Outline. Keep each turn's spoken language explicit and separate from subtitle language.
- `humanizer`: create a new version. Remove explanatory repetition, generic slogans and equal sentence
  rhythms while preserving plot facts, intent, language and required lines.
- `review-drama-script`: approve only when source coverage, opening, causality, rhythm, payoff, dialogue,
  continuity, compliance and generatability pass with no P0/P1 issue. Bind the report to the exact
  script version; a rewrite invalidates it.

## Director book

`write-drama-director-book` turns the selected script into scene intent, not final shot numbers. For
each scene record dramatic objective, beats, every character's objective/obstacle/strategy, subtext and
listening task, blocking, gaze and exits, axis and camera side, motivated light, color movement, sound
perspective, transition intention, continuity in/out and asset needs. Mark ordinary versus choreographed
action. Do not add plot facts or Provider parameters.

## Asset analysis and generation

- `plan-drama-assets`: inventory every visible character, scene, continuity-bearing dressing, prop,
  voice and recurring sound. Normalize aliases; version costume, makeup, age, damage, contents, time of
  day and persistent prop state. Unknown identity, age, ownership or state remains unresolved.
- `generate-drama-art-style`: define palette, motivated lighting, material/texture, contrast, camera
  character, motion language, narrative color arc and negative constraints.
- `generate-character-profiles` is required when characters exist. Bind explicit age evidence,
  identity, body and face anchors, grooming/makeup, costume signature, expression, posture, voice and
  forbidden drift.
- `manage-drama-assets` selects immutable Hypit Results or admitted local media. Configure
  `generatedAssetKinds`; missing kinds require `generate-character-images`, `generate-scene-assets` or
  `generate-prop-assets`, using `drama-generation-service` through the existing Runtime.

Use selected asset boards only when they control a real continuity risk. Character, scene and prop
boards follow [Asset and shot preproduction](../craft/asset-and-shot-preproduction.md); they are semantic
references, never a visible grid in the final video.

## Production plan

- Configure `hasStructuredFight` for `design-fight-video` when action needs cross-shot positions, force,
  contact, pursuit, weapons, falls or multi-person choreography. Describe bodies, cause and result; an
  attack name is not choreography.
- `build-drama-storyboard`: split atomic shots with one time/place, continuous camera behavior and one
  main causal action. Preserve coverage, blocking, axis, gaze, entry/exit, hands, prop state and language.
- Configure `hasUnresolvedStoryboard` for `revise-drama-storyboards`. Revisions create new evidence;
  they do not overwrite or cosmetically patch a failed board.
- `plan-drama-production`: choose generated duration versus intended edit, Endpoint/model, joint
  picture-and-sound policy, candidate limit, ordered references, fallback and acceptance risks per shot.
  Show quantities—not a guessed price—before paid work.
- `plan-shot-continuity`: record start/tail pose, position, screen direction, gaze, held object, prop
  state, entry/exit edge, axis, camera side and key-light direction. Bind a previous tail only when the
  setup genuinely continues.
- `write-drama-video-prompts`: compile model-independent facts into the selected dialect. H3 follows
  [H3 prompt writing](../craft/h3-prompt-writing.md); Seedance uses its Endpoint's actual ordered labels.
  Do not mix dialects.

Every final generated shot requires depth video, temporal storyboard, shot board, video prompt and
audio reference. `generate-storyboard-images` is therefore mandatory; optional asset boards are selected
per shot. Configure `needsBlenderPreviz` and `needsIndependentAudio` so `direct-blender-previz`,
`generate-blender-previz` and `design-drama-audio` run only when applicable. The
selected production plan and video prompt documents record those references by immutable asset version;
the vendored workflow gates verify their paths, hashes, approvals and selection state before a paid call.
For exact countdown or device states, isolate each state in a reviewed temporal-storyboard cell and
regenerate the smallest failing shot; never paint, inpaint or splice-repair rejected generated video.

## Media production

- `drama-generation-service`: use the selected Hypit Runtime and Provider. The request carries the same
  ordered Resources and labels as the shot contract.
- `generate-drama-videos`: default to joint picture-and-audio generation, including ambience and action
  sounds. Every dialogue turn names speaker, exact source-language text, confirmed language code,
  measured delivery, mouth state and acoustic perspective. Dialogue must not appear as subtitles.
- `monitor-drama-tasks`: recover existing Builds and Results rather than resubmitting an unknown remote
  request. Keep every candidate independent.
- `review-drama-shots`: watch and listen to the whole candidate. Check narrative event, identity,
  character count, performance, anatomy/contact, prop state, camera/axis, light/look, language, voice,
  sync, native sound, incidental text, grid leakage and continuity. Record symptom, likely mechanism and
  one changed variable. Stop equivalent paid retries after two failures.

Only accepted Results enter the Timeline. A new selected speaking shot invalidates older word timing,
captions and lip-sync evidence derived from it.

## Editing and delivery

- `remotion-best-practices` and `edit-drama-timeline` use Hypit's semantic Timeline, Film, Sound and
  Caption components, not a copied renderer. Compile edit points from dialogue phrases, action
  peaks/impacts, gazes, sound cues, atmosphere changes and musical beats. Use action/eyeline cuts only
  when continuity supports them; use 6–12-frame fades/dissolves only for a real time/place/mood change.
- Preserve J/L cuts and ambience bridges with independent audio. Adjacent ambience/native clips use
  equal constant-power fades. BGM has a narrative volume envelope and explicit dialogue ducking.
- Captions come from selected final audio and are reviewed downstream. Use restrained movie styling,
  safe area, semantic line breaks and frame-aligned timing. Generated subtitles, watermarks and stray
  glyphs reject the shot.
- `edit-deliver-drama`: run deterministic QC, inspect every exact cut, then watch and listen end-to-end.
  Deliver approved video plus requested subtitle files and a manifest of hashes, format, selected
  Results and review evidence. Exclude caches and rejected candidates.

## Reusable prompt contracts

These are Codex output contracts, not calls to another text model:

1. **Source analysis:** separate fact, constraint, interpretation and unresolved question; cover every
   segment; cite the source span for every identity, event, asset and limit.
2. **Brief/Bible/Outline:** preserve confirmed facts; make conflict causal; allocate escalation, payoff
   and hooks; expose every decision needing confirmation.
3. **Episode/Review:** write playable visible action and exact speech; label language per turn; report
   P0/P1/P2 with scene/line evidence and bind approval to the exact version.
4. **Director/Storyboard:** for every beat state objective, obstacle, strategy, listener task, blocking,
   axis, motivated camera/light/sound and continuity; split shots with independent causes.
5. **Asset/Production:** inventory identities and persistent states first; select references with one
   primary responsibility; record actual Provider limits, candidate budget and fallback.
6. **Video/Review:** describe first state → onset → contact/change → response → stable tail; preserve
   exact dialogue language and joint sound; reject non-whitelisted text, identity drift and failed
   physical causality.
