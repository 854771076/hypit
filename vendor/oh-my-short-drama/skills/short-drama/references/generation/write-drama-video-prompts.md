# 编写视频提示词

`viral-recreation` 项目必须读取当前分集编译约束包，把 Media 触发器、Caption、Speech 和 Film 约束落实到逐镜提示词，并在顶层 `source_versions.recreation_workflow` 绑定当前 selected 版本。

先读取已批准制作计划和 Provider 实时能力，按“节点/镜头显式覆盖 → 制作计划 `prompt_profile` → 模型识别”确定唯一编译路径：

- Seedance 2.0/2.0 Fast 使用 `seedance2_video`。
- StarRouter `MiniMax-H3` 或 RunningHub `minimax-h3-reference-to-video` 使用 `h3_video`；H3-Max 与 Comfly 无法承载完整参考包，不得进入正式制作计划。
- 其他已确认模型才按参考图类型使用 `panel_grid_video` 或 `panel_storyboard_video`；无法确认提示词协议时停止，不把通用模板冒充模型专属模板。

所有模板都填充 `base_prompt`、`storyboard_context_json`、`grid_layout`、`panel_grid_size`、`camera_move`、`shot_type`、`style`、`duration_constraints` 和 `reference_manifest_json`。`style` 必须是项目当前完整 `creative.art_style` 对象，由 `render-prompt.mjs` 编译为包含 medium、rendering_method、surface_language、image_formation 与 forbidden_substitutions 的 renderingContract；禁止只传画风名、一行 prompt 或从参考图猜媒介。引用清单只包含已选本地资产、版本、用途及提交顺序，不包含密钥或临时 URL。Seedance 的每个图片/视频引用还必须按素材实际内容声明 `person_reference: true|false`；音频不得声明，Runtime 不按用途猜测。

每个 `char-*` 引用必须带 `identity_binding:{profile_name,profile_sha256,appearance_id}` 和 `identity_constraints:{age_class,grooming_and_makeup,costume_signature,memory_anchors}`。提交前执行 `assertCharacterReadyForVisuals` 并精确核对人物档案 SHA、规范名、appearance 与全部可见约束，不得从 asset key 猜人物。模板只把妆发、服装标识和记忆锚点编译进可见描述，不暴露绑定元数据；连续性 `visual_identity` 有冲突或换装缺少剧情证据时写入 errors。

先确定是否需要运动参考：`viral-recreation` 读取 `video_strategy.depth_reference` 并绑定 `video/depth_reference`；`standard` 仅当制作计划启用白模时绑定当前 selected Blender 白模为 `video/reference_video`，否则只使用人物、双分镜板、音频与提示词。深度与白模不能并存，不能把白模转成深度，也不能在无原片时伪造深度来源。

每镜引用清单还必须含至少一个 `image/character_identity` 人物参考，以及各一个独立的 `image/temporal_storyboard` 故事版、`image/shot_board` 分镜板和 `audio/audio_reference` 音频参考；音频参考必须是当前镜头时间范围对应的已选片段，不得用整集音轨或其他镜头音频代替。两类分镜不得指向同一版本。人物、场景、道具设定板按风险以 `image/asset_board` 追加。任一必选项缺失都不得批准提示词或提交视频。

每镜先把当前 selected 的时间故事版和镜头分镜板分别加入引用清单。standard 仅在制作计划启用白模时把 selected 白模以 `type=video, role=reference_video` 加入；viral-recreation 的 review 白模只作审计证据，不与深度主参考混用。当前仅 RunningHub `minimax-h3-reference-to-video` 支持直接绑定本地白模。正式视频始终绑定所需人物、场景和道具选版，且这些选版必须通过当前画风哈希门禁；画风变更后不得用旧媒介资产继续生成。其他图片超过 Provider 槽位时按既有 `overflow_strategy` 合板或阻塞。

每次模板编译统一输出严格 JSON `{prompt_profile,input_mode,prompt,duration,references,continuity,audio_policy,errors}`。Seedance 2.0 固定 `full-reference`，`prompt` 必须为中文自然语言，并让 `@图片N/@视频N/@音频N` 与引用清单及提交数组一一对应；总素材不超过 12 个，图片≤9、视频≤3且合计2–15秒、音频≤3且合计≤15秒，时长4–15秒。H3 固定 `Ref2VA`，英文六段必须严格按 `subject_definitions → summary → retention_analysis → detailed_description → overall_soundscape → non_diegetic_music` 排列，仅对白、歌词和画内文字保留原语言。不得混用两套语法。

