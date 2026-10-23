import { SQLBuilderToSQLInputOptions } from '..'
import {
  SQLBuilderBindingValue,
  SQLBuilderJoinCondition,
  SQLBuilderJoinDirection,
  SQLBuilderPort
} from '../types'
import { escape } from '../utils/escape'
import { isRawSQLPort, isSQLBuilderConditionsPort } from '../utils/type-guards'
import { Table } from './table'

export class Join {
  private direction: SQLBuilderJoinDirection
  private table?: Table
  private subquery?: SQLBuilderPort
  private alias?: string
  private condition: SQLBuilderJoinCondition

  constructor(
    direction: SQLBuilderJoinDirection,
    ...args:
      | [string, SQLBuilderJoinCondition]
      | [string, string, SQLBuilderJoinCondition]
      | [SQLBuilderPort, string, SQLBuilderJoinCondition]
  ) {
    this.direction = direction

    if (args.length == 2) {
      if (typeof args[0] === 'string') {
        this.table = new Table(args[0])
        this.condition = args[1]
      } else {
        throw new Error('SQLBuilder as subquery requires an alias')
      }
    } else if (args.length === 3) {
      if (typeof args[0] === 'string') {
        this.table = new Table(args[0], args[1])
        this.condition = args[2]
      } else {
        // SQLBuilder instance with alias and condition
        this.subquery = args[0]
        this.alias = args[1]
        this.condition = args[2]
      }
    } else {
      throw new Error('invalid parameter in join')
    }
  }

  toSQL(
    options: SQLBuilderToSQLInputOptions
  ): [string, SQLBuilderBindingValue[]] {
    let table_sql: string
    let bindings: SQLBuilderBindingValue[] = []

    if (this.table) {
      table_sql = this.table.toSQL(options)
    } else if (this.subquery && this.alias) {
      const [subquerySql, subqueryBindings] = this.subquery.toSQL(options)
      table_sql = `(${subquerySql}) AS ${escape(this.alias, options)}`
      bindings = subqueryBindings
    } else {
      throw new Error('Invalid join configuration')
    }

    const sql = [
      this.createDirection(this.direction),
      'JOIN',
      table_sql,
      'ON',
      this.renderCondition(options)
    ].join(' ')
    return [sql, bindings]
  }

  private renderCondition(options: SQLBuilderToSQLInputOptions): string {
    if (typeof this.condition === 'string') {
      return this.condition
    }
    if (isRawSQLPort(this.condition)) {
      return this.requireNonEmpty(this.condition.getContent(options))
    }
    if (isSQLBuilderConditionsPort(this.condition)) {
      const [sql] = this.condition.toSQL(options)
      return this.requireNonEmpty(sql)
    }
    throw new Error(
      'coral-sql join condition must be createConditions() or unescape()'
    )
  }

  private requireNonEmpty(sql: string | null): string {
    if (!sql || !sql.trim()) {
      throw new Error('coral-sql join requires a non-empty condition')
    }
    return sql
  }

  private createDirection(direction: SQLBuilderJoinDirection) {
    switch (direction) {
      case 'left':
        return 'LEFT'
      case 'right':
        return 'RIGHT'
      case 'inner':
        return 'INNER'
      case 'outer':
        return 'OUTER'
      case null:
        return ''
      default:
        throw new Error(
          `coral-sql join dose unsupported direction ${direction as string}`
        )
    }
  }
}
