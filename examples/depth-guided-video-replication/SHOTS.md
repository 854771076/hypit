# Semantic events and atomic shot contracts

This file is the paid-generation gate for the example. The checked-in values demonstrate the contract;
fixture assets keep the shot `blocked` until real selections and reviews replace them.

## Semantic event timeline

Seconds and frames are compiled evidence. Script words and actions remain the owning anchors. Recompile
dependent events whenever selected audio, speech timing or an upstream retained duration changes.

| event id | semantic anchor | source evidence | depends on | fps | target frame/time | observed frame/time | delta/status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S01-speech-start | first target word from the approved Script timing | reference transcript plus approved adaptation | S01 | 30 | pending approved speech plan | pending selected take | blocked; pass at ≤1 frame |
| S01-speech-end | final target word followed by natural lip closure | reference transcript plus approved adaptation | S01-speech-start | 30 | pending approved speech plan | pending selected take | blocked; pass at ≤1 frame |
| male-face-reveal | after the previous speaker's final word and settled reaction | reference 00:23.600 | previous accepted shot | 30 | 708 / 23.600 s | pending selected Film | blocked; pass at ≤1 frame |
| timer-03 | approved display state becomes visible | reference analysis | countdown shot | 30 | pending approved event plan | pending selected Film | blocked; pass at ≤1 frame |
| timer-02 | next approved display state replaces `timer-03` | reference analysis | timer-03 | 30 | pending approved event plan | pending selected Film | blocked; pass at ≤1 frame |

## shot:S01

- source evidence: one approved source excerpt and its transcript/action observations
- narrative job: the host delivers one complete line while moving toward the destination
- generated duration / intended edit: 5 s / measured after the selected native-audio take
- provider / model / mode: RunningHub / MiniMax H3 / Ref2VA
- picture-and-sound: joint native audio; source audio forbidden
- first readable state: host upright at the approved mark, facing the destination, approved prop in the
  approved hand
- causal action: preparation → plausible weight transfer and movement → speech completion → recovery
- stable tail: closed mouth, settled weight, unchanged screen direction and prop ownership
- camera: approved side and axis, medium vertical framing, one restrained movement curve
- light and look: practical phone-short-drama image, readable background, natural skin texture, restrained
  sharpening/diffusion, no fashion-ad polish
- exact dialogue: `HOST: We made it. Keep moving.`; measured from the selected native-audio Result
- sound: stable host voice, room tone, breathing, clothing, footsteps and prop contact generated together
- storyboard: temporal / `assets/character.png` fixture / blocked pending reviewed replacement
- temporal storyboard: `assets/character.png` fixture / blocked pending reviewed replacement
- shot board: `assets/character.png` fixture / blocked pending reviewed replacement
- depth: `generate`; provider `runninghub`; workflow `2098674379113979905`; source
  `assets/original-shot.mp4`; expected Output `depth-map.video`; selected Result pending; review pending
- audio reference: source-language voice, delivery, emotion and room perspective / fixture pending replacement
- video prompt: `shot-prompt` / blocked pending review
- continuity in/out: independent opening; do not inherit an unrelated previous tail
- timing: `S01-speech-start` → `S01-speech-end`; target frames come from the approved speech plan;
  observed frames come from the selected audiovisual Result; compare them rather than redefining targets
- approved visible text: none; reject subtitles, translations, captions, logos, watermarks and glyphs
- ordered references: optional character, scene and prop boards; required temporal storyboard, shot board,
  depth video and audio reference; see SVML child order
- selected audiovisual Result/version: pending
- identity review: required; blocked pending comparison of every visible key character with the selected
  character-board version and reviewed evidence frames
- native audio / speech timing / Caption timing / lip-sync review: pending / stale until Result selection /
  stale until speech review / not applicable unless native lip sync fails
- source policy: original picture and original audio usage in final Timeline must both equal zero
- acceptance: cut, speech start/end and approved state changes within 1 frame; correct identity, gait,
  contact, sound field and OCR allowlist
- candidate budget: 2; a named high-risk exception may approve a third candidate
- attempt ledger: empty
- same-cause failure count / next fallback: 0 / revise storyboard, reference binding, continuity or model
- generation status: blocked
- review risks: identity, gait, prop contact, native speech sync, incidental text and transition tail

Selecting or regenerating S01 invalidates its older ASR/word alignment, Caption timing and lip-sync review.
Those derivatives and every dependent compiled event return to `blocked` until rebuilt from the new
selected native audio.

## shot:COUNTDOWN-03 and shot:COUNTDOWN-02

- narrative job: show the physical timer changing through exact required states
- generation: create one temporal storyboard containing `00:00:03` and `00:00:02`, defaulting to six
  cells and assigning each exact reading its own cell; attach the approved board as a semantic image
  reference and state the transition timing explicitly in the video prompt
- approved visible text: exact reading only, including both colons and every leading zero
- review: original-resolution visual inspection plus OCR; any malformed, translated, repeated or extra
  glyph rejects that state
- timing: generated video reaches the approved states on `timer-03` and `timer-02` compiled frames
- source policy: no source picture or source audio in either asset or the final Timeline
- candidate budget: 2; stop at the second same-cause failure and revise the prompt, storyboard or model
- generation status: blocked until storyboard, OCR evidence and event frames are selected
