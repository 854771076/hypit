# 仓库代理指令

## 本地安装与重装

- 用户要求安装、重装或更新当前仓库、分支或版本时，必须在仓库根目录运行 `npm run install:local`。
- 不得使用 `npm install --global @hypit/hypit`；按包名安装会解析 registry 中的官方发行版，而不是当前检出的源码。
- `install:local` 会重新生成本地发行 tarball，按绝对路径全局安装，并验证最终版本、Distribution 目录和启动器。
- 该约束只保证 Hypit 主包来自当前仓库；本地缓存缺少依赖时，npm 仍可从当前配置的 registry 下载依赖。
