# Depth-reference video replication

This example expresses the complete dependency chain:

```text
original shot -> RunningHub depth video
character/scene/prop boards + selected storyboard + depth video + six-part prompt
  -> MiniMax H3 reference video -> normalize -> timeline -> render
```

`depth-reference.svml` keeps the Script, character board, scene board, prop board, selected temporal
storyboard and depth video on separate graph edges. Its
H3 prompt follows the Hypit Skill's bundled H3 Ref2VA contract exactly:
`subject_definitions`, `summary`, `retention_analysis`, `detailed_description`,
`overall_soundscape`, then `non_diegetic_music`. The depth video is an ordinary structural reference,
not native Depth/ControlNet conditioning. RunningHub removes the original audio while producing that
depth reference; the generated shot creates its own synchronized dialogue, ambience and action sound.

`ASSETS.md` and `SHOTS.md` are copyable pre-generation contracts. Complete their asset selections,
semantic event frames, per-shot depth state, audiovisual version bindings and candidate budget before
submitting a paid Build.

This compact fixture demonstrates one atomic production branch; it is not a completed 30-second,
12–16-shot recreation. A real production repeats the `SHOTS.md` entry for every approved atomic unit and
keeps paid generation blocked until those rows contain real evidence rather than fixture placeholders.

The checked-in media are synthetic planning fixtures, so the five image roles deliberately reuse one
local placeholder file to keep the example small. Before submitting paid tasks, replace
`assets/original-shot.mp4` and give `character-board`, `scene-board`, `prop-board`,
`temporal-storyboard`, `shot-board` and the reused `../interview/assets/chad.wav` audio fixture their
reviewed production assets:

```bash
hypit check material.svrun
hypit plan material.svrun --runtime hypit.runtime.json
hypit build material.svrun --runtime hypit.runtime.json --follow
```

For a full recreation, first lock one source-derived visual baseline and generate a short continuity
sample across a cut. Measure visible dialogue before choosing request duration, prefer joint audio for
speaking shots, and keep one scene-level room-tone bed across cuts. For a countdown or another difficult
changing detail, create a temporal storyboard with six cells by default and place every required exact
state in its own cell. Approve it at original resolution with OCR, then attach it as a semantic image
reference and describe every state transition and timing in the video prompt. If generation fails,
improve those inputs and regenerate the smallest failing shot; never paste or retouch a plate over video.

`material.svrun` builds only the depth and generated shot. `production.svrun` continues through
normalization, timeline and final rendering. After a successful material Build, copy its Build id into
`reuse-depth.svrun` to rerun only H3, or into `reuse-shot.svrun` to edit and render without another
paid generation. The checked-in Build id is deliberately a syntactically valid placeholder.
