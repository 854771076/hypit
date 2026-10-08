---
title: Model and deployment services
description: Bundled model API Providers and self-hosted model deployments.
---

Choose a service for the models and reference media your production needs. This is separate from [where the Agent runs](./agents.md). The Distribution bundles three third-party model Providers: Linghu Studio, StarRouter and RunningHub. Local media, rendering and transcription Providers remain available.

Each service has its own account, terms, pricing and model catalogue. Hypit's production plan shows the Provider and requests it will use; the service account remains the source of truth for credits and billing.

## Linghu Studio

[`@hypit/provider-linghu-studio`](https://github.com/hypit-ai/hypit/blob/main/packages/provider-linghu-studio/README.md) calls image and video models from the current account's catalogue through the [Linghu Studio](https://ai-short-studio.vvicat.dev/en) Model API.

Create a `vvk_` API key under [Settings → API Keys](https://ai-short-studio.vvicat.dev/en/settings/api-keys), grant `models:read` plus the required `models:image` or `models:video` scopes, and save it in Hypit's credential store. See the [Provider README](https://github.com/hypit-ai/hypit/blob/main/packages/provider-linghu-studio/README.md) for `projectId`, model mappings, credentials and reference-media publishing.

## RunningHub

[`@hypit/provider-runninghub`](https://github.com/hypit-ai/hypit/blob/main/packages/provider-runninghub/README.md) serves MiniMax H3 and video-to-depth through compatible RunningHub workflows. It uploads image, video and audio references up to 200MB each.

## StarRouter

[`@hypit/provider-starrouter`](https://github.com/hypit-ai/hypit/blob/main/packages/provider-starrouter/README.md) serves GPT Image 2, MiniMax H3, Seedance 2 and Seedance 2 Fast. Reference media can be published through an S3-compatible `publicAssets` store, and Seedance 2 character images can optionally use the BytePlus Ark review path.

## Local Providers

Local media processing, HyperFrames rendering, OpenCV image processing and WhisperX transcription remain bundled. They are not third-party model vendors and do not require the API keys above.

## Your own model deployment

A self-hosted inference service uses the same Model–Provider–Endpoint relationship. Reuse a Provider when the full protocol matches, or implement the service-specific request and result mapping in a project package. The selected cloud account owns its compute and deployment costs.

[Using your own model deployment](./providers.md#use-your-own-model-deployment) explains the configuration involved.
