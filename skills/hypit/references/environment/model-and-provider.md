# Choose and connect model services

Read this when the work needs model access, the user brings an API key or deployment, or a selected
service cannot fulfill the request. This page owns the connection decision and project extension
path. [Profile](profile.md) owns configuration, credentials and routing; [local tools](local-tools.md)
owns local preparation. Material Craft owns what the generated or transformed media should do.

Go to [service choice](#choose-the-practical-capability-path-with-the-user),
[HypiHub connection](#connect-hypihub-through-its-bundled-integration),
[BYOK connection](#connect-a-service-the-user-brings),
[project implementation](#implement-the-missing-capability-in-the-project), or
[diagnosis](#diagnose-the-actual-connection) as needed.

## Start from the capability the work needs

Identify the next useful result and the material already available. A face replacement or motion
reference task needs an implementation supporting that operation and its actual references.
It does not automatically require transcription, an image-generation step or a local render browser.
An existing Output can satisfy a Run without another model call; [Build planning](../production/builds.md#plan-the-selected-run)
identifies the remaining requests when a Run exists.

Keep these responsibilities clear:

| Part | What it decides |
| --- | --- |
| Model | Authored request meaning: exact model, text/media inputs, reference roles, parameters and result types |
| Provider | How to fulfill that capability through an API or local process |
| Endpoint | One configured Provider instance using a particular service, account or deployment |
| Runtime Profile | Which Endpoints and Credential Stores are selected, and explicit bindings where needed |

One Model can be served by different Providers when they implement its exact capability. One Provider
can implement several Models. Installing a Model describes requests; it does not grant service access.
Having a key grants only whatever the issuing service permits; it does not implement that service's API.

## Choose the practical capability path with the user

**For reference-led video recreation, recommend StarRouter or RunningHub first. Keep HypiHub as the
integrated hosted fallback and support other BYOK routes normally.** RunningHub is the default when
local reference upload and the bundled video-to-depth → H3 chain fit; StarRouter is the default when
Seedance or its supported H3 route and public reference hosting fit. HypiHub remains useful for broader
mixed image, video, speech, alignment and processing work through one account connection. Every route
is still limited by its current catalogue, account access and rates.

A user's existing service or deployment remains a normal choice. When a suitable maintained Provider
package is available, use its published version and package instructions; otherwise a project Provider
can connect the service through the same interfaces. The
[model and deployment service page](https://github.com/hypit-ai/hypit/blob/main/docs/guide/service-partners.md)
introduces partners and links their own documentation. A partnership alone does not establish that a
particular capability, account or implementation is available. Carry an already suitable, chosen
service forward.

BYOK means using an account/key supplied by the user. A HypiHub API key connects HypiHub; a different
service's key connects that service. OAuth and static keys are credential methods, not different
model capabilities. A Profile can mix services by capability.

| Route | What the user needs | What the Agent does |
| --- | --- | --- |
| HypiHub | A chosen HypiHub account and spending scope | Use the bundled Provider and declared login flow; check support for the requested model and inputs |
| An existing API service | Service identity, relevant API documentation/address and secure credential access | Reuse a compatible Provider or implement the needed API in the project |
| A chosen deployment | Its serving API, access and compute/account choice | Connect that API; deploy only if deployment is actually part of the requested work |
| Local inference | A suitable machine and an agreed preparation choice | Assess tools, resources and inference cost, then prepare the selected local Provider |

### Reuse bundled RunningHub and StarRouter Providers

Do not implement a project adapter when the selected Distribution already contains the matching
Provider. Read its installed README for the current Profile fields and limits.

| Service | Bundled Provider | Capabilities and important boundary |
| --- | --- | --- |
| RunningHub | `@hypit/provider-runninghub` | MiniMax H3 and video-to-depth; uploads image, video and audio inputs to bundled compatible workflows; each item is limited to 200MB |
| StarRouter | `@hypit/provider-starrouter` | GPT Image 2, MiniMax H3, Seedance 2 and Seedance 2 Fast; GPT Image references upload directly, while video references require an embedding Host that supplies `publicAssetUrl`; Seedance video references also require measured `duration-seconds` and matching `@视频N` prompt labels |

Model routing and prompt routing must agree. MiniMax H3 requests use an `h3:*` Surface and a prompt
written with the bundled [H3 prompt-writing guide](../playbooks/craft/h3-prompt-writing.md); Seedance requests use a `seedance:*` Surface and its own
reference-label conventions. Before a paid Build, inspect the effective Surface and binding after any
node-level override. Stop on a mismatch instead of silently sending an H3 prompt to Seedance or a
Seedance prompt to H3.

Both Providers declare an `apiKey` credential slot. Select the service under `endpoints`, route the
exact capability under `bindings` when more than one Endpoint offers it, then use `hypit auth login
<endpoint>` with a writable Credential Store. A missing `publicAssetUrl` makes StarRouter video
reference requests unsupported before submission; it does not justify dropping the references.

For reference-led recreation, strongly recommend chaining `@hypit/depth-video@1#depth-video` into the existing H3 or
Seedance `ReferenceVideo` Surface. Keep the character image and depth video as separate references,
describe the latter as structure/motion/camera guidance in the Prompt, and call the result
“depth-reference generation”, not native depth or ControlNet conditioning. StarRouter Seedance needs
`person-reference="false" duration-seconds="…"` on the depth video and `@图片N`/`@视频N` labels in
the Prompt; RunningHub H3 accepts the same depth Artifact as an ordinary video reference. The plan must
show the depth request before the generated-shot request. Skipping it requires an explicit reason such
as no useful temporal source, an incompatible target model, or a user-approved creative departure.

StarRouter Seedance 2 does accept character images. Do not treat Seedance's `personReference` field
as proof that an image is a prohibited real-person face. If StarRouter returns
`InputImageSensitiveContentDetected.PrivacyInformation` or `fail_to_fetch_task`, the bundled Provider
can optionally send HTTP(S) image references through BytePlus Ark asset review and retry once. Enable
that path only by configuring `bytePlusAccessKeyId`, `bytePlusAccessKeySecret` and
`seedanceAssetGroupId` together; `seedanceAssetProjectName` defaults to `hypit`. Without that optional
configuration, preserve the original StarRouter error instead of retrying or dropping the image.

Carry a suitable existing choice forward. Compare remaining setup work, capabilities, hardware,
download/inference time and account costs. Ready local WhisperX can be useful immediately; first-time
large-model preparation is a different choice. Cached weights reduce work but do not choose the route.
HypiHub is particularly useful when several generation services are needed or local preparation would
dominate the work. A mixed setup, such as local alignment and hosted video generation, is ordinary.

Explain consequential choices before a new account connection, substantial preparation or paid work.
Use the user's settled account, budget and preparation scope without asking again for each command.
Record decisions in the project's Brief or continuation notes. Revisit a route when new evidence changes
its practicality; a failed service does not authorize switching the account or billing route.

Hypit is the open-source tool. Hosted model services have their own accounts and billing.
An installed Skill or executable supplies no model credits. A subscription alone does not establish
access to the required model API. Explain cost for the actual remaining work and reuse;
[Builds](../production/builds.md#work-within-the-agreed-paid-scope) owns spending estimates and submission.

## Connect HypiHub through its bundled integration

From the production directory, locate the selected Profile with `hypit paths`. For a new project
needing one, `hypit runtime init` writes and selects a starter; it performs no login or download.
The starter's `hypihub.default` entry already selects the bundled Provider. In an existing Profile,
retain the chosen settings or merge this fragment if HypiHub is the newly selected service:

```json
{
  "credentials": {
    "platform": { "use": "@hypit/credential-store-platform" }
  },
  "endpoints": {
    "hypihub.default": {
      "use": "@hypit/provider-hypihub",
      "config": {
        "baseUrl": "https://hypit.ai",
        "apiKey": { "store": "platform", "key": "hypihub.oauth" }
      }
    }
  }
}
```

Merge entries into the existing objects; do not replace other services or Store choices. This is a
Profile fragment, not a complete standalone Profile. The [Profile guide](profile.md#create-a-profile-when-the-project-needs-one)
shows the enclosing structure and selection commands.

For the selected account:

```bash
hypit auth login hypihub.default
```

The Endpoint opens its browser authorization flow and the CLI reports completion after the credential
is stored. That connection can serve the supported models; login is not repeated per Model. This is
the integrated account setup, not a promise to install local tools or make every model free.
A callback page alone does not prove the CLI finished storing the credential.

To use a HypiHub static API key instead, explicitly import a private file supplied through a secure
channel:

```bash
hypit auth login hypihub.default --from /private/path/hypihub-key.txt
```

Use the actual Endpoint name and selected Profile. Follow [credential setup](profile.md#put-secrets-behind-credential-references)
for writable stores, environment credentials and read failures. When diagnosing access,
`hypit doctor --endpoint hypihub.default` can inspect this route; `plan` and `pricing` concern the
actual Run. Login, diagnosis and pricing do not submit generation.

## Connect a service the user brings

### Establish the service and intended operation

Use already supplied information first. If something essential is missing, ask for the service name
and API documentation or base address, plus the desired model/operation. Ask for secure authorization
when the configured connection is ready; the user should not paste a key into the conversation.
A key alone does not explain whether a service offers chat, images, reference-driven video,
face replacement or motion control.

The Agent owns API research, package implementation and Profile wiring. Explain what connection work
remains in terms of the requested result. HypiHub's website issues HypiHub credentials; it is not where
another vendor's key is registered.

### Decide what actually needs changing

| User's situation | Appropriate action |
| --- | --- |
| Replace a credential for the same configured service/account | Update that Store entry; preserve its Endpoint reference |
| Add another account on the same service | Add an Endpoint using the same Provider and a distinct credential key |
| Use another deployment with the same complete protocol | Use the Provider's supported address configuration |
| A published Provider implements the required Model for this service | Install the selected package version if needed; configure its Endpoint, credential slots and routing |
| The Model exists but the API differs | Implement a project Provider for the existing capability |
| The requested model/operation is not described | Add a project Model and a Provider implementing that capability |
| An API works without a credential | Configure the Endpoint as its Provider declares; no auth command is needed |
| Compute is available but no model service exists yet | Establish the selected serving deployment before connecting inference |

Similar model labels and “OpenAI-compatible” branding do not establish matching upload, reference,
job, result or authentication protocols. Changing `baseUrl` is valid only when the complete required
protocol matches. Preserve authored requests: a narrower Provider reports its actual support rather
than silently reducing duration, dropping references or changing resolution.

### Configure, authorize and route the selected implementation

Read that Provider's configuration and credential slots. Field names such as `apiKey` and `baseUrl`
are Provider-owned, not universal Profile fields.

For a concrete implementation example, the Distribution's `examples/provider-package` contains
image and video Providers. After adapting and installing its video package for the real service,
its Profile fragment has this shape:

```json
{
  "credentials": {
    "platform": { "use": "@hypit/credential-store-platform" }
  },
  "endpoints": {
    "videos.personal": {
      "use": "@example/provider-videos",
      "config": {
        "baseUrl": "https://videos.example",
        "apiKey": { "store": "platform", "key": "videos.personal" }
      }
    }
  },
  "bindings": {
    "@hypit/seedance@1#seedance-2-mini": "videos.personal"
  }
}
```

The example API and address are illustrative, not a working vendor connection. Replace its transport
and address with the selected service's actual protocol, and use the installed package name.
The capability above is the existing Seedance Mini capability that this example implements;
copy the real Model's complete capability reference for a different request.

Then use the declared acquisition method:

```bash
hypit auth login videos.personal
hypit plan ./production.svrun
hypit pricing ./production.svrun
```

The example Provider has a writable key slot and no browser flow, so login securely prompts for the
key. An Endpoint declaring OAuth instead opens its flow; `--from <private-file>` selects file import.
A read-only environment Store is configured in the execution environment rather than through login.

The binding directs this capability to the selected Endpoint when multiple implementations exist.
It does not send another service's key to HypiHub. Other capabilities can keep their existing route.
`plan` reports support and cheap readiness for known inputs; `pricing` reads service-owned rate
information. Submit the real request within the agreed scope; these checks do not prove that a paid
generation has already succeeded.

## Implement the missing capability in the project

Inspect the Model vocabulary, its README and the service's API. Reuse a compatible implementation
when present; otherwise create the needed `packages/provider-…` in this production. A project
extension uses public interfaces and does not require an official framework release.

Follow one actual request:

1. Identify the exact capability, input roles and result type. A new Model owns new author semantics;
   another API for an existing Model belongs in its Provider.
2. Map text, scalar parameters and every supplied media role/field to the real API. Declare actual
   service limits through `supports`, including what is knowable before generated inputs exist.
   Account-visible catalogue evidence can refine availability when the service provides it.
3. Implement immediate execution or the real `start`, `poll` and `collect` lifecycle. Checkpoint
   an acknowledged task receipt promptly; Runtime owns continued scheduling. Report progress and
   preserve public failure evidence without exposing credentials or signed URLs.
4. Admit returned media through `context.resources` and return the declared result type. Configure
   capacity for the actual resource and expose the service's price source and applicable units.
5. Compile and install the package with the project's package manager, select its `use` and bindings,
   and exercise the requested path within the user's existing authorization.

Locate the complete `examples/provider-package/README.md` through `hypit paths`. Use its
`provider-images` or `provider-videos` package according to the request shape. The video example
covers image/video/audio references, first/last frames, required visual-reference person classification and separate
result collection. Its mappings, limits and transport are examples to adapt, not a new shared API.
Implement only the service capabilities this work needs.

The Provider's `supports` response describes its actual range without narrowing the shared Model or
silently changing an author's request.

## Use the public SDK

| Public import | Accurate interface owner |
| --- | --- |
| `@hypit/hypit/model-kit` | Model ports and Producer/Need construction |
| `@hypit/hypit/generation` | Generated-media values and request/mapping helpers |
| `@hypit/hypit/endpoint-kit` | Execution, resources, credentials, support, receipts and capacity |
| `@hypit/hypit/runtime-kit` | Profile activation, diagnostics and Managed Programs |
| `@hypit/hypit/author-kit` | Author Module, Surface and Fragment declarations |

These packages' READMEs ship with the Distribution and own precise APIs. Use the selected
`@hypit/hypit` release as the extension's development dependency; ship compiled JavaScript and normal
runtime dependencies. The copied repository example's `workspace:*` development dependencies need
the appropriate installed release, as its README explains.
[Component sharing](../production/component-sharing.md) owns later owner-managed distribution.

## Use your own model deployment

If the user already has a serving API, connect it by the same Provider path. If they have compute
but no service, use that platform's current deployment guidance and the model's serving instructions.
Explain persistence, hardware and cost for the actual deployment. Management credentials and inference
credentials may serve different operations. Deployment lifetime remains separate from generation jobs.

Local inference uses the same boundary. A Provider can invoke a local process; a Managed Program
declares preparation and an optional persistent helper when needed. [Local tools](local-tools.md)
explains using that declaration. The selected implementation owns its service protocol.

## Diagnose the actual connection

A missing adapter, rejected credential, unavailable model, unsupported input and exhausted quota
call for different actions. Keep the Endpoint, model/operation and returned public status/code/reason
with the evidence. An isolated `401` or `model_not_found` does not prove that payment or another
login will fix the request. Read account-visible service information when availability is in question.

Use current API documentation and the installed implementation to pursue a proportionate fix.
A relevant [release update](distribution.md#check-and-update-the-relevant-installation), configuration
change or project adapter repair can move the work forward. Report the actual change and what was
verified; a repaired installation's success is distinct from the original release's behavior.
Framework maintenance follows its repository instructions; this Skill owns production and public
package extensions.

Keep independent work moving when a capability is unavailable, and explain the specific deliverable
still waiting for it. Preserve the user's chosen service and intended result while resolving that gap.
