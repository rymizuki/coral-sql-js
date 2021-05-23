import { SQLBuilderPrimitiveValue } from '../types'

export const resolve = (value: SQLBuilderPrimitiveValue): string | number => {
  if (typeof value === 'number') {
    return value
  }
  if (typeof value === 'boolean') {
    return (value ? 1 : 0).toString()
  }
  return value
}
