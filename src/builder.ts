import { Columns } from './builder/columns'
import { Conditions } from './builder/conditions'
import { Groups } from './builder/groups'
import { Join } from './builder/join'
import { Orders } from './builder/orders'
import { Table } from './builder/table'
import { ensureToSQL } from './options'
import {
  SQLBuilderPort,
  SQLBuilderField,
  SQLBuilderOrderDirection,
  SQLBuilderToSQLInputOptions,
  SQLBuilderToSQLOptions,
  SQLBuilderConditionInputPattern,
  SQLBuilderBindingValue,
  SQLBuilderJoinDirection
} from './types'

export class SQLBuilder implements SQLBuilderPort {
  private columns: Columns
  private table: Table | null
  private joins: Join[]
  private conditions_where: Conditions
  private conditions_having: Conditions
  private groups: Groups
  private orders: Orders
  private limit_value?: number
  private offset_value?: number
  private options: SQLBuilderToSQLInputOptions

  constructor(options: SQLBuilderToSQLInputOptions = {}) {
    this.options = options
    this.columns = new Columns()
    this.table = null
    this.joins = []
    this.conditions_where = new Conditions()
    this.conditions_having = new Conditions()
    this.groups = new Groups()
    this.orders = new Orders()
  }

  column(name: SQLBuilderField, as?: string): this {
    this.columns.add(name, as)
    return this
  }

  from(name: string, as?: string): this {
    this.table = new Table(name, as)
    return this
  }

  leftJoin(...args: [string, string] | [string, string, string]): this {
    this.join('left', ...args)
    return this
  }

  join(
    direction: SQLBuilderJoinDirection,
    ...args: [string, string] | [string, string, string]
  ): this {
    this.joins.push(new Join(direction, ...args))
    return this
  }

  where(...args: SQLBuilderConditionInputPattern): this {
    this.conditions_where.and(...args)
    return this
  }

  having(...args: SQLBuilderConditionInputPattern): this {
    this.conditions_having.and(...args)
    return this
  }

  groupBy(field: SQLBuilderField): this {
    this.groups.add(field)
    return this
  }

  orderBy(field: SQLBuilderField, direction: SQLBuilderOrderDirection): this {
    this.orders.add(field, direction)
    return this
  }

  limit(value: number): this {
    this.limit_value = value
    return this
  }

  offset(value: number): this {
    this.offset_value = value
    return this
  }

  setOptions(options: SQLBuilderToSQLInputOptions) {
    this.options = options
    return this
  }

  toSQL(
    input?: SQLBuilderToSQLInputOptions
  ): [string, SQLBuilderBindingValue[]] {
    const options = ensureToSQL({ ...this.options, ...input })
    const sql = [
      this.getSelect(options),
      this.getJoin(options),
      this.getWhere(options),
      this.getGroupBy(options),
      this.getHaving(options),
      this.orders.toSQL(options),
      this.limit_value ? `LIMIT ${this.limit_value}` : null,
      this.offset_value ? `OFFSET ${this.offset_value}` : null
    ]
      .filter((section) => section)
      .join('\n')
    return [sql, options.bindings.getBindParameters()]
  }

  private getSelect(options: SQLBuilderToSQLOptions) {
    if (this.table == null) {
      throw new Error('table does not setted.')
    }

    return [
      'SELECT',
      this.columns.toSQL(options),
      'FROM',
      `${options.indent}${this.table.toSQL(options)}`
    ].join('\n')
  }

  private getJoin(options: SQLBuilderToSQLOptions) {
    if (!this.joins.length) {
      return null
    }
    return this.joins
      .map((join) => {
        return join.toSQL(options)[0]
      })
      .join('\n')
  }

  private getWhere(options: SQLBuilderToSQLOptions) {
    const { indent } = options
    if (!this.conditions_where.hasFields()) {
      return null
    }
    const [sql] = this.conditions_where.toSQL(options)
    if (!sql) {
      return null
    }
    return `WHERE\n${indent}${sql}`
  }

  private getHaving(options: SQLBuilderToSQLOptions) {
    const { indent } = options
    if (!this.conditions_having.hasFields()) {
      return null
    }
    const [sql] = this.conditions_having.toSQL(options)
    if (!sql) {
      return null
    }
    return `HAVING\n${indent}${sql}`
  }

  private getGroupBy(options: SQLBuilderToSQLOptions) {
    const sql = this.groups.toSQL(options)
    if (!sql) {
      return null
    }
    return `GROUP BY\n${options.indent}${sql}`
  }
}
