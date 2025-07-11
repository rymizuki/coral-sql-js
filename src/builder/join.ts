import { SQLBuilderToSQLInputOptions } from '..'
import { SQLBuilderBindingValue, SQLBuilderJoinDirection } from '../types'
import { Table } from './table'

export class Join {
  private direction: SQLBuilderJoinDirection
  private table: Table
  private condition: string

  constructor(
    direction: SQLBuilderJoinDirection,
    ...args: [string, string] | [string, string, string]
  ) {
    this.direction = direction

    if (args.length == 2) {
      this.table = new Table(args[0])
      this.condition = args[1]
    } else if (args.length === 3) {
      this.table = new Table(args[0], args[1])
      this.condition = args[2]
    } else {
      throw new Error('invalid parameter in join')
    }
  }

  toSQL(
    options: SQLBuilderToSQLInputOptions
  ): [string, SQLBuilderBindingValue[]] {
    const table_sql = this.table.toSQL(options)
    const sql = [
      this.createDirection(this.direction),
      'JOIN',
      table_sql,
      'ON',
      this.condition
    ].join(' ')
    return [sql, []]
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
