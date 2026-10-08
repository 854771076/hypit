# Directing generated video

Read this before writing or adapting a video prompt, performance Recipe or action. An image can
establish who and where; generated video brings the Script and visual idea to life through speech,
interaction, camera behavior or silent action.

For creator-led social video, favor an appealing, engaged performance: the speaker responds to what
they are saying and draws someone into the thought. Voice, expression and movement carry that
relationship together. Expressiveness concerns how clearly the attitude comes through; it can be
outgoing or restrained.

## Let footage carry temporal behavior that matters

Choose generation inputs from what the new shot must actually realize. A still can establish a
person, object, place or composition; prose can direct an action and its expressive purpose. When a
particular unfolding in time is essential to the result—its performed rhythm, path, contact,
coordination or camera relationship—and prose and stills would lose that information, use the
relevant source footage as a video reference to a model that accepts it. This judgment follows the
action the work needs, whether or not the user names a generation method. A broadly described action
can leave more freedom to the model when its exact movement is not the point.

Replacing a person is a common case; the target may instead change an object, world, words or sound.
A comic speaking performance can depend on the relation between vocal phrasing, face, gesture and
camera angle; dance on coordination, a fight on contact, and a fixed-camera mishap on how its cause
and payoff develop within the view. Watch and listen to learn what the source contributes. Its vocal
manner can inform direction, while Script and [voice direction](voice-direction.md) establish the
target's words and voice. The video reference can carry temporal behavior while image references
establish the new visible facts and the prompt directs their relationship.
[Transformation](../../creation/transformations.md#reshape-an-event-from-footage) owns what the
new work keeps and reshapes. Watching a reference to understand a work is distinct from connecting
a selected excerpt as an actual generation input.

Choose an excerpt that contains the useful action and, when relevant, its preparation or settling.
Its range follows the relationship to preserve, the intended new duration and the selected model's
reference limits. Connect the actual footage in Source; describing it in prose does not supply
its temporal behavior to the model. The selected model and Provider determine supported combinations
and media requirements; read their installed vocabulary and package documentation for the exact
request. Seedance requires `person-reference="true|false"` on each image/video reference: true if
the supplied material contains a person, false otherwise.
Inspect the selected excerpt, not just its first frame. Audio must omit the field; the installed
Seedance README owns the corresponding required first/last-frame attributes.

For a reference-led recreation, a depth prepass is mandatory before final shot generation. Generate and
inspect the depth video first, then pass it as the motion/structure/camera reference; an optional selected
character board may additionally carry identity and appearance. Never omit this edge from the request
graph; choose another model or Endpoint when the current route cannot consume it.

Before compiling a recreation request, approve both its temporal storyboard and shot board, then bind
them with the required depth video, audio reference and video prompt in one ordered per-shot manifest.
Selected character, scene and prop boards and spatial previz are optional additions.
[Asset and shot preproduction](asset-and-shot-preproduction.md)
owns this gate and the different responsibility of each reference. A complete asset library does not
mean every asset belongs in every request; use the views that know this shot without silently dropping a
required identity, world, prop-state, storyboard or depth role.

Lock a recreation's visual baseline before generating shots: source exposure and white balance, skin
texture and diffusion, contrast and saturation, lens/field of view, depth of field, camera height and
movement character. Carry the same concrete baseline into every related request. When literal source
boundary images are compatible with the intended transformation, prefer first/last-frame generation
for adjoining shots and use the accepted previous tail as the next head; a prose reminder is not a
pixel-continuity edge. Preserve identity, costume, body proportions, screen direction, held-prop state,
key-light direction and the source shot's end pose across that handoff.

Direct physical actions through contact states rather than action names alone: anticipation, limb and
joint path, contact point, transferred weight, prop response, recovery and a briefly stable tail. Split
an interaction when one request would need several independent contacts or exact hand choreography.

## Build natural motion from causes, not adjectives

Do not use `natural movement`, `realistic motion` or `cinematic motion` as a substitute for direction.
Give every visible person one current primary action, an attention target, a trigger for reacting and a
clear state while uninvolved. In a group, name people by stable position or identity and stagger onset,
amplitude, gaze and reaction latency unless the Script truly calls for marching, ritual unison or a
shared startle. A group that turns, nods, blinks or starts walking on the same frame reads as generated.

Stillness is not a frozen frame. At a shot size where the behavior is visible, let breathing move the
chest and shoulders slightly, let gaze refocus through small eye movements, allow irregular independent
blinks and carry expression through a continuous transition. Use only a few of these cues and keep
background behavior below the narrative subject; a list of periodic micro-actions creates another kind
of mechanical performance. Voice-over keeps visible lips closed, but the face, eyes, breath and posture
remain alive.

Give larger movement a physical chain: planted support, center-of-mass transfer, hip or shoulder lead,
joint path, acceleration, deceleration, follow-through and recovery. After contact, keep the correct
grip, load and connected-object response. Hair, hems, loose sleeves, accessories and carried objects are
secondary motion: they lag the driving body or wind, travel at smaller amplitude and settle with damping.
Do not add windless flutter, whole-body phase locking or an instant stop. The setting may respond only to
an evidenced force—a cushion compresses after sitting, a door creates a brief draft, a footfall disturbs
nearby dust—not because the shot needs generic movement.

Keep the prompt's motion budget small: one narrative primary action and only the secondary motions that
make its cause, weight or reaction legible. Split a shot when several exact interactions compete. Give
the camera one motivated curve with a start, speed development and end; a locked-off camera never drifts.
This follows the practical separation of subject, camera and scene motion in Runway's official Gen-4
guidance, the structured subject/action/context approach in Google's Veo guidance, and the prompt-
extension practice published with Wan. These sources support richer, explicit motion description; they
do not make text alone a substitute for depth, motion tracks or other temporal references when exact
timing matters.

Primary references:

- Runway, `Gen-4 Video Prompting Guide`: https://help.runwayml.com/hc/en-us/articles/39789879462419-Gen-4-Video-Prompting-Guide
- Google DeepMind, `How to create effective prompts with Veo 3`: https://deepmind.google/models/veo/prompt-guide/
- Wan-Video, `Wan2.1`: https://github.com/Wan-Video/Wan2.1
- Lightricks, `ComfyUI-LTXVideo` motion-track workflows: https://github.com/Lightricks/ComfyUI-LTXVideo

## Turn subtext into gaze and facial behavior

An internal state is not a visible instruction. Convert it into a causal performance chain: the person
receives a word, sound, sight or touch; attention moves; they try to preserve a social mask; one small
feature leaks the change; they decide or act; a residual expression survives into the cut. Stop when the
Script, storyboard or approved character profile supplies no evidence for the next link. Do not invent a
secret motive merely to make the shot feel dramatic.

Give gaze an object and screen geography. Name the person, prop or off-screen position being watched;
state whether the character holds, glances, averts or returns; and choose whether the eyes lead the head
or the head turns with them. Preserve the off-screen target across the axis. Looking into the lens is a
specific direct-address or POV choice, not a default sign of intensity. Direct the listener too: receiving,
judging, resisting or anticipating can be legible through attention and timing without copying the
speaker's movement.

Facial direction should describe visible change instead of a broad emotion label. In a close shot, use
one or two readable regions—brow tension, eyelid narrowing, a held lower lip, one lip corner losing its
smile, nostril tension or a jaw set—and give the change a low-amplitude onset, apex and release. Do not put
FACS Action Unit numbers into a model prompt; FACS is useful here because it separates observable muscle
components, not because its codes are model vocabulary. Do not stack the whole face or hold a
micro-expression as a pose. At medium distance, carry the same beat through gaze, head, breath and jaw;
at wide distance, use posture, pause, interpersonal distance and blocking.

Bind these choices to the character profile. `eyeline_behavior`, `blink_rhythm`, `stress_response`,
triggered `habitual_actions` and `forbidden_performance` travel with the selected character reference as
`performance_constraints`. A habitual action appears only when its recorded trigger occurs, while a
forbidden performance remains forbidden in every shot. Profile behavior supplies continuity; the current
dramatic stimulus determines whether and how it becomes visible.

OpenFace's public implementation treats gaze, head pose and facial Action Units as distinct measurable
channels, while FACS decomposes facial movement into anatomical components. GoHD likewise separates pose,
gaze and expression driving. These are useful design boundaries: coordinate the channels around one
dramatic beat, but do not collapse them into one synchronized facial gesture.

Primary references:

- Paul Ekman Group, `Facial Action Coding System`: https://www.paulekman.com/facial-action-coding-system/
- OpenFace, `Action Units` and gaze APIs: https://github.com/TadasBaltrusaitis/OpenFace/wiki/Action-Units
- GoHD official implementation: https://github.com/Jia1018/GoHD
- EMOCA official implementation: https://github.com/radekd91/emoca

For a longer action, distinguish the duration of source footage the model can accept from the
duration it can produce in one request. Use one request when the model's capability and the work's
continuity allow it. A forty-second fight might contain several exchanges and reversals, or its
uninterrupted choreography might be the point. If separate requests serve the work, select excerpts
around meaningful action or camera relationships and carry forward the target
people, objects and world through useful references. A literal boundary frame helps when that exact
continuity is intended; it is not needed for every new passage. The accepted outputs establish the
target's actual time. When uninterrupted continuity is essential, use a capability that can carry
it or explain what an edited interpretation changes. When an accepted wordless action carries the
passage, [empty Segments](../../production/media.md#empty-segments-use-their-media-boundaries)
let that material establish its time without word tokens.

[Reference relationships](generated-dependencies.md) owns how images carry identity and world
forward across requests. This page owns the decision to give a video request temporal evidence.

## Direct the reason for an action

Give the passage a clear expressive intention, then specify the few details that decide how it
lands. Start with how the speaker regards the subject and relates to the listener: eagerly sharing
a discovery with a friend, weighing an ambitious claim with skeptical interest, or affectionately
roasting something they know well. Such directions suggest voice, expression, posture and rhythm
together. Their value is the performable relationship they contain.

As with [Image direction](image-direction.md#two-ideas-behind-every-sentence), high-level
language should carry sensory direction. The model can realize "admiring but incredulous" across a
whole passage. Words such as "lively" or "expressive" set an energy level; the speaker's particular
response to the meaning gives that energy direction. Locate the consequential thought in the Script
and make its expression concrete: what earns an accent, changes the face, or moves the body?
Voice, expression and gesture can reinforce one response, with whichever channels make it legible.
A single revealing reaction can carry the thought; specifying all channels at every phrase adds no
inherent value.

For example, alongside a Script that questions a price and ends with an ironic compliment:

```text
She is venting to a friend with affectionate exasperation at how overpriced this is. At the price,
her eyebrows rise and her open palm turns upward with an incredulous vocal accent. Let the final
compliment land with a teasing smile in her voice.
```

The first sentence directs the entire encounter. The details make the price and the ironic turn
read clearly; the remaining phrasing and movement can grow naturally from that attitude. A detail
earns its place when it clarifies a judgment, reveals a response or preserves an important physical
relationship. Attaching a hand movement to every phrase adds choreography without necessarily
strengthening the expression.

Let the thought determine whether the attitude develops or holds: an example may win a skeptical
speaker over, while a firm argument may sustain the same conviction throughout. When adapting a
reference, recover what prompts the reaction and how it lands, then find the corresponding thought
in the new Script. This preserves the expressive relationship while letting the new words call for
their own movements and phrasing. Phrase-level emphasis should fit the performed language's tones
and cadence; a source-language stress pattern is not a universal performance instruction.

Carry the character, voice and useful physical relationships across Takes while directing the
attitude each passage calls for. The same speaker can invite, question, tease and persuade as the
argument develops. Shared direction can preserve their manner; the passage supplies the particular
response. Carry forward production continuity, and reconsider the expressive intention whenever the
thought changes. Stable framing leaves room for changes in face, voice and posture.

## Give restraint an expressive purpose

Seriousness can mean weighing a claim, insisting on a fact or challenging an assumption. A relaxed
person can tease, dismiss or show interest with very little effort. Choose the behavior that conveys
that attitude. A small, deliberate response can carry more conviction than constant movement.

For a serious judgment:

```text
She weighs the claim with skeptical interest. Her brow tightens at the price; she gives the number
a pointed emphasis, then lands her judgment with a small, decisive nod.
```

For a languid response:

```text
He lounges back in the chair, amused that anyone finds this impressive. He draws out the setup
with a sideways glance, then tosses off the verdict in a light, dismissive tone.
```

These are different intentions, not prescribed poses for every serious or relaxed person. Breathing,
blinking and small posture adjustments supply ordinary life; the speaker's response to the content
supplies the performance. Direct that response even when the body stays almost still.

Contrast describes a relationship between things; it leaves the performer's attitude unspecified.
Turn the chosen relationship into something the person can express: "She tries to sound composed,
but cannot quite hide her pride in the result" gives voice and expression a shared direction.
Humor reaches the viewer through the words, situation, response or delivery. A straight-faced
performance can sharpen a clear joke through pointed emphasis or a dry turn of phrase; an unusual
appearance alone does not make an even explanation funny. [Treatment](../../creation/brief.md#treatment-is-the-directors-answer)
owns how the premise becomes a viewer experience; action directs the person's part in creating it.

## Ground actions in the generated scene

The prompt describes what this generation should make visible over time. Give a performer physical
relationships with the camera, people, props and parts of the setting that actually exist in the
generated scene. Translate a later graphic's framing needs into the camera view, gaze or gesture
the video should perform. Give the later Caption, icon or product card its own content and events
through composition. A prop or display intended to exist within the generated scene can be described
as that actual object and connected through the relevant references.

The spoken subject and the visible action have separate responsibilities. A speaker can discuss
objects, quantities, transformations or an imaginary demonstration while the camera records only
their performance in the referenced setting. Preserve the words in Dialogue; use action to describe
the person's response to those words. A quoted phrase can locate a vocal accent or a hand beat
without asking for its meaning to appear as an object, written label or event in the shot.

Make the performer the subject of the direction. "She gives the promise a satisfied accent and a
small nod" identifies what the camera and microphone should capture. "Make the idea tangible" or
"show that it works" leaves the means of demonstration open. Complete that translation into the
intended voice, expression or physical interaction before writing the request. Read the assembled
prompt as one account of the generated scene; a general no-text instruction does not resolve an
ambiguous invitation to demonstrate the spoken content visually.

Capable video models can turn figurative wording into literal objects, events or transformations. Use
concrete visible language for intended gaze, gesture, movement, camera behavior and cuts when a
metaphor would introduce the wrong scene content. Social attitude and aesthetic shorthand remain
useful when they direct performance; an imagined object or event belongs in the prompt when it should
truly appear in the generated world.

Give the performer an attitude they can express, such as questioning a claim with skeptical interest.
The broader purpose of persuading an audience belongs in Treatment; translate it into this person's
delivery and interaction. Decide whether a described action really happens or whether a gesture is
intended, then state that choice. [Direction and its inputs](../../production/system.md#give-each-part-the-direction-it-can-realize)
connects those performance choices to the whole composition.

Natural emphatic gestures are usually more reliable than asking fingers to display an exact number.
Let speech, Caption or MG convey the quantity while pointing and hand actions serve the performance.
An encounter also has edges: someone interrupted can first be occupied, and someone finishing can
begin to leave. Small causes make a clip feel like a piece of life rather than a pose bounded by the
encoder.

## Prepare footage for subject isolation

When the work needs a moving silhouette, choose a background-removal method that can process the
actual footage. For new generation, a continuous, evenly lit chroma backdrop can support a chosen
keying workflow. Choose a color separated from the person's hair, clothing and carried objects;
direct the visible body extent, performance and stable backdrop as facts of this recording. This
is a material-preparation choice for that use. Existing footage can instead use a suitable matting
capability, and an opaque camera view can remain useful through cropping and reframing.

The moving result needs its own alpha-producing operation. A transparent reference still alone
does not establish transparency in generated video. Keep the original when the final work also uses
its setting. [Media preparation](../../production/media.md#keep-original-and-processed-material-explicit)
owns processing, alpha-preserving normalization and explicit use of those outputs. Judge the moving
edge against its intended background, including shoulders, hair, hands, spill and changes in opacity.

## Give each input its own responsibility

| Input | Responsibility |
| --- | --- |
| Character-and-scene references | appearance, setting, framing and the physical state to preserve |
| Product, interface or other factual references | the visible facts that need continuity or exactness |
| Source-footage references | performed, physical or camera relationships whose timing should guide the new shot |
| Recurring voice references | a speaker's intended voice identity when the model accepts them |
| Script dialogue | the exact words, intended pronunciation and speaking turns for a visible performance |
| Prompt Kit or Recipe | a reusable prompt relationship that fits this kind of work |
| Passage direction | attitude, vocal delivery, attention, physical interaction, camera behavior and motivated cuts |

Keep those responsibilities explicit in Source. Prompt prose does not create a media edge, and a
reference does not explain which fact it should preserve. A selected model may accept only some of
these inputs; use its installed vocabulary and package-local documentation for the exact request.
Generated source footage must not contain incidental subtitles, captions, titles, labels, logos,
watermarks, UI text or other unrequested readable text. Approved story text that physically belongs in
the shot, including a countdown, may be generated when the Brief calls for it.

For each exact countdown, clock, message or difficult changing state, make a temporal storyboard before
video generation. Default to six cells, while selecting another count when needed for accurate state
coverage. Give each reading or required state its own cell, approve the original-resolution pixels,
then attach the board as a semantic reference and direct the exact sequence and timing. The output remains
one normal full-frame video and must not reveal the grid. Reject malformed output and regenerate after
improving the prompt or board; never repair generated video with painting, inpainting, compositing,
source-footage patches or local region replacement.

For a visible A-roll performance, the generated video normally carries the person's picture, exact
Script delivery and sound together. In recreation mode, give the request its mandatory audio reference
and the Segment's dialogue; general non-recreation modes may use a recurring Voice Reference when supported.
[Voice direction](voice-direction.md) owns the casting and sample that establish who the person sounds
like. The passage's direction gives that voice its current attitude and delivery.
[Script pronunciation](../../creation/script-and-time.md#write-the-intended-pronunciation) explains
how names and abbreviations receive the intended reading while keeping their display spelling.
Independent speech is a different A-roll construction, described in
[Voice and performance](voice-and-performance.md).

Final generated shots default to joint picture-and-audio generation. Wordless action still carries the
directed ambience and physical sound unless the Brief explicitly requires silence or the Endpoint lacks
native audio; record that waiver before generation. For visible speech, measure the dialogue first, size the
request around that performed duration, include the exact Script line and direct voice, mouth movement,
breath and scene sound in the same request. Seedance defaults `generate-audio` to `true`; for H3, populate
its audiovisual prompt sections and attach the mandatory audio reference in recreation mode. When speech must be produced
separately, plan explicit lip synchronization and review the actual phoneme-to-mouth result before the
Take is accepted.

When the source alternates languages, split analysis by utterance or speaking interval and confirm each
turn's language independently. Write the exact original line and language code into the joint audiovisual
request. Do not use the file's dominant language for every turn, infer speech from translated subtitles,
or let the model translate or switch the declared language.

For silent B-roll, direct the visual event and omit speaking identity that the shot does not use. A
listener or reaction shot can remain silent while still breathing, noticing, adjusting posture or
responding through expression. [B-roll](b-roll.md) owns its editorial relationship to the underlying
performance.

## Choose the generation relationship

Seedance 2 Mini at 720p is the usual starting point for generated performances, balancing capability
and cost. Choose for the intended shot and the user's available services; the selected model's
installed vocabulary owns supported resolutions, references and request lengths.

Generated-video models commonly expose some combination of three relationships:

| Relationship | When it fits |
| --- | --- |
| Text-directed video | The intended world and action do not depend on an existing visual identity, composition or motion reference. |
| First-/last-frame video | The shot must begin or end at a particular authored image. |
| Reference-directed video | Images, video or audio should guide identity, world, voice, motion or camera language without declaring literal endpoints. |

Reference-directed generation is the strong starting point for controlled Hypit production because
useful images can already establish people, scenes, products, composition and visual continuity. The
requested performance then makes that world move. Text-directed or first-/last-frame generation remains
useful when its relationship is genuinely the one the shot needs; a last frame belongs when arriving
at that exact image is part of the intended action.

Model-specific Surfaces and Prompt Kits are implementations of these relationships, not the Craft
itself. Kits produce ordinary Text; Source connects that Text and the actual references to the selected
model request. The current Distribution may provide model-specific Kit packages such as
`@hypit/seedance-kits`; their package documentation owns exact imports, slots, Recipe choices and
reference order. [Prompt Kits](../../production/prompt-kits.md) explains using or authoring a Kit
without making it a model wrapper.

Read the selected template's wording when choosing its Recipe. Composition, camera, edit rhythm,
performance and gesture choices shape different aspects of the footage. Choose them to support the
intended delivery, and use action Text for the passage's particular meaning and reactions.

## Direct camera and cuts as part of the passage

For ordinary direct-to-camera social video, prefer pause-trim jump cuts at phrase boundaries. This
edited rhythm keeps the explanation moving and gives the footage the immediacy of a creator's own
cut-down recording. Stable framing, expressive acting and frequent edits are compatible choices.
Use the selected Kit's documented Recipe choice to express that rhythm.

A podcast can cut with a speaker or toward a meaningful reaction. A street interview can favor the
guest and use the interviewer view for a reaction. An unfolding action or a held reaction may gain
its effect from a continuous shot; choose that temporal shape when it serves the passage.

One generated video can contain multiple shots, several speaking turns or a split-screen composition.
One Segment is not one speaker turn or one camera shot. Conversely, several Takes can reuse the same
character-and-scene image and meet at natural editorial cuts. A genuinely continuous shot calls for
the model relationship and direction that preserve that action. See
[Reference relationships](generated-dependencies.md) when deciding which visual or motion evidence
should condition each request.

When supported by the selected model, several camera images can guide one request through different
views or locations. Direct which people, settings and states each image contributes and how the
passage develops among them. Reference images in this relationship guide the generated footage;
they become literal first or last frames only when that is the chosen generation relationship.
Choose the request's span from the intended performance and the model's supported duration and
reference inputs, not from a one-image-per-shot correspondence.

A prompt-directed jump cut asks the generator for an edited rhythm; it does not inspect or trim the
returned media. When produced footage needs a deterministic cut, speed change or trim, use the
corresponding media operation and align the edited result before it becomes a SemanticTake.

## Size the request around the delivery

Use `hypit measure` on a spoken Segment at its intended pace, including time for meaningful
interaction, pauses and actions. [Script and time](../../creation/script-and-time.md#measure-before-choosing-durations)
owns the command, rounding and the relationship between estimated duration and real aligned time.
Choose that pace from the intended performance and carry it into the voice and passage direction.
For brisk social delivery with trim cuts, `fast` is a useful starting choice; the name `normal`
does not make it the right rhythm for every piece. A shorter duration gives the words less room,
while the direction still supplies the stresses, attitude and reactions that make them engaging.
Measurement sizes the words; emphasis, attitude and motivated reactions give their delivery character.
The target's delivery determines how much generated media the passage needs; the reference video's
seconds help explain its rhythm without becoming the target duration automatically.

Read the selected video model's supported request lengths from its installed vocabulary. Those values
constrain one generation request without defining the finished work's Segment structure or edited
beats. When the estimate does not fit one request cleanly, reconsider the performable passage: a brief
question and answer may belong together, a short line may gain a meaningful reaction, and a long
exchange may divide where its thought turns. Preserve the intended meaning and energy, then choose a
supported duration.

After production, normalized media supplies the real envelope and alignment supplies word positions.
Use that material and timing to compose the piece. [Composition review](../../production/review.md)
owns judging how Caption, MG, B-roll and other layers work with the produced performance.
