import { FieldPort, SQLBuilderToSQLInputOptions } from '../types'
import { escape } from '../utils/escape'

export class Field implements FieldPort {
  private field: string
  private unescape: boolean

  constructor(field: string, unescape?: boolean) {
    this.field = field
    this.unescape = !!unescape
  }

  getContent(options?: SQLBuilderToSQLInputOptions): string {
    if (this.unescape) {
      return this.field
    } else {
      return escape(this.field, options)
    }
  }
}
