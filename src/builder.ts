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
  SQLBuilderConditionsPort,
  SQLBuilderBindingValue,
  SQLBuilderJoinDirection,
  SQLBuilderConditionValue,
  SQLBuilderOperator,
  FieldPort
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
  private custom_select?: string

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

  column(name: SQLBuilderField, as?: string): SQLBuilderPort {
    this.columns.add(name, as)
    return this
  }

  select(statement: string): SQLBuilderPort {
    this.custom_select = statement
    return this
  }

  from(name: string, as?: string): SQLBuilderPort {
    this.table = new Table(name, as)
    return this
  }

  leftJoin(
    ...args:
      | [string, string]
      | [string, string, string]
      | [SQLBuilderPort, string, string]
  ): SQLBuilderPort {
    this.join('left', ...args)
    return this
  }

  join(
    direction: SQLBuilderJoinDirection,
    ...args:
      | [string, string]
      | [string, string, string]
      | [SQLBuilderPort, string, string]
  ): SQLBuilderPort {
    this.joins.push(new Join(direction, ...args))
    return this
  }

  where(...args: SQLBuilderConditionInputPattern): SQLBuilderPort {
    this.conditions_where.and(...args)
    return this
  }

  having(conditions: SQLBuilderConditionsPort): SQLBuilderPort
  having(field: SQLBuilderField, value: SQLBuilderConditionValue): SQLBuilderPort
  having(field: SQLBuilderField, value: FieldPort): SQLBuilderPort
  having(field: SQLBuilderField, operator: SQLBuilderOperator, value: SQLBuilderConditionValue): SQLBuilderPort
  having(field: SQLBuilderField, operator: SQLBuilderOperator, value: FieldPort): SQLBuilderPort
  having(
    conditionsOrField: SQLBuilderConditionsPort | SQLBuilderField,
    operatorOrValue?: SQLBuilderOperator | SQLBuilderConditionValue | FieldPort,
    value?: SQLBuilderConditionValue | FieldPort
  ): SQLBuilderPort {
    if (typeof conditionsOrField === 'object' && 'and' in conditionsOrField) {
      // SQLBuilderConditionsPortの場合
      this.conditions_having.add('and', conditionsOrField)
      return this
    }
    // 通常の条件の場合
    if (value !== undefined) {
      // 3つの引数: field, operator, value
      ;(this.conditions_having as any).and(conditionsOrField, operatorOrValue, value)
    } else {
      // 2つの引数: field, value
      ;(this.conditions_having as any).and(conditionsOrField, operatorOrValue)
    }
    return this
  }

  groupBy(field: SQLBuilderField): SQLBuilderPort {
    this.groups.add(field)
    return this
  }

  orderBy(field: SQLBuilderField, direction: SQLBuilderOrderDirection): SQLBuilderPort {
    this.orders.add(field, direction)
    return this
  }

  limit(value: number): SQLBuilderPort {
    this.limit_value = value
    return this
  }

  offset(value: number): SQLBuilderPort {
    this.offset_value = value
    return this
  }

  setOptions(options: SQLBuilderToSQLInputOptions): SQLBuilderPort {
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
    return [sql, options.bindings!.getBindParameters()]
  }

  /**
   * Create a new SQLBuilder instance.
   *
   * ```typescript
   * const newBuilder = builder.createBuilder()
   * ```
   *
   * @param options Optional SQLBuilderToSQLInputOptions
   */
  createBuilder(options?: SQLBuilderToSQLInputOptions): SQLBuilderPort {
    return new SQLBuilder(options)
  }

  /**
   * Create a new Conditions instance for building complex condition groups.
   *
   * ```typescript
   * const conditions = builder.createConditions()
   *   .and('status', 'active')
   *   .or('priority', 'high')
   * ```
   */
  createConditions(): SQLBuilderConditionsPort {
    return new Conditions()
  }

  private getSelect(options: SQLBuilderToSQLOptions) {
    if (this.table == null) {
      throw new Error('table does not setted.')
    }

    // Use custom select statement if provided
    if (this.custom_select) {
      return [
        this.custom_select,
        'FROM',
        `${options.indent}${this.table.toSQL(options)}`
      ].join('\n')
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
