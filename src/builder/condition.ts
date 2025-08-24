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
  private field: FieldPort | SQLBuilderConditionExpressionPort
  private expr: SQLBuilderConditionExpressionPort | null

  constructor(field: SQLBuilderField | SQLBuilderConditionExpressionPort, expr: SQLBuilderConditionExpressionPort | null) {
    if (typeof field === 'string') {
      this.field = new Field(field)
    } else if ('getContent' in field) {
      // It's a FieldPort
      this.field = field
    } else if ('toSQL' in field && typeof field.toSQL === 'function') {
      // It's either SQLBuilderPort or SQLBuilderConditionExpressionPort
      this.field = field
    } else {
      this.field = field as unknown as FieldPort
    }
    this.expr = expr
  }

  toSQL(
    input?: SQLBuilderToSQLInputOptions
  ): [string, SQLBuilderBindingValue[]] {
    const options = ensureToSQL(input)
    
    // Handle case where expr is null (standalone expression like EXISTS)
    if (this.expr === null) {
      // field must be an expression in this case
      if ('toSQL' in this.field && typeof this.field.toSQL === 'function') {
        const [field_sql] = this.field.toSQL(options)
        return [field_sql, options.bindings.getBindParameters()]
      } else {
        throw new Error('Invalid condition: field must be an expression when expr is null')
      }
    }
    
    const [expr_sql] = this.expr.toSQL(options)
    
    // Handle different field types
    if ('getContent' in this.field) {
      // It's a FieldPort
      const sql = `(${this.field.getContent(options)} ${expr_sql})`
      return [sql, options.bindings.getBindParameters()]
    } else {
      // It's a SQLBuilderConditionExpressionPort
      const [field_sql] = this.field.toSQL(options)
      const sql = `((${field_sql}) ${expr_sql})`
      return [sql, options.bindings.getBindParameters()]
    }
  }
}
