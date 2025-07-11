import {
  FieldPort,
  SQLBuilderField,
  SQLBuilderOrderDirection,
  SQLBuilderToSQLInputOptions
} from '../types'
import { Field } from './field'

export class Order {
  private field: FieldPort
  private direction: SQLBuilderOrderDirection

  constructor(field: SQLBuilderField, direction: SQLBuilderOrderDirection) {
    this.field = typeof field === 'string' ? new Field(field) : field
    this.direction = direction
  }

  toSQL(options?: SQLBuilderToSQLInputOptions): string {
    return `${this.field.getContent(options)} ${this.createDirectionValue()}`
  }

  private createDirectionValue() {
    switch (this.direction) {
      case 'asc':
        return 'ASC'
      case 'desc':
        return 'DESC'
      default:
        throw new Error(
          `missing support direction "${this.direction as string}" in Order`
        )
    }
  }
}