`continuity.mode=previous-tail` 时仍使用 `full-reference`/`Ref2VA`，由 `prepare_previous_tail` 生成的 `other-transition-*` 作为第一个 `image/first_frame` 语义连续性锚点，其余人物、深度、双分镜板和音频参考不得省略。编译前核对其来源版本与 SHA-256 仍对应上一镜当前 selected 视频；来源镜换版后必须重新派生尾帧。

保存前把逐镜编译结果包装为顶层严格合同 `{episode_key,source_versions,shots,unresolved,approved}`；每个 `shots` 项在上述八个模板字段外，必须从已选制作计划原样补入 `shot_number`、`production_plan_version`、`storyboard_version`、`provider` 和 `model_or_workflow`。任一镜 `errors` 非空时同步写入 `unresolved` 且 `approved=false`，禁止省略 `errors`、伪造空数组或手写占位文档。

提示词必须覆盖完整时长、人物动作、相机曲线、逐字台词/旁白、声音策略和镜尾转场，并原样保留连续性与声音合同。每个引用必须定义用途；没有参考素材时不得伪造标签。声音时间表放不下台词时回到剧本/分镜调整，不加速硬塞。

声音编译前按已批准 audio-plan 的 `audio_strategy` 选择 Provider：默认使用原生音频；未锁定时，在满足全部画面参考能力的候选中优先 `video.native-audio`；只有用户明确要求后配或锁定的 Provider 明确不支持时才记录 `provider-no-native-audio`，不得静默转 TTS。逐镜 `audio_policy` 原样复制匹配本镜的三层声音行及时间范围，并把同一镜头的 `audio/audio_reference` 放入实际 Provider 输入。native 行生成逐字对白或旁白，旁白必须编译 tone arc、每个 emotion beat、pace、breath and pause、distance and space；post_dub/external_audio 行只生成环境声和动作声。所有原生声音提示词明确 no undeclared BGM；BGM 始终走独立授权配乐流程。正式提交原生音频镜头必须显式 `generate_audio=true`，非原生镜头不得开启。

视频提示词只决定声音生成意图，不把 `post_dub` 或 `external_audio` 偷换成模型直出对白，也不在提示词阶段假定后续一定能对口型。需要口型时保留可见说话者、无歧义脸部归属和精确台词范围，生成后再由声音与媒体变换流程依据实际 selected 音频决定是否调用 `transform.lip-sync`；旁白、画外音和合格原生对白不预留虚假的对口型任务。

分镜构图合同（`visual_plan.composition`、`composition_contract` 或 `photographyPlan.composition`）只作为编译输入：按 [导演构图模式参考](../../../../references/director-composition.md) 中该模式的画面结构与竖屏提示，把 primary/secondary code 翻译为主体位置、视线留白、前中后景、光源方向与剧内来源、遮挡比例、动作屏幕方向、镜尾状态等可见几何和逐时间点动作；仅在拿不准 code 含义、证据要求或 ai_risks 时按需查阅该参考。禁止把构图 code、模式名称或模式目录抄进任何模型提示词，也不得只复读名称而不给可见执行项。

人物离画后，把离画边、最后姿态、运动方向和持物状态作为画外连续性继续传递，直到其重新入画或场景明确重置。重新入画不得仅凭当前画面任意选边，必须与该记录、当前轴线和空间入口相容。

编译前逐项对照起始参考与本镜所需人物、道具和空间结构。关键元素若应从首帧就在场却缺失，必须退回对应图片/白模分镜补齐或改用能绑定该资产的参考模式；只有剧本明确要求从画外进入时，才可写明首帧缺席、进入方向和出现路径。除有意空镜或 hold 外，首帧应已有可读主体或动作起势，不消耗成片时长等待主体到场。多人镜锁定准确人数、画面左右顺序、朝向和每只参与动作的手部归属；复杂交互无法清楚归属时拆镜。

画内手机、电视、电脑或招牌的内容必须来自 source_text 或已批准图形合同；没有内容证据时让屏幕关闭、空白或不可辨读，不允许模型自行填充随机文字和 UI。剧情依赖的精确消息、倒计时、地点或界面交给 Remotion 图形层实现，视频素材只保留可跟踪的屏幕平面、遮挡和光照。

提示词编译不能修饰一个不合格分镜；若一个 panel 仍含多个独立动作，先退回 `build-drama-storyboard` 拆镜。H3 Ref2VA 的参考清单中 `role` 是供应商协议角色，素材的中文用途另存为 `purpose`（或保留在同一用途字段的审计文本），两者不能混淆；提交数组顺序、清单顺序和正文 `<Picture N>` 必须完全一致。所有动作必须用可观察的时间点和完成状态描述，禁止只写“镜头表现/随后发生”这类不可验收句。

