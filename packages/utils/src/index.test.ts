import { describe, expect, it } from 'vitest'
import { VERSION } from '@mono/core'
import { banner } from './index'

describe('banner', () => {
  it('用 @mono/core 的 VERSION 拼接名称', () => {
    expect(banner('demo')).toBe(`demo v${VERSION}`)
  })
})
