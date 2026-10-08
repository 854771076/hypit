---
title: 模型与部署服务
description: 内置模型 API Provider 与自有模型部署。
---

根据作品需要的模型和参考素材选择服务。这与[在哪个 Agent 中工作](./agents.md)是不同的选择。发行包内置灵狐工作室、StarRouter 与 RunningHub 三个第三方模型 Provider；本地媒体、渲染和转写 Provider 不受影响。

这些服务各自拥有独立账户、条款、价格与模型可用性。Hypit 的制作计划只展示将使用的 Provider 和请求，不代替服务商账户的额度管理。

## 灵狐工作室

[`@hypit/provider-linghu-studio`](https://github.com/hypit-ai/hypit/blob/main/packages/provider-linghu-studio/README.md) 通过[灵狐工作室](https://ai-short-studio.vvicat.dev/zh) Model API 调用当前账户模型目录中的图片和视频模型。

需要先在[设置 → API Keys](https://ai-short-studio.vvicat.dev/zh/settings/api-keys)创建以 `vvk_` 开头的 API Key，并授予 `models:read` 及实际使用的 `models:image`、`models:video` 权限。完整的 `projectId`、模型映射、凭据和参考素材配置见 [Provider README](https://github.com/hypit-ai/hypit/blob/main/packages/provider-linghu-studio/README.md)。

## RunningHub

[`@hypit/provider-runninghub`](https://github.com/hypit-ai/hypit/blob/main/packages/provider-runninghub/README.md) 通过兼容的 RunningHub 工作流提供 MiniMax H3 和视频转深度，并上传图片、视频和音频素材。每项上传素材上限为 200MB。

## StarRouter

[`@hypit/provider-starrouter`](https://github.com/hypit-ai/hypit/blob/main/packages/provider-starrouter/README.md) 提供 GPT Image 2、MiniMax H3、Seedance 2 和 Seedance 2 Fast。参考素材可使用 Runtime Profile 中的 S3 兼容 `publicAssets` 对象存储发布；Seedance 2 人物图还可选用 BytePlus Ark 素材审核链路。

## 本地 Provider

本地媒体处理、HyperFrames 渲染、OpenCV 图像处理和 WhisperX 转写继续作为发行包能力使用。它们不是第三方模型商，不需要上述服务的 API Key。

## 自己部署模型

自有推理服务仍沿用 Model–Provider–Endpoint 关系接入。协议完全兼容时复用现有 Provider，否则在项目包中实现对应的请求与结果映射。算力和部署费用属于所选云账户。

[使用自有模型部署](./providers.md#使用自有模型部署)说明自己管理服务环境时需要处理的配置。
