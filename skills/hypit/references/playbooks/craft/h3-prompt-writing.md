# H3 Prompt Writing

## Workflow

1. Identify the input mode: T2VA, I2VA, FL2VA, L2VA, or full-reference Ref2VA.
2. For base text/keyframe modes, read `examples/h3-base-prompt-writing.md` and follow its final prompt structure.
3. For full-reference mode, read `examples/h3-reference-prompt-writing.md` and follow its six-section rewrite format.
4. Preserve the exact field names, section order, labels, and timing notation from the selected guide.

## Base Modes

- T2VA: build the full audiovisual timeline from text.
- I2VA: start from the first frame and develop forward from it.
- FL2VA: describe the continuous path between the first and last frames.
- L2VA: infer a plausible opening and converge to the supplied last frame.

Use `integrated_multimodal_description`, `overall_soundscape`, and `non_diegetic_music` in the order shown in `examples/h3-base-prompt-writing.md`.

## Full-Reference Mode

Ref2VA rewrites use `subject_definitions`, `summary`, `retention_analysis`, `detailed_description`, `overall_soundscape`, and `non_diegetic_music` in that order. Reference labels stay consistent across all sections.

Read `examples/h3-reference-prompt-writing.md` for label rules, retention analysis, and complete examples.

## Routing Guard

When the target system separates the video model from the prompt type, verify that the effective prompt type is `h3` before using this skill's output. A valid node-level `h3` or `seedance` override may take precedence over a project setting; clear or correct a stale `seedance` override and read the effective value back. If the H3 model and prompt route do not match, stop instead of silently sending H3 output through a Seedance prompt path.

## Output Rules

- Write rewrite sections in English; preserve dialogue, lyrics, and visible scene text in their original language.
- Describe each shot by composition, subjects, environment, actions, camera, sound, and the exact point where referenced content appears.
- Avoid plot summaries, unresolved reference labels, and timing that does not match the requested duration.

## Exact Generated State Sequences

For a countdown, clock or other difficult changing photographed value, create a temporal storyboard
before video generation. Default to six cells, while choosing another count when it represents the
required states more accurately. Put each exact reading in its own reviewed cell, preserving formatting,
typeface, color, scale, placement, perspective, lighting and background. Approve the cells visually,
attach the board as a Ref2VA image reference, and explain in `retention_analysis` that it supplies state
and order rather than a visible grid. `detailed_description` gives the exact transition timing and
requires one normal full-frame video. Reject malformed output, improve the board or prompt, and regenerate
the smallest failing shot; never patch or locally retouch generated video.

Visible dialogue defaults to joint audiovisual generation. Put the exact line in `<d>`, fit the request
duration to the measured delivery, describe synchronized mouth movement and delivery in the timeline,
and specify matching ambience and physical sounds in `overall_soundscape`. Use `non_diegetic_music: N/A`
when no audience-only score is intended.

For multilingual source dialogue, detect and confirm language per utterance. Put the language code beside
every `<d>` line and explicitly preserve that turn's original language: for example
`WOMAN [ja]: <d>待って</d>` followed by `MAN [en]: <d>No.</d>`. Do not translate, transliterate, infer
language from subtitles, or let H3 collapse several turns into the clip's dominant language.
