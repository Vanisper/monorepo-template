import { VERSION } from '@mono/core'

export function banner(name: string): string {
  return `${name} v${VERSION}`
}
