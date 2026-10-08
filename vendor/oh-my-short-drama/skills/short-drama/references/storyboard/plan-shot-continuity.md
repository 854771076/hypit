# 规划跨镜连续性

读取当前 selected 且已批准的 `storyboard`、`director-book` 和 `production-plan`，并使用 `../../assets/modules/plan-shot-continuity/prompts/continuity_plan.{zh,en}.txt` 生成一份 `continuity-plan`。只采用这些结构化文档和已选资产中的证据；不得引用尚未生成的双分镜板或白模，也不得推断未声明的道具、持物关系、入画边、出画边或精确米制坐标。

规划阶段固定使用 `coordinate_mode=semantic`，以画面左/中/右、前/中/后景、朝向、视线对象和出入画边表达语义位置；不得从结构化分镜、图片透视或经验估算三维坐标。后续 Blender 白模只能验证或暴露冲突，不能静默改写已批准连续性计划；冲突必须回退规划阶段生成新版本。

逐镜记录 `camera_setup_id`、`start_state`、`end_state`、人物位置/姿态/运动方向/持物、道具状态、轴线、机位侧和主光锚点。对每组相邻镜调用 `continuity-plan.mjs` 导出的 `recommendTailLink(previous,current)`：仅同场景、同机位、同轴线且状态无未解释跳变时，才可启用 `previous-tail`；第一镜、切换机位、越轴、场景变化或有意状态跳变使用 `independent`。合法 previous-tail 必须绑定上一镜号、上一镜 `camera_setup_id` 和 `video.first-frame` 能力。

任何无法由证据解释的差异都写入 `unresolved`，并令 `approved=false`；不得把猜测写进 `allowed_changes` 以绕过校验。`allowed_changes` 只记录剧本、导演本或已批准调度明确要求的变化，`evidence` 指向相应来源。

用 `node "${CODEX_PLUGIN_ROOT:-${CLAUDE_PLUGIN_ROOT:-.}}/scripts/project-store.mjs" put-episode-document <项目目录> continuity-plan <episode-key> <version> <文件>` 保存不可变版本。只有 `unresolved=[]` 且逐镜校验通过后才能写 `approved=true`，随后必须用同一脚本的 `select-episode-document` 显式选定；未选定的连续性计划不能进入视频提示词编译。

计划确定使用上一镜尾帧时，媒体阶段调用 `prepare_previous_tail`。上一镜视频换版后必须重新派生尾帧，不能继续使用旧文件或旧 SHA-256。

`storyboard.shot_group` 是导演叙事分组，必须完整、连续且保持同组 type/pattern 一致；它可以包含反打、蒙太奇或其他切机位镜头，因此不能直接等同于尾帧链。执行阶段把每段连续的 `previous-tail` 链派生为一个生成镜头组：不同生成组可以并行，同组只开放一个前沿镜头。前镜候选未审核时状态为 `waiting-review`；前镜已审核选版但首帧尚未派生时为 `waiting-tail`；只有尾帧版本、来源版本和 SHA-256 全部匹配后，下一镜才可进入 `ready`。
