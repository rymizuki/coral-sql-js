import { ensureToSQL } from '../options'
import {
  BindingsPort,
  FieldPort,
  SQLBuilderBindingValue,
  SQLBuilderConditionExpressionPort,
  SQLBuilderConditionValue,
  SQLBuilderOperator,
  SQLBuilderPort,
  SQLBuilderToSQLInputOptions
} from '../types'
import { escape } from '../utils/escape'

export abstract class AbstractConditionExpression
  implements SQLBuilderConditionExpressionPort
{
  abstract toSQL(
    options?: SQLBuilderToSQLInputOptions
  ): [string, SQLBuilderBindingValue[]]
}

export class ConditionExpression extends AbstractConditionExpression {
  private operator: SQLBuilderOperator
  private value: SQLBuilderConditionValue | FieldPort

  constructor(
    operator: SQLBuilderOperator,
    value: SQLBuilderConditionValue | FieldPort
  ) {
    super()
    this.operator = operator
    this.value = value
  }

  toSQL(
    options?: SQLBuilderToSQLInputOptions
  ): [string, SQLBuilderBindingValue[]] {
    const { bindings } = ensureToSQL(options)
    const sql = this.generate(bindings, options)
    return [sql, bindings.getBindParameters()]
  }

  private generate(
    bindings: BindingsPort,
    options?: SQLBuilderToSQLInputOptions
  ) {
    const operator = this.operator

    // Handle FieldPort value
    if (
      this.value &&
      typeof this.value === 'object' &&
      'getContent' in this.value
    ) {
      const fieldContent = (this.value as FieldPort).getContent(options)
      return `${this.createOperator(operator)} ${fieldContent}`
    }

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
    const conditionValue = this.value as SQLBuilderConditionValue
    if (Array.isArray(conditionValue)) {
      throw new Error(
        `operator "${operator}" does not support array value in this context.`
      )
    }
    return `${this.createOperator(operator)} ${bindings.create(conditionValue)}`
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

export class ConditionExpressionCoalesce extends AbstractConditionExpression {
  private args: Array<
    SQLBuilderConditionExpressionPort | SQLBuilderConditionValue | FieldPort
  >

  constructor(
    ...args: Array<
      SQLBuilderConditionExpressionPort | SQLBuilderConditionValue | FieldPort
    >
  ) {
    super()
    this.args = args
  }

  toSQL(
    options?: SQLBuilderToSQLInputOptions
  ): [string, SQLBuilderBindingValue[]] {
    const allBindings: SQLBuilderBindingValue[] = []

    const argStrings = this.args.map((arg) => {
      // Handle SQLBuilderConditionExpressionPort
      if (arg && typeof arg === 'object' && 'toSQL' in arg) {
        const [sql, argBindings] = (
          arg as SQLBuilderConditionExpressionPort
        ).toSQL(options)
        allBindings.push(...argBindings)
        return sql
      }
      // Handle FieldPort
      if (arg && typeof arg === 'object' && 'getContent' in arg) {
        return (arg as FieldPort).getContent(options)
      }
      // Handle regular values (all strings are treated as literal values)
      // For field names, use unescape() or FieldPort explicitly
      allBindings.push(arg as SQLBuilderBindingValue)
      return '?'
    })

    const sql = `COALESCE(${argStrings.join(', ')})`
    return [sql, allBindings]
  }
}

export class ConditionExpressionJsonArrayAggregate extends AbstractConditionExpression {
  private expression: SQLBuilderConditionExpressionPort | FieldPort

  constructor(expression: SQLBuilderConditionExpressionPort | FieldPort) {
    super()
    this.expression = expression
  }

  toSQL(
    options?: SQLBuilderToSQLInputOptions
  ): [string, SQLBuilderBindingValue[]] {
    let innerSql: string
    let bindings: SQLBuilderBindingValue[] = []

    // Handle SQLBuilderConditionExpressionPort
    if (
      this.expression &&
      typeof this.expression === 'object' &&
      'toSQL' in this.expression
    ) {
      const [sql, exprBindings] = (
        this.expression as SQLBuilderConditionExpressionPort
      ).toSQL(options)
      innerSql = sql
      bindings = exprBindings
    }
    // Handle FieldPort
    else if (
      this.expression &&
      typeof this.expression === 'object' &&
      'getContent' in this.expression
    ) {
      innerSql = (this.expression as FieldPort).getContent(options)
    } else {
      throw new Error('Invalid expression type for JSON_ARRAY_AGG')
    }

    const sql = `JSON_ARRAYAGG(${innerSql})`
    return [sql, bindings]
  }
}

export class ConditionExpressionJsonObject extends AbstractConditionExpression {
  private fields: Record<
    string,
    string | FieldPort | SQLBuilderConditionExpressionPort
  >

  constructor(
    fields: Record<
      string,
      string | FieldPort | SQLBuilderConditionExpressionPort
    >
  ) {
    super()
    this.fields = fields
  }

  toSQL(
    options?: SQLBuilderToSQLInputOptions
  ): [string, SQLBuilderBindingValue[]] {
    const pairs: string[] = []
    const allBindings: SQLBuilderBindingValue[] = []

    for (const [key, value] of Object.entries(this.fields)) {
      let fieldContent: string
      // Handle SQLBuilderConditionExpressionPort
      if (value && typeof value === 'object' && 'toSQL' in value) {
        const [sql, bindings] = (
          value as SQLBuilderConditionExpressionPort
        ).toSQL(options)
        fieldContent = sql
        allBindings.push(...bindings)
      }
      // Handle FieldPort
      else if (value && typeof value === 'object' && 'getContent' in value) {
        fieldContent = (value as FieldPort).getContent(options)
      } else {
        // Treat string as a field name that should be escaped
        const { quote } = ensureToSQL(options)
        fieldContent = escape(value as string, { quote })
      }
      pairs.push(`'${key}', ${fieldContent}`)
    }

    const sql = `JSON_OBJECT(${pairs.join(', ')})`
    return [sql, allBindings]
  }
}

export const isExpression = (
  value: unknown
): value is SQLBuilderConditionExpressionPort => {
  return value instanceof AbstractConditionExpression
}
