// dsh-repo-health — 项目体检（DeepSeek Harness）。
// 检查仓库常见最佳实践（README/LICENSE/.gitignore/测试/CI/锁文件/脚本/环境变量模板），
// 返回体检报告卡与修复建议。纯 Node，无网络、无外部服务。
import { defineTool } from "@deepseek-ai/dsh-tools";
import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";

const name = "项目体检";
const inject = ["tools"];

async function exists(p) {
  try { await stat(p); return true; } catch { return false; }
}

async function hasTests(root) {
  const testDirs = ["test", "tests", "__tests__", "spec"];
  for (const d of testDirs) {
    if (await exists(join(root, d))) return true;
  }
  // 找 *.test.* / *.spec.* 文件（浅层）
  const stack = [root];
  let depth = 0;
  while (stack.length && depth < 3) {
    const cur = stack.pop();
    let entries;
    try { entries = await readdir(cur, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      if (e.name === "node_modules" || e.name === ".git") continue;
      if (/\.(test|spec)\.(js|ts|jsx|tsx|py|go|rb|rs)$/.test(e.name)) return true;
      if (e.isDirectory() && depth < 2) stack.push(join(cur, e.name));
    }
    depth++;
  }
  return false;
}

async function apply(ctx, _config) {
  ctx.tools.register(defineTool({
    name: "health_check",
    description:
      "对项目仓库做一次最佳实践体检：检查 README / LICENSE / .gitignore / 测试 / CI 工作流 / 依赖锁文件 / package.json 脚本 / .env.example 等是否齐备，返回体检报告卡（每项 ✓/✗ + 修复建议）与总分。用于新项目接入时快速补齐规范、或 CI 门禁。`root` 传项目根目录，默认当前工作目录。",
    parameters: {
      root: { type: "string", description: "项目根目录。默认当前工作目录。" },
    },
    output: {
      schema: {
        type: "object", additionalProperties: false,
        properties: {
          passed: { type: "integer", required: true },
          total: { type: "integer", required: true },
          score: { type: "integer", required: true },
          checks: {
            type: "array", required: true,
            items: {
              type: "object", additionalProperties: false,
              properties: {
                name: { type: "string", required: true },
                ok: { type: "boolean", required: true },
                suggestion: { type: "string", required: true },
              },
            },
          },
        },
      },
      render: (_args, value) => [{
        type: "text",
        text: `项目体检：${value.passed}/${value.total} 通过（${value.score} 分）。\n${value.checks.map((c) => `  ${c.ok ? "✓" : "✗"} ${c.name}${c.ok ? "" : " — " + c.suggestion}`).join("\n")}`,
      }],
    },
    execute: async (args) => {
      const root = args.root || process.cwd();
      let pkg = null;
      try { pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8")); } catch {}

      const checks = [];
      const add = (name, ok, suggestion) => checks.push({ name, ok, suggestion });

      const hasReadme = await exists(join(root, "README.md")) || await exists(join(root, "README"));
      add("README 文档", hasReadme, "建议添加 README.md 说明项目用途与用法");

      const hasLicense = await exists(join(root, "LICENSE")) || await exists(join(root, "LICENSE.md"));
      add("LICENSE 许可证", hasLicense, "建议添加 LICENSE（如 MIT）");

      const hasGitignore = await exists(join(root, ".gitignore"));
      add(".gitignore", hasGitignore, "建议添加 .gitignore 排除 node_modules/构建产物等");

      const hasTest = await hasTests(root);
      add("测试", hasTest, "建议添加测试目录或用例（test/ 或 *.test.*）");

      const hasCi = await exists(join(root, ".github", "workflows"));
      add("CI 工作流", hasCi, "建议添加 .github/workflows 做持续集成");

      const hasLock = await exists(join(root, "package-lock.json")) || await exists(join(root, "pnpm-lock.yaml")) || await exists(join(root, "yarn.lock"));
      add("依赖锁文件", hasLock, "建议提交锁文件（package-lock/pnpm-lock/yarn.lock）");

      const scripts = Object.keys(pkg?.scripts || {});
      const hasScripts = scripts.length > 0;
      add("npm scripts", hasScripts, "建议在 package.json 定义 build/test/lint 等脚本");

      const hasEnvExample = await exists(join(root, ".env.example"));
      add(".env.example", hasEnvExample, "如有 .env，建议提交脱敏的 .env.example 模板");

      const passed = checks.filter((c) => c.ok).length;
      const total = checks.length;
      const score = Math.round((passed / total) * 100);
      return { passed, total, score, checks };
    },
  }));
}

export { apply, inject, name };
