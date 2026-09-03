export * from './smart-fixed-block'

export interface ButtonProps {
  label: string
  disabled?: boolean
}

export function renderButtonLabel(props: ButtonProps): string {
  return props.disabled ? `[禁用] ${props.label}` : props.label
}
