# 规划短剧制作

`viral-recreation` 项目必须读取 `.short-drama/recreation-compiled/<episode>/<version>.json` 中当前 selected 版本，用其中的 Media、Caption、Speech、Film 层约束镜头时长、素材策略、音频策略和画幅，并在 `source_versions.recreation_workflow` 写入当前 selected 版本；不得把参考视频当作可直接投喂的正式资产。

运动参考按项目来源和镜头风险决定：`viral-recreation` 从参考原片逐镜裁切并生成深度视频；`standard` 无参考视频时不得制造伪源视频或深度视频，默认直接使用双分镜板，仅在复杂路线、多人交互、精确接触、轴线风险或连续运镜无法由静态板证明时追加 Blender 白模并以 `motion-reference` 进入正式视频。深度与白模不得混用。

读取本地已选导演本、人物/场景/道具、分镜和项目配置。由 Codex 使用 `../../assets/modules/plan-drama-production/prompts/production_plan.{zh,en}.txt` 输出 `production-plan.json`，逐镜记录：输入版本、`storyboard_strategy`、分镜图类型与实际格数、`previz_strategy`、视频方式、声音方式、Provider、模型或工作流、`prompt_profile`、`input_mode`、分辨率、画幅、时长、候选数、参考素材及其用途与顺序、依赖关系、预计付费次数、失败回退和验收项。

`storyboard_strategy.mode` 不决定是否生成图片板：每镜 `image_strategy` 固定为 `{mode:"generate",board_type:"shot-board",panel_grid_size:2..16,overflow_strategy}`，同一模块按该格数独立生成时间故事版和镜头分镜板，默认 6 格，Codex 可按实际节拍调整。`standard` 与 `viral-recreation` 都默认 `image`，只在复杂调度需追加空间预演时使用 `blender`。Blender 镜头仍必须生成双板，并令 `previz_strategy.mode=blender`。

时间故事版按连续动作阶段、运镜轨迹和精确状态变化组织；镜头分镜板按景别、人物关系、调度、轴线与叙事节拍组织。两张板使用相同格数但职责不同，必须生成独立资产和版本。视频引用顺序固定包含两张板；其余人物、场景、道具超过 Provider 剩余图片槽位时按既有 `overflow_strategy` 处理。

standard 无参考视频项目默认写 `{mode:"none"}`；只有静态双板无法证明复杂调度风险时，白模才固定写 `{mode:"blender",purpose:"motion-reference",fps:12}`。媒体阶段先执行 `direct-blender-previz`，再执行 `generate-blender-previz`；当前只有 RunningHub `minimax-h3-reference-to-video` 可进入该完整合同。viral-recreation 可按复杂调度追加 `{mode:"blender",purpose:"review",fps:12}`。白模不承担双板、人物身份、服装、材质或最终画质参考。

格数必须按本分镜构图合同复核（`visual_plan.composition`、`composition_contract` 或 `photographyPlan.composition` 的 primary/secondary code、evidence 与 ai_risks；权威解释见 [导演构图模式参考](../../../../references/director-composition.md)）：静态单一情绪仍至少用 2 格固定起止状态；追逐、接触、倒计时和运镜按不可合并阶段增加格数；多人站位、包围、遮挡、武器或多手交互按叙事节拍增加格数。风险只决定格数与回退，不得用增加格数替代证据。证据不足时 `status=blocked` 并写入 `unresolved`，退回分镜修订。

每镜 `review_checks` 必须从合同 ai_risks 与证据元素反推具体、可观察、具名的验收项，不得复制同一组空泛检查：镜面/光滑水面核对映像与真人及现场陈设一致、无多指或多余摄像机；雨、雾、霓虹、烟尘核对天气光色有据、方向统一且不淹没接触点与人物身份；群体镜核对人数、身份和服色锚点、无多余路人；武器与多手交互核对形制、持有关系、手数和接触前/中/后；窄门缝或前景遮挡核对可见宽度、双眼完整和关键动作不被盖；高速拖影核对双眼、面部与接触点清晰可辨；前后夹击/包围核对前后景两方身份、距离和朝向可辨；竖屏镜头核对脸、关键道具和接触点位于中上安全区、底部字幕安全区不被占、动势边缘留余量。这些构图风险项与对白嘴部、道具三态、行走打斗物理、画内屏幕等既有风险项按命中取舍组合，视频验收会按此原顺序逐项核对。

文本策划全部由 Codex 完成，不调用外部文本模型。Provider、模型/工作流、尺寸、时长、候选数、参考文件、声音方式、素材数量和批量请求范围必须逐项展示，不计算具体价格；只有用户确认后才把 `approved: true` 写入计划。

Provider 支持 MiniMax H3 原生音频（`video.native-audio`）时，默认使用 `audio_strategy.mode=native`，并锁定逐秒对白表、全片音乐锚点和相邻镜头成对声音转场；此时不安排独立 TTS。仅当用户明确要求后配、或 Provider/模型明确声明不支持原生音频时，才写 `post-dub`/`independent` 并进入 `design-drama-audio`；能力信息缺失不得作为转后配的理由。

使用 `project-store.mjs put-episode-document <项目目录> production-plan <episode-key> <version> <文件>` 保存不可变版本。选定后，所有镜头执行 `generate-storyboard-images`，分别完成时间故事版和镜头分镜板的八维审计；启用白模的镜头再执行 `direct-blender-previz`、`generate-blender-previz` 并完成导演评分。逐镜门禁全部通过后才能调用 `generate-drama-videos`。计划不得包含 API Key、Token 或远程业务对象 ID。

只有双板加独立参考图实际超过 Provider 槽位才使用 `compose-assets`，未超槽位保留独立参考图。项目 `automation_mode=true` 且仅缺 Provider 已支持的分辨率时，agent 直接选择并落档，不等待用户。
