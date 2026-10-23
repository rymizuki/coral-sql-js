import { RawSQLPort } from '../types'
import { Field } from './field'

export class RawSQL extends Field implements RawSQLPort {
  readonly kind = 'raw_sql' as const
  private readonly sql: string

  constructor(sql: string) {
    super(sql)
    this.sql = sql
  }

  getContent(): string {
    return this.sql
  }
}
