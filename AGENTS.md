# 仓库代理指令

## 修改前置条件

- 修改代码、脚本、Skill 或项目文档前，必须先完整阅读本文件；它是仓库级约束，不可用摘要替代。
- 优先复用现有脚本、测试、Skill 和参考文档；若已有能力满足需求，不重复实现。
- 短剧插件的自检必须在插件根目录执行，仓库根目录统一使用 `npm run check:short-drama`，避免相对路径指向错误。

## 版本与提交

- Skill 的 frontmatter 必须包含 SemVer `version`，新 Skill 从 `1.0.0` 起步。
- 提交前运行与改动相关的最小验证；修改短剧插件后运行完整短剧自检。

## 本地安装与重装

- 用户要求安装、重装或更新当前仓库、分支或版本时，必须在仓库根目录运行 `npm run install:local`。
- 不得使用 `npm install --global @hypit/hypit`；按包名安装会解析 registry 中的官方发行版，而不是当前检出的源码。
- `install:local` 会重新生成本地发行 tarball，按绝对路径全局安装，并验证最终版本、Distribution 目录和启动器。
- 该约束只保证 Hypit 主包来自当前仓库；本地缓存缺少依赖时，npm 仍可从当前配置的 registry 下载依赖。
