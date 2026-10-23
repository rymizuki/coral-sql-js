import { RawSQLPort } from '../types'
import { Field } from './field'

export class RawSQL extends Field implements RawSQLPort {
  readonly kind = 'raw_sql' as const

  constructor(sql: string) {
    super(sql, true)
  }
}
