# 生成短剧视频

`viral-recreation` 与 `standard` 项目都把当前 selected 的 `video-prompts`、制作计划、资产版本和编译约束编译为 Hypit Author Source 与 Run Source。Model Surface 表达准确的图片、视频、音频参考语义，Runtime Profile 显式绑定用户确认的 StarRouter 或 RunningHub Endpoint；插件项目文件只提供制作决策，不再直接提交厂商 API。复刻项目必须先独立生成、完整审核并选中逐镜深度视频，最终视频 Build 只消费该选版，禁止从原片再次生成深度。

开始视频制作前检查参考合同：`viral-recreation` 必须包含从原片生成的 selected `video/depth_reference`；`standard` 仅当制作计划启用白模时包含 selected `video/reference_video`，否则不要求视频运动参考。深度与白模不得混用。每镜必须包含彼此独立的 `image/temporal_storyboard` 与 `image/shot_board`，以及本镜 `audio/audio_reference`；镜头出现人物时加入对应的 `image/character_identity`。统一提交入口会在 Provider 请求前校验全部角色、版本、文件和哈希。

开始视频制作前，对本次待提交镜头逐镜校验时间故事版和镜头分镜板均为当前选版且分别通过八维审计；`storyboard_strategy.mode=blender` 时还必须有当前白模选版、导演合同和七项验收，且白模登记时长、导演合同时长、制作计划时长完全一致。缺少或失败任意一项时停止；单镜重生成不被其他未提交镜头阻塞。每镜的 Provider、模型、提示词协议、输入模式、提示词、时长与参考绑定以当前 selected `video-prompts` 为准，分辨率、画幅和声音参数以 project.json 已确认配置为准；编译出的 Source 必须与这些选版逐字段一致，任何手工改词或改参数都应在 `hypit check/plan` 前拒绝。

整集视频优先按下面三步通过 Hypit 原生图执行，禁止逐镜让用户重复确认、手工拼接参考 URL 或直接加载厂商脚本：

1. **编译全部真实参考边**：把当前镜头合同中的图片、主运动视频和音频版本写成 Author Source 的本地 Resource 引用。RunningHub 在 Provider 内上传本地字节；StarRouter 由 Runtime Profile 的 `publicAssets` 对象存储在 Build 内发布，作者层不得预先拼接公网 URL。
2. **一次计划确认**：为全部待生成镜头编写一份 Author Source 和 Run Source，每镜一个独立 Model Surface；真实参考文件必须作为显式 Resource 边接入。`production compile` 会先逐镜比较制作计划与视频提示词的 Provider、模型、模式、时长以及计划拥有的素材版本/语义角色；执行期新增的顺序字段与深度、双分镜、音频、首帧、白模等派生参考不制造假不一致，但把 `location_identity` 等角色改写成 `asset_board` 会在 `plan/build` 前直接拒绝。执行 `hypit plan` 展示逐镜模型、Provider、输入数量、主运动参考和请求数，不计算具体价格。用户确认的是这份制作计划。

首次进入一个新场景、多人座次或高风险灵力/动作类型时，先各选一镜组成最多三镜的代表性试产 Run；三镜都完成真实音视频验收后才释放同类型其余镜头。已有同一模型、同一参考合同且通过验收的代表镜可以复用，不为形式重复试产。
3. **一次整集 Build**：确认后执行一次 `hypit short-drama production build ... --confirmed`。入口先提交并持久化 Build id，再通过 Runtime 状态等待，最后收集目标 Output；终端中断后重跑会恢复原 Build，不会先产生第二次付费提交。Runtime 按依赖和 Endpoint 容量并发推进 `start → poll → collect`，Provider 回执、未知提交结果保护、失败镜头和可复用完成项保存在 Build 中。单镜失败时只修改该镜 Source/Run 或显式复用已完成输出后重新 Build，不得绕开 Core 用 `get_generation_task` 或厂商脚本补交。

