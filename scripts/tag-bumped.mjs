#!/usr/bin/env node
/**
 * 只给「有变更记录（CHANGELOG 包含当前版本）」的包打 git tag
 *
 * 背景：
 * - `changeset tag`（git-tag）会给所有非 ignore 包的当前版本打 tag（0.0.0 占位包也会被打上）
 * - 本模板的语义：有变更记录的包才有 tag 的意义
 *
 * 判定规则（同时满足）：
 * 1. 不在 .changeset/config.json 的 ignore 列表里
 * 2. tag `${name}@${version}` 尚不存在
 * 3. 包的 CHANGELOG.md 包含当前版本号（说明这个版本是真的 bump 出来的）
 *
 * 兼容：
 * - 本地直接运行（无 CHANGESETS_OUTPUT 时只打 tag，不写输出文件）
 * - changesets/action 的 publish-script（自动写 CHANGESETS_OUTPUT 供其创建 GitHub Release）
 */
import { execFileSync } from 'node:child_process'
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'

const root = process.cwd()

function main() {
  // 1. 读 ignore 列表
  const config = JSON.parse(readFileSync(join(root, '.changeset/config.json'), 'utf8'))
  const ignored = new Set(config.ignore ?? [])

  // 2. 列出 workspace 包
  const listOutput = execFileSync('pnpm', ['ls', '-r', '--depth', '-1', '--json'], { encoding: 'utf8' })
  const packages = JSON.parse(listOutput).filter(pkg => pkg.name !== 'monorepo-template' && pkg.version)

  // 3. 逐个判定并打 tag
  const outputPath = process.env.CHANGESETS_OUTPUT
  if (outputPath) {
    mkdirSync(dirname(outputPath), { recursive: true })
    // 即使本轮没有需要打 tag 的包，也确保输出文件存在，避免 action 报「读取输出失败」警告
    appendFileSync(outputPath, '')
  }

  for (const pkg of packages) {
    const tagName = `${pkg.name}@${pkg.version}`

    if (ignored.has(pkg.name)) {
      continue
    }
    if (tagExists(tagName)) {
      continue
    }
    const changelogPath = join(pkg.path, 'CHANGELOG.md')
    if (!existsSync(changelogPath)) {
      console.log(`skip（无 CHANGELOG）: ${tagName}`)
      continue
    }
    const changelog = readFileSync(changelogPath, 'utf8')
    if (!changelog.includes(`## ${pkg.version}`)) {
      console.log(`skip（CHANGELOG 无 ${pkg.version}）: ${tagName}`)
      continue
    }

    console.log(`git tag ${tagName}`)
    execFileSync('git', ['tag', tagName])
    if (outputPath) {
      appendFileSync(outputPath, `${JSON.stringify({ type: 'git-tag', tag: tagName, packageName: pkg.name })}\n`)
    }
  }
}

function tagExists(tagName) {
  try {
    execFileSync('git', ['rev-parse', '--verify', '--quiet', `refs/tags/${tagName}`], { stdio: 'ignore' })
    return true
  }
  catch {
    return false
  }
}

main()
