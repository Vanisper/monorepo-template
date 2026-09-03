# 新增子包

以新增一个名为 `@mono/example` 的包为例，走一遍完整流程。

## 1. 创建目录结构

```bash
mkdir -p packages/example/src
```

## 2. 创建 package.json

```json
{
  "name": "@mono/example",
  "version": "0.0.0",
  "description": "示例包",
  "type": "module",
  "engines": {
    "node": ">=22.18.0"
  },
  "exports": {
    ".": {
      "import": {
        "types": "./dist/index.d.mts",
        "default": "./dist/index.mjs"
      },
      "require": {
        "types": "./dist/index.d.cts",
        "default": "./dist/index.cjs"
      }
    }
  },
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.mts",
  "files": ["dist"],
  "sideEffects": false,
  "scripts": {
    "build": "tsdown",
    "dev": "tsdown --watch",
    "check:pkg": "publint && attw --pack .",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@arethetypeswrong/cli": "catalog:check",
    "publint": "catalog:check",
    "tsdown": "catalog:build",
    "typescript": "catalog:build",
    "vitest": "catalog:test"
  }
}
```

注意：

- `exports` 必须与实际产物对应（tsdown 默认输出 `.mjs`/`.d.mts` / `.cjs`/`.d.cts`）
- `"files": ["dist"]` 保证只发布产物目录
- `"sideEffects": false` 帮助 tree-shaking
- 不需要 `publishConfig.access`：scoped 包（`@mono/*`）发布时默认就是 restricted；且本模板为内部自治，发布流程走到 git tag 即止（见 `docs/guide/versioning.md`）

## 3. 创建 tsconfig.json

包内分**核心源码**和**周边构建配置**两套 tsconfig：

**`tsconfig.json`**（核心源码 src，继承 base 的库纪律）：

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src"]
}
```

**`tsconfig.node.json`**（构建配置，如 tsdown.config.ts）：

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "isolatedDeclarations": false
  },
  "include": ["tsdown.config.ts"]
}
```

`extends` 路径随包的嵌套深度而定：`packages/example/` 这类平层包用 `../../`，`packages/ui/vue/` 这类三层嵌套用 `../../../`。

`typecheck` 脚本同时跑两套配置：

```jsonc
{
  "typecheck": "tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.node.json"
}
```

## 4. 创建 tsdown.config.ts

```ts
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: { oxc: true },
  sourcemap: true,
})
```

## 5. 写代码并构建

```ts
// src/index.ts
export function example(): string {
  return 'hello'
}
```

```bash
pnpm --filter @mono/example build
```

## 关键点说明

- **isolatedDeclarations**：`tsconfig.base.json` 已开启——这是 TS 5.5 引入的编译器约束，要求**所有导出的声明都有显式类型注解**，从而让 d.ts 逐文件独立产出、不需要类型推断；tsdown 的 oxc 依赖它才能用 Rust 速度生成 d.ts（比 tsc 快一个数量级）。它只约束库源码（src），构建配置文件（tsdown.config.ts 等）由 `tsconfig.node.json` 单独管理并关闭该约束，不要把构建配置塞进 src 的 tsconfig 里
- **TS 路径别名**：`tsconfig.base.json` 中 `moduleResolution: "bundler"` + `verbatimModuleSyntax` 是 tsdown 打包的标准基线，不要改
- **私有包**：如果不想被 changesets 误识别为发布候选，加 `"private": true`；要发布的包去掉 `private` 字段
- 新增包后重新 `pnpm install`，turbo 会自动识别为 workspace 包，`build` / `check:pkg` 自动纳入

## 验证

```bash
pnpm --filter @mono/example build && pnpm --filter @mono/example typecheck && pnpm --filter @mono/example test && pnpm --filter @mono/example check:pkg
```

四项全绿就说明没问题。
