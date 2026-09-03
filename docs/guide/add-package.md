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
    "test": "vitest run"
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

## 3. 创建 tsconfig.json

`extends` 路径随包的嵌套深度而定，`packages/example/` 这类平层包用 `../../`：

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src"]
}
```

## 4. 创建 tsdown.config.ts

```ts
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: { isolatedDeclarations: true },
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

- **isolatedDeclarations**：`tsconfig.base.json` 已开启，所有导出必须有显式类型注解，否则 d.ts 生成会报错
- **TS 路径别名**：`tsconfig.base.json` 中 `moduleResolution: "bundler"` + `verbatimModuleSyntax` 是 tsdown 打包的标准基线，不要改
- **私有包**：如果不想被 changesets 误识别为发布候选，加 `"private": true`；要发布的包去掉 `private` 字段
- 新增包后重新 `pnpm install`，turbo 会自动识别为 workspace 包，`build` / `check:pkg` 自动纳入

## 验证

```bash
pnpm --filter @mono/example build && pnpm --filter @mono/example test && pnpm --filter @mono/example check:pkg
```

三项全绿就说明没问题。
