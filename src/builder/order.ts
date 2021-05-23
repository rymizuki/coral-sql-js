import { FieldPort, SQLBuilderField, SQLBuilderOrderDirection } from '../types'
import { Field } from './field'

export class Order {
  private field: FieldPort
  private direction: SQLBuilderOrderDirection

  constructor(field: SQLBuilderField, direction: SQLBuilderOrderDirection) {
    this.field = typeof field === 'string' ? new Field(field) : field
    this.direction = direction
  }

  toSQL(): string {
    return `${this.field.getContent()} ${this.createDirectionValue()}`
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