单镜重生成或修复失败镜头时，创建只包含该镜 Target 的 Run Source，仍走相同的 `plan → build` 路径；不得改用 `submit_video` 绕过 Runtime 的请求、回执与结果记录。

视频镜头默认使用原生音频并显式 `generate_audio=true`，声音随视频一次生成，不再提交外部 TTS；必须核对逐秒对白、音乐锚点和相邻镜声音转场。只有用户明确要求或 Provider 明确不支持，且制作计划写明 post-dub/independent 时，才调用独立音频 Skill。

多格分镜板（`panel_grid_size > 1` 的 `board-*` 选版）只以语义参考提交：Seedance 2.0 固定用 `full-reference`，H3 固定用 `Ref2VA`；prompt 还必须包含固定反宫格声明和分镜板时间顺序条款。Comfly 无法同时承载人物、深度、双分镜板与音频，不能进入正式制作计划。成片检测若高置信命中宫格会写 `grid_high_confidence` 并禁止误报放行；中置信 `grid_suspect` 仍须完整观看后记录证据。身份合板不得混入分镜格。

整集所有无依赖镜头由同一 Run 一次确认后提交；RunningHub 和 StarRouter 并发上限由 Runtime Profile 的 Endpoint 容量控制。`production build` 在调用 Hypit 前先用唯一提交标题写入 `pending-build.json`，因此即使进程在 Build 持久化后、返回 ID 前中断，也能从本地 Build 目录找回原任务。Build 终止后自动导出每个已经成功的目标 Output，并连同 Build id 登记为未选中的候选版本；等待、导出或登记中断时保留检查点，同时绑定提交时提示词文档与 Run 的 SHA-256。再次执行 build 会先校验并按原提示词版本幂等恢复剩余 Output，不会重新付费提交；文件被改写时保留待回收记录并要求先恢复。候选不会绕过验收自动选版；通过审核并选中的成功镜头只要逐镜合同未变化，就会从下一次 Run Target 中排除。单镜失败不阻塞无依赖镜头；权限、余额、审核、schema、模型能力或在途冲突错误不自动换模型或换 Provider，定位后仅重建失败镜头。旧项目尚未迁移为 Author/Run Source 时才可继续使用 MCP 批处理，且必须标为 legacy，不能与同一镜头的原生 Build 混用。

RunningHub 内置 `minimax-h3-reference-to-video` 接受本地图片 0–9、视频 0–2、音频 0–2，原生 Runtime 分辨率固定为 `768P|2K`；适配器自动上传并注入专用 workflow，无需 `node_info_list`。Comfly `minimax-h3` 固定使用 Ref2VA，接受 1–3 张公开 HTTPS 参考图片或 1 段公开视频，二者互斥且不支持参考音频。两者都必须使用 H3 提示词合同。

## StarRouter 模型与枚举

- 原生 StarRouter Endpoint：`dreamina-seedance-2-0-fast-260128`、`dreamina-seedance-2-0-260128` 和 `MiniMax-H3`，分别由 `@hypit/seedance`、`@hypit/minimax-h3` 的精确 Capability 选择。
- 2.0 正式制作固定 `prompt_profile=seedance2`、`input_mode=full-reference`；`duration ∈ {4,5,6,7,8,9,10,11,12,13,14,15}`；`resolution ∈ {480p,720p,1080p}`；`ratio ∈ {16:9,9:16,1:1,4:3,3:4}`；`fps=24`；`generate_audio ∈ {true,false}`；`watermark ∈ {true,false}`。
- 多模态全参考图片最多 9、视频最多 3、音频最多 3、总数最多 12；每段视频和音频都写入实测 `duration-seconds`，Prompt 按真实顺序包含 `@图片N`、`@视频N`、`@音频N`。
- MiniMax 正式制作使用 `@hypit/minimax-h3` 的 `ReferenceVideo` Surface；原生 StarRouter 路由当前只声明 `MiniMax-H3`，未声明的 H3 Max 或 Seedance 1.x 不能靠字符串模型名绕过 Capability 边界。
