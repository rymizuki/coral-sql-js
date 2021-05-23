import { ensureToSQL } from '../options'
import {
  FieldPort,
  SQLBuilderBindingValue,
  SQLBuilderConditionPort,
  SQLBuilderField,
  SQLBuilderToSQLInputOptions
} from '../types'
import { ConditionExpression } from './condition-expression'
import { Field } from './field'

export class Condition implements SQLBuilderConditionPort {
  private field: FieldPort
  private expr: ConditionExpression

  constructor(field: SQLBuilderField, expr: ConditionExpression) {
    this.field = typeof field === 'string' ? new Field(field) : field
    this.expr = expr
  }

  toSQL(
    input?: SQLBuilderToSQLInputOptions
  ): [string, SQLBuilderBindingValue[]] {
    const options = ensureToSQL(input)
    const [expr_sql] = this.expr.toSQL(options)
    const sql = `(${this.field.getContent()} ${expr_sql})`
    return [sql, options.bindings.getBindParameters()]
  }
}
