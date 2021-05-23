import { FieldPort, SQLBuilderField } from '../types'
import { Field } from './field'

export class Groups {
  private rows: FieldPort[] = []

  add(field: SQLBuilderField): void {
    this.rows.push(typeof field === 'string' ? new Field(field) : field)
  }

  toSQL(): string | null {
    if (!this.rows.length) {
      return null
    }

    return this.rows.map((field) => field.getContent()).join(',')
  }
}
