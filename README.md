# dsh-repo-health · 项目体检

检查仓库的常见最佳实践（README / LICENSE / .gitignore / 测试 / CI / 锁文件 / 脚本 / .env.example），返回体检报告卡与修复建议。纯 Node 实现，无网络、无外部服务。

## 提供的工具

| 工具 | 作用 |
|---|---|
| `health_check` | 逐项检查并返回 ✓/✗ + 修复建议 + 总分 |

## 安装

```bash
dsh plugin add dsh-repo-health
```

安装后在 profile 的 `package.json` 的 `dsh.profile.bundles` 中加入 `"dsh-repo-health"`。

## 用法示例

```
给这个仓库做个体检
→ 调用 health_check(root="/workspace")
```

## 检查项

README、LICENSE、.gitignore、测试、CI 工作流、依赖锁文件、npm scripts、.env.example（8 项）。

## 安装

```bash
dsh plugin add github:uckkk/dsh-repo-health
```

> 安装即在本机运行第三方代码，请自行审阅源码。

## 安装

```bash
dsh plugin add github:uckkk/dsh-repo-health
```

## 使用

安装后在会话中调用该插件注册的工具即可。
