import { ensureToSQL } from '../options'
import {
  FieldPort,
  SQLBuilderBindingValue,
  SQLBuilderConditionExpressionPort,
  SQLBuilderConditionPort,
  SQLBuilderField,
  SQLBuilderToSQLInputOptions
} from '../types'
import { Field } from './field'

export class Condition implements SQLBuilderConditionPort {
  private field: FieldPort
  private expr: SQLBuilderConditionExpressionPort

  constructor(field: SQLBuilderField, expr: SQLBuilderConditionExpressionPort) {
    this.field = typeof field === 'string' ? new Field(field) : field
    this.expr = expr
  }

  toSQL(
    input?: SQLBuilderToSQLInputOptions
  ): [string, SQLBuilderBindingValue[]] {
    const options = ensureToSQL(input)
    const [expr_sql] = this.expr.toSQL(options)
    const sql = `(${this.field.getContent(options)} ${expr_sql})`
    return [sql, options.bindings.getBindParameters()]
  }
}
