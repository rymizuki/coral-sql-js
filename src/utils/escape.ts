import { Field } from '../builder/field'
import { FieldPort } from '../types'

export const unescape = (field: string): FieldPort => {
  return new Field(field, true)
}