动作结果必须在镜尾前成为清晰可见且短暂稳定的状态；若剪辑必须提前切走，下一镜从该结果已经成立的状态开始。步行镜仅在剧情需要时细化落脚、重心转移和地面接触；同行者还要锁定并排/前后关系与共同速度。跨镜动作或打斗优先让前镜尾帧成为后镜首帧，并在运动中切接，避免每段回到静止预备姿势。

自然感必须落实为逐主体时间合同，不能只追加“自然、真实、电影感”。每个可见人物写一个当前主要动作、注意对象、反应触发和未参与状态；除剧情明确要求同步外，多人用不同起始时刻、动作幅度、视线和反应延迟错开，禁止集体同时转头、点头、眨眼、起步或重复同一手势。景别可读时，静止人物保留少量不规则且不同步的眨眼、眼动/重新对焦、呼吸、轻微重心调整和连续表情过渡，画外音期间闭嘴但不冻结。身体运动写支撑脚、重心、髋肩、关节路径、加减速、惯性跟随和恢复；头发、衣摆、宽松袖口、饰物与道具只由已存在的风、加速、重力或接触驱动，以略滞后的小幅运动跟随并衰减停稳。环境只响应有证据的力，不为增加动态虚构天气、特效或事件。每镜只保留一个叙事主动作和少量因果次级运动；指令过载或多人交互归属不清时先拆镜。

人物参考除 `identity_constraints` 外必须携带与当前人物档案 SHA 绑定的 `performance_constraints`，完整包含 `center_of_gravity`、`gait`、`habitual_actions`、`eyeline_behavior`、`blink_rhythm`、`stress_response` 与 `forbidden_performance`；保存值与档案不一致时提交门禁拒绝。心理戏不能直接写“悲伤、震惊、腹黑、内心复杂”，应沿时间写成刺激或信息、注意/眼神转移、试图维持的表情面具、短暂泄露、决定/动作和镜尾残留。眼神具名注视对象、画面方向、持续/扫视/回避/返回及眼睛与头部启动顺序，听者有独立注意和反应。微表情只在近景/特写可读时使用，一次优先一至两个面部区域的低幅起势—峰值—释放；FACS/AU 只用于理解可见肌肉变化，不作为模型提示词编码。中远景改用头部、呼吸、姿态、停顿、人物距离与走位。长期习惯仅在其档案触发条件成立时出现，禁止跨镜机械复现。

复杂打斗先核对所选 Provider 与运动/视频参考是否支持精确招式。缺少可验证支持时，不用招式名称代替编排；拆成地理建立、蓄力、双方身体位置、接触点、受力结果和反应镜头。只有参考素材能约束运动轨迹时才保留精确招式，并继续核对轴线、肢体归属和结果连续性。

同一角色跨当前/未来时空的对白必须共享音色身份合同。若视频模型不能保证跨镜声纹一致，提示词仍保留说话人身份，但制作计划必须标记 `post-dub` 或可审计的后期电话处理，不能让每镜原生音频各自随机生成后再假定为同一角色。

不得把故事板的铅笔、炭笔、单色、纸张质感、分格、箭头、编号、水印或 UI 生成进成片；故事板只传递构图、轴线和动作顺序，提示词必须重申项目成片媒介。每个无错镜头的 `prompt` 必须原样包含模板规定的固定反宫格声明和固定禁生成文字声明（中文模板用中文句、H3 用英文句，按模板要求放置）；禁止模型在源视频中生成字幕、标题、标签、Logo、水印、UI 文字或其他可读文字，获批文字统一交给后期图形层。`project-store.mjs` 会逐镜校验，缺失即校验失败，不得改写或用近义句替代。多格分镜板（`panel_grid_size > 1`）整张作为语义参考引用时，prompt 还必须原样包含模板中的分镜板时间顺序条款（画格只表示动作时间顺序，禁止画格边框/分割线/编号/多格并排），MCP 提交前逐镜校验；多格板只能配 `full-reference`/`Ref2VA`/`reference_image`，禁止配首帧/尾帧像素模式。用 `project-store.mjs put-episode-document <项目目录> video-prompts <episode-key> <version> <JSON>` 保存不可变版本，再显式选定；每镜记录制作计划版本、分镜版本、模型、提示词协议、引用资产版本和最终 prompt。修改任一上游版本必须生成新版本，不覆盖旧提示词。
