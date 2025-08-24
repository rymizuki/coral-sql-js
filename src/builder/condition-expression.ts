import { ensureToSQL } from '../options'
import {
  BindingsPort,
  SQLBuilderBindingValue,
  SQLBuilderConditionExpressionPort,
  SQLBuilderConditionValue,
  SQLBuilderOperator,
  SQLBuilderPort,
  SQLBuilderToSQLInputOptions
} from '../types'

export abstract class AbstractConditionExpression
  implements SQLBuilderConditionExpressionPort
{
  abstract toSQL(
    options?: SQLBuilderToSQLInputOptions
  ): [string, SQLBuilderBindingValue[]]
}

export class ConditionExpression extends AbstractConditionExpression {
  private operator: SQLBuilderOperator
  private value: SQLBuilderConditionValue

  constructor(operator: SQLBuilderOperator, value: SQLBuilderConditionValue) {
    super()
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

export class ConditionExpressionNull extends AbstractConditionExpression {
  private value: 'is null' | 'is not null'
  constructor(value: 'is null' | 'is not null') {
    super()
    this.value = value
  }

  toSQL(
    options?: SQLBuilderToSQLInputOptions
  ): [string, SQLBuilderBindingValue[]] {
    const { bindings } = ensureToSQL(options)
    const sql = this.generate()
    return [sql, bindings.getBindParameters()]
  }

  private generate() {
    if (this.value === 'is null') {
      return 'IS NULL'
    }
    if (this.value === 'is not null') {
      return 'IS NOT NULL'
    }
    throw new Error('must be specified "is not? null"')
  }
}

export class ConditionExpressionExists extends AbstractConditionExpression {
  private subquery: SQLBuilderPort

  constructor(subquery: SQLBuilderPort) {
    super()
    this.subquery = subquery
  }

  toSQL(
    options?: SQLBuilderToSQLInputOptions
  ): [string, SQLBuilderBindingValue[]] {
    const [subquerySql, subqueryBindings] = this.subquery.toSQL(options)
    const sql = `EXISTS (${subquerySql})`
    return [sql, subqueryBindings]
  }
}

export class ConditionExpressionNotExists extends AbstractConditionExpression {
  private subquery: SQLBuilderPort

  constructor(subquery: SQLBuilderPort) {
    super()
    this.subquery = subquery
  }

  toSQL(
    options?: SQLBuilderToSQLInputOptions
  ): [string, SQLBuilderBindingValue[]] {
    const [subquerySql, subqueryBindings] = this.subquery.toSQL(options)
    const sql = `NOT EXISTS (${subquerySql})`
    return [sql, subqueryBindings]
  }
}

export const isExpression = (
  value: unknown
): value is SQLBuilderConditionExpressionPort => {
  return value instanceof AbstractConditionExpression
}
