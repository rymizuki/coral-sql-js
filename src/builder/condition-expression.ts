import { ensureToSQL } from '../options'
import {
  BindingsPort,
  SQLBuilderBindingValue,
  SQLBuilderConditionExpressionPort,
  SQLBuilderConditionValue,
  SQLBuilderOperator,
  SQLBuilderToSQLInputOptions
} from '../types'

export class ConditionExpression implements SQLBuilderConditionExpressionPort {
  private operator: SQLBuilderOperator
  private value: SQLBuilderConditionValue

  constructor(operator: SQLBuilderOperator, value: SQLBuilderConditionValue) {
    this.operator = operator
    this.value = value
  }

  toSQL(
    options?: SQLBuilderToSQLInputOptions
  ): [string, SQLBuilderBindingValue[]] {
    const { bindings } = ensureToSQL(options)
    const sql = this.generate(bindings)
    return [sql, bindings.getBindParameters()]
  }

  private generate(bindings: BindingsPort) {
    const operator = this.operator

    if (Array.isArray(this.value)) {
      // IN or NOT IN
      if (operator === 'in' || operator === 'not in') {
        const values: string[] = []
        this.value.forEach((value) => {
          values.push(bindings.create(value))
        })
        return `${this.createOperator(operator)} (${values.join(',')})`
      }

      // BETWEEN
      if (operator === 'between') {
        const [start, end] = this.value.map((value) => bindings.create(value))
        return `${this.createOperator(operator)} ${start} AND ${end}`
      }

      // arienai
      throw new Error(`operator "${operator}" does not support array value.`)
    }

    // DEFAULT
    return `${this.createOperator(operator)} ${bindings.create(this.value)}`
  }

  private createOperator(operator: SQLBuilderOperator) {
    switch (operator) {
      case 'in':
        return 'IN'
      case 'not in':
        return 'NOT IN'
      case 'like':
        return 'LIKE'
      case 'not like':
        return 'NOT LIKE'
      case 'between':
        return 'BETWEEN'
      case 'regexp':
        return 'REGEXP'
      default:
        return operator
    }
  }
}
