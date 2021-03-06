import { SQLBuilderPrimitiveValue } from '../types'

export const resolve = (
  value: SQLBuilderPrimitiveValue
): string | number | Date => {
  if (typeof value === 'number') {
    return value
  }
  if (typeof value === 'boolean') {
    return value ? 1 : 0
  }
  if (value instanceof Date) {
    return value
  }
  return value
}
