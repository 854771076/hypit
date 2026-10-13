---
name: skill-creator
version: 1.0.0
description: 创建、修订、评估和打包本仓库的 Agent Skill；当用户要新增 Skill、优化触发条件、补充评测或检查 Skill 重叠时使用。
compatibility: 建议具备 Python 3；评测脚本不可用时执行静态检查并明确标注。
argument-hint: "[Skill 名称或待处理问题]"
---

# Skill Creator

用于把稳定、可复用的工作流整理成最小可执行 Skill。

## 工作流程

1. 先阅读仓库根目录 `AGENTS.md`，再检查相邻 Skill 的名称、描述和目录结构。
2. 明确 Skill 的触发场景、非触发场景、输入、输出和验收条件。
3. 新建或修改前说明目标路径和变更范围；保持 `SKILL.md` 聚焦，长文档放入 `references/`。
4. 使用 YAML frontmatter，至少包含 `name`、`version`、`description`；版本遵循 SemVer，从 `1.0.0` 起步。
5. 为关键触发边界补充正向与反向示例；可用时运行 Skill 自检或项目测试。
6. 打包前确认只包含 Skill 源文件和必要资源，不包含缓存、凭证或本地运行产物。

## 质量边界

- 不复制相邻 Skill 的职责；描述中写清楚交接边界。
- 不把一次性业务答案写成 Skill；只有可重复的判断和执行流程才进入 Skill。
- 不伪造评测结果。测试不可用时报告 `dry_run`，并列出未覆盖风险。
- 注释和说明使用中文，优先解释约束、前置条件和失败处理原因。
