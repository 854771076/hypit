# 生成分镜图片

处理制作计划中的全部镜头，包括另有 Blender 白模的镜头。先读取每镜 `storyboard_strategy.primary_board_type`、`required_board_types` 和 `selection_basis`，只生成合同声明的板型；`selection_basis` 缺失、主类型不在 `required_board_types` 或证据不足时退回 production-plan，不得直接出图。视频镜头至少生成两张独立参考板：`board-epNNN-temporal-NNN` 使用 `panel_grid_image`，按时间顺序固定动作阶段与精确状态；`board-epNNN-shot-NNN` 使用 `panel_storyboard_image`，按叙事节拍固定景别、调度、轴线和构图。若 `required_board_types` 额外包含 `narrative`、`blocking`、`action`、`choreography`、`comprehensive` 或 `director-track`，使用 `@hypit/gpt-image-kits/storyboard` 的对应 `board-type` 生成独立主类型资产，并以 `board-epNNN-{type}-NNN` 登记；`previz-3d` 仍由 Blender 模块生成。两张必需视频板和所有额外板均使用 `image_strategy.panel_grid_size`，默认 6 格，Codex 可按不可合并的动作或叙事节拍选择 2–16 格；不得用同一图片或同一资产版本冒充不同板型。Blender 是额外的空间和运动预演，不替代双板。

严格填充 [提示词索引](../../../../references/prompt-skill-index.md) 的变量；`style` 必须传项目当前完整 `creative.art_style` 对象，交给 `render-prompt.mjs` 编译 renderingContract，不得只传画风名或一句风格短语。多格图根据计划中的 `panel_grid_size` 选择可读布局并同时提供 `grid_layout`，不得减少、留空、重复格子或把相邻镜头剧情画进当前镜头。宫格切单格后只允许用 `panel_grid_enhance` 保真高清化，不得重构图。

分镜构图合同的 code 必须先编译成可见几何再出图：图片提示词只写主体位置、视线留白、前中后景、光源方向与剧内来源、遮挡、动作方向与镜尾状态，不罗列构图 code 或模式目录；拿不准 code 的画面结构、证据门槛或 ai_risks 防控时按需查阅 [导演构图模式参考](../../../../references/director-composition.md)。evidence 需要 set_dressing/weather_atmosphere/action_blocking（含 `+` 复合证据，逐组件成立）时，set_dressing/weather_atmosphere 元素必须有原文或已选资产支撑，action_blocking 还可由已确认调度事实支撑，但调度事实不能替代天气/陈设证据；均无据的元素是阻塞性冲突：不调用出图，按模板把缺失证据写入 unresolved 并退回分镜，不得让模型自补雨、雪、雾、霓虹、镜面、烟尘、门窗廊柱、武器或多余人物。

整集所有门禁已通过的镜头必须把两张板作为两个独立 `generate_image` 目标全量提交；RunningHub 同一 API Key 最多 2 路并发，其余请求由适配器排队。两者都传 `{kind:"storyboard",episode_key,version_id,shot_number}`，但必须分别使用上述目标 key 和对应模板，实际 prompt 等于本阶段已留痕的 Provider 提示词输出。本地参考图统一放入 `reference_paths`；`reference_manifest` 与路径等长且逐项包含 `{type:"image",order,asset_key,version_id,role}`。参考资产的画风审核哈希必须与当前 renderingContract 一致；旧画风资产先失效重做，不让新提示词与旧媒介参考互相拉扯。提交前只展示模型、数量、尺寸、参考用途与制作计划，不计算具体价格。两张板分别完成八维审核并选版后，才进入视频提示词与生成。

使用 StarRouter 时明确从以下枚举取值：`model=gpt-image-2`；`resolution ∈ {1K,2K,4K}`；`aspect_ratio ∈ {1:1,16:9,9:16,4:3,3:4}`；`quality ∈ {auto,low,medium,high}`；`background ∈ {auto,opaque,transparent}`；`moderation ∈ {auto,low}`；`output_format ∈ {png,jpeg,webp}`；`n=1..4`。
