import { SQLBuilderToSQLInputOptions } from '../types'
import { escape } from '../utils/escape'

export class Table {
  private name: string
  private as?: string

  constructor(name: string, as?: string) {
    this.name = name
    this.as = as
  }

  toSQL(options?: SQLBuilderToSQLInputOptions): string {
    return `${escape(this.name, options)}${
      this.as ? ' AS ' + escape(this.as, options) : ''
    }`
  }
}
