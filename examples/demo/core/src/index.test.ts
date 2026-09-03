import { describe, expect, it } from 'vitest'
import { defineKit, VERSION } from './index'

describe('defineKit', () => {
  it('debug 默认为 false', () => {
    expect(defineKit({ name: 'demo' })).toEqual({ name: 'demo', debug: false })
  })

  it('显式传入的 debug 会被保留', () => {
    expect(defineKit({ name: 'demo', debug: true })).toEqual({ name: 'demo', debug: true })
  })
})

describe('版本号常量', () => {
  it('是字符串', () => {
    expect(typeof VERSION).toBe('string')
  })
})
