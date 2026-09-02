export const VERSION: string = '0.0.0'

export interface KitOptions {
  name: string
  debug?: boolean
}

export function defineKit(options: KitOptions): KitOptions {
  return { debug: false, ...options }
}
