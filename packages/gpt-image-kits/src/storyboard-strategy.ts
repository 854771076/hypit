export type StoryboardBoardType =
  | "single-frame"
  | "temporal"
  | "narrative"
  | "shot-board"
  | "blocking"
  | "action"
  | "choreography"
  | "comprehensive"
  | "director-track"
  | "previz-3d"
  | "scene-overview"
  | "scene-plan"
  | "scene-turnaround";

export interface StoryboardStrategyInput {
  /** 剧情、镜头或任务描述；选择器只读取文本，不会改写原始内容。 */
  brief: string;
  /** 已确认的显式类型优先于自动判断，适合人工复核后的重跑。 */
  boardType?: StoryboardBoardType;
  /** 是否需要把结果交给视频模型，而不只是做导演/美术沟通。 */
  forVideo?: boolean;
  /** 是否存在无法仅靠静态板证明的空间或运动风险。 */
  spatialRisk?: boolean;
}

export interface StoryboardStrategy {
  boardType: StoryboardBoardType;
  /** 视频生产通常仍需要技术覆盖板；单帧和场景资产不自动追加。3D 白模也不能替代它。 */
  companionBoardType: "shot-board" | null;
  needsPreviz3d: boolean;
  reason: string;
  matchedSignals: string[];
}

type Rule = {
  type: StoryboardBoardType;
  signals: readonly string[];
  reason: string;
};

const RULES: readonly Rule[] = [
  { type: "scene-plan", signals: ["平面图", "俯视", "户型", "房间布局", "floor plan", "top-down"], reason: "任务要求锁定场景的平面边界、房间和机位关系。" },
  { type: "scene-overview", signals: ["鸟瞰", "全景地图", "场景概览", "坊市", "街区布局", "aerial overview"], reason: "任务要求先建立整个环境的区域、路径和地标。" },
  { type: "scene-turnaround", signals: ["三视图", "多视角场景", "场景固定", "同一场景不同角度", "turnaround"], reason: "任务要求复用同一场景并保持物件位置与尺度一致。" },
  { type: "previz-3d", signals: ["3d白模", "3d预演", "白模", "灰模", "预演", "previz", "复杂路线", "连续运镜"], reason: "任务包含静态分镜难以证明的空间路线或连续运动风险。" },
  { type: "choreography", signals: ["舞蹈", "编舞", "动作分解", "街舞", "武术套路", "体操", "dance", "choreography"], reason: "任务需要逐步教学身体姿态、重心和动作过渡。" },
  { type: "action", signals: ["格斗", "搏斗", "追逐", "打斗", "枪战", "爆炸", "冲击", "飞踢", "fight", "chase", "stunt"], reason: "任务需要表达攻击、接触、受击、反应和结果的因果链。" },
  { type: "blocking", signals: ["走位", "调度", "取材到灶台", "冰箱", "灶台", "餐桌", "交接", "穿过人群", "进场", "出场", "blocking", "route"], reason: "任务的主要不确定性是人物路线、交接和空间站位。" },
  { type: "narrative", signals: ["发现", "意识到", "误会", "揭示", "反转", "情绪转折", "短暂对视", "因果", "reveal", "emotional turn"], reason: "任务需要让观众读懂信息揭示、因果或情绪变化，而非先解决机位覆盖。" },
  { type: "director-track", signals: ["导演轨道", "节奏轨道", "张力曲线", "团队交付", "director track", "rhythm track"], reason: "任务明确需要导演审阅、连续性规则和节奏轨道交付。" },
  { type: "comprehensive", signals: ["全维度", "主镜头", "英雄镜头", "完整制作包", "hero sequence", "single source of truth"], reason: "任务需要将故事、镜头、调度、动作、声音和连续性合并审阅。" },
];

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function findRule(brief: string): { rule: Rule; matchedSignals: string[] } | null {
  const text = normalize(brief);
  for (const rule of RULES) {
    const matchedSignals = rule.signals.filter((signal) => text.includes(normalize(signal)));
    if (matchedSignals.length > 0) return { rule, matchedSignals };
  }
  return null;
}

export function selectStoryboardStrategy(input: StoryboardStrategyInput): StoryboardStrategy {
  const explicit = input.boardType;
  const selected = explicit ? null : findRule(input.brief);
  const boardType = explicit ?? selected?.rule.type ?? (input.forVideo ? "temporal" : "single-frame");
  const matchedSignals = selected?.matchedSignals ?? (explicit ? ["explicit boardType"] : []);
  const reason = explicit
    ? "沿用调用方显式确认的故事版类型。"
    : selected?.rule.reason ?? (input.forVideo ? "未命中特殊场景，视频生产默认先锁定单镜头动作时序。" : "未命中特殊场景，默认只生成一个关键帧，避免无必要地制作多格故事版。");
  const needsPreviz3d = input.spatialRisk === true || boardType === "previz-3d";
  const companionBoardType = input.forVideo && !["single-frame", "scene-overview", "scene-plan", "scene-turnaround"].includes(boardType)
    ? "shot-board"
    : null;

  return {
    boardType,
    companionBoardType,
    needsPreviz3d,
    reason,
    matchedSignals,
  };
}
