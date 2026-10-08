# 生成深度视频

进入媒体阶段后、编写视频提示词前执行。读取当前 selected 且已批准的 `production-plan`，默认调用生成 MCP `submit_episode_depth_videos`：先以 `confirmed=false` 一次展示全剧逐镜来源、输出目标和请求数，用户确认后再以 `confirmed=true` 批量提交。单镜 `submit_depth_video` 只用于明确的局部重试。两个入口都只接受计划中绑定的 selected 本地视频来源，并固定提交 RunningHub 工作流 `2098674379113979905`，输出目标固定为 `shot-epNNN-depth-NNN`。每镜必须先准备一条独立、完整、已按镜头边界裁切的源视频版本；不得跨镜复用同一源版本、手填其他工作流、覆盖来源资产、复用另一镜的深度结果或把人物图当作时间参考。

整集入口返回来源版本、输出目标、Provider、工作流和请求数，不计算具体价格；任一镜预检失败时确认调用不会提交任何镜头。任务完成后用 `await_episode_tasks` 批量回收，或用 `get_generation_task` 回收单个任务并登记候选；提交结果、远程 URL 和任务 ID 都不是可用资产版本。

每个候选必须完整观看首、中、尾，并通过 `review-ledger.mjs put` 写入专项审核。`criteria` 按以下原顺序逐项记录实际观察：`深度层级与边界可读`、`动作、空间与运镜对应来源`、`时长、帧率与画幅覆盖完整`、`无字幕、水印或纹理污染`；`audio`、`transition`、`captions` 均为 `not-applicable`，同时绑定候选 SHA-256 和观看时长。只有批准的候选会成为 selected。

任何镜头缺少来源、任务证据、固定工作流 provenance、完整观看或专项审核时保持阻塞。深度视频只负责空间结构、动作与运镜；人物身份与外观继续由人物参考图和设定板负责。所有镜头深度选版完成后，才执行 `write-drama-video-prompts`。
