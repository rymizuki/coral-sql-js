import { ensureToSQL } from '../options'
import {
  SQLBuilderField,
  SQLBuilderOrderDirection,
  SQLBuilderToSQLInputOptions
} from '../types'
import { Order } from './order'

export class Orders {
  private rows: Order[] = []

  add(field: SQLBuilderField, direction: SQLBuilderOrderDirection): void {
    this.rows.push(new Order(field, direction))
  }

  toSQL(options?: SQLBuilderToSQLInputOptions): string | null {
    const { indent } = ensureToSQL(options)
    if (!this.rows.length) {
      return null
    }
    const orders = this.rows
      .map((order) => `${indent}${order.toSQL(options)}`)
      .join(',\n')

    return `ORDER BY\n${orders}`
  }
}
