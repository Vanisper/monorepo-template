# 依赖管理

## 核心原则：catalog 治理

共享依赖的版本统一在 `pnpm-workspace.yaml` 的 `catalog` 中定义，子包用 `"catalog:"` 引用，保证全仓版本一致。

```yaml
# pnpm-workspace.yaml
catalog:
  typescript: ^7.0.2
  tsdown: ^0.22.14
  # ...
```

```json
// 子包 package.json 中
{
  "devDependencies": {
    "tsdown": "catalog:"
  }
}
```

`pnpm pack` / `pnpm publish` 时 `catalog:` 会被自动替换成真实版本号，无需手动处理。

## 何时进 catalog

**进 catalog**：在多个子包中重复使用的依赖，例如：

- `typescript` / `tsdown` / `publint` 等开发工具链
- 业务共享库（如 `lodash-es`、`dayjs` 这类跨包重复引用的运行时依赖

**不进 catalog**：

- 只有一两个包在用的专用依赖 —— 直接写在对应包的 `package.json` 中，避免 catalog 膨胀

## 内部包互相引用

内部包之间用 `workspace:*` 协议：

```json
{
  "dependencies": {
    "@mono/core": "workspace:*"
  }
}
```

`workspace:*` 保证永远指向本仓内最新构建的版本，发布时自动替换为当前版本号。

## 升级共享依赖

修改 `pnpm-workspace.yaml` 中的 catalog 条目后，重新执行：

```bash
pnpm install
```

所有引用 `"catalog:"` 的包会自动同步到新版本。

## 常用命令

```bash
# 查看某个包为什么被引入
pnpm why tsdown

# 只安装/更新某个 workspace 包的依赖
pnpm --filter @mono/core add lodash-es

# 升级所有使用 catalog 引用的包
pnpm install

# 查看哪些包依赖了某个包
pnpm why @mono/core
```

## workspace:* 的注意事项

- `workspace:*` 依赖的构建产物不会随源码自动更新，改完 `@mono/core` 后需要重新 `pnpm build`（turbo 的 `^build` 会按依赖拓扑自动处理顺序）
- 开发时用 `pnpm dev`（watch 模式），改源码自动重建

## 版本升级策略

- **patch**：bug 修复，内部兼容
- **minor**：新功能、向后兼容
- **major**：breaking change

建议遵循 [semver](https://semver.org/) 规范，由 changesets 自动管理。
