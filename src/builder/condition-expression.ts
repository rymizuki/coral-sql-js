import { ensureToSQL } from '../options'
import {
  BindingsPort,
  FieldPort,
  SQLBuilderBindingValue,
  SQLBuilderConditionExpressionPort,
  SQLBuilderConditionsPort,
  SQLBuilderConditionValue,
  SQLBuilderConditionInputPattern,
  SQLBuilderOperator,
  SQLBuilderPort,
  SQLBuilderToSQLInputOptions,
  SQLBuilderToSQLOptions
} from '../types'
import { escape } from '../utils/escape'
import {
  isFieldPort,
  isSQLBuilderConditionExpressionPort
} from '../utils/type-guards'
import { Condition } from './condition'

const toSQLOperator = (operator: SQLBuilderOperator): string => {
  switch (operator) {
    case '=':
    case '!=':
    case '<>':
    case '<':
    case '<=':
    case '>=':
    case '>':
      return operator
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
      throw new Error('unsupported operator')
  }
}

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
    if (isFieldPort(this.value)) {
      const fieldContent = this.value.getContent(options)
      return `${toSQLOperator(operator)} ${fieldContent}`
    }

    if (Array.isArray(this.value)) {
      // IN or NOT IN
      if (operator === 'in' || operator === 'not in') {
        const values: string[] = []
        this.value.forEach((value) => {
          values.push(bindings.create(value))
        })
        return `${toSQLOperator(operator)} (${values.join(',')})`
      }

      // BETWEEN
      if (operator === 'between') {
        const [start, end] = this.value.map((value) => bindings.create(value))
        return `${toSQLOperator(operator)} ${start} AND ${end}`
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
    return `${toSQLOperator(operator)} ${bindings.create(conditionValue)}`
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
    const resolved = ensureToSQL(options)
    const castJsonLiteral =
      resolved.driver === 'postgresql' &&
      this.args.every(
        (arg) =>
          arg === '[]' ||
          arg === '{}' ||
          !(isSQLBuilderConditionExpressionPort(arg) || isFieldPort(arg))
      )

    const argStrings = this.args.map((arg) => {
      if (isSQLBuilderConditionExpressionPort(arg)) {
        const [sql] = arg.toSQL(resolved)
        return sql
      }
      if (isFieldPort(arg)) {
        return arg.getContent(resolved)
      }
      if (arg === '[]' || arg === '{}') {
        return castJsonLiteral ? `'${arg}'::json` : `'${arg}'`
      }
      return resolved.bindings.create(arg as SQLBuilderBindingValue)
    })

    const sql = `COALESCE(${argStrings.join(', ')})`
    return [sql, resolved.bindings.getBindParameters()]
  }
}

const jsonArrayAggregateFunctionNames: Record<
  SQLBuilderToSQLOptions['driver'],
  string
> = {
  mysql: 'JSON_ARRAYAGG',
  postgresql: 'json_agg',
  sqlite: 'json_group_array'
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
    const resolved = ensureToSQL(options)
    const innerSql = this.buildInnerSql(resolved)
    const functionName = jsonArrayAggregateFunctionNames[resolved.driver]
    const sql = `${functionName}(${innerSql})`
    return [sql, resolved.bindings.getBindParameters()]
  }

  private buildInnerSql(resolved: SQLBuilderToSQLOptions): string {
    if (isSQLBuilderConditionExpressionPort(this.expression)) {
      const [sql] = this.expression.toSQL(resolved)
      return sql
    }
    if (isFieldPort(this.expression)) {
      return this.expression.getContent(resolved)
    }
    throw new Error('Invalid expression type for JSON_ARRAY_AGG')
  }
}

type CaseWhenCondition =
  | [string, SQLBuilderOperator, SQLBuilderConditionValue]
  | SQLBuilderConditionExpressionPort
  | SQLBuilderConditionsPort
  | Condition

type CaseWhenResult = SQLBuilderConditionValue | FieldPort | SQLBuilderConditionExpressionPort | null

export class ConditionExpressionCaseWhen extends AbstractConditionExpression {
  private conditions: Array<{
    condition: CaseWhenCondition
    then: CaseWhenResult
  }> = []
  private elseValue?: CaseWhenResult
  private pendingCondition?: CaseWhenCondition

  when(...args: SQLBuilderConditionInputPattern): this {
    let condition: CaseWhenCondition

    // Use the same logic as Conditions.createCondition but keep simple cases as arrays
    if (
      args.length === 1 &&
      (args[0] instanceof Condition)
    ) {
      condition = args[0]
    } else if (args.length === 1 && isExpression(args[0])) {
      // Handle standalone expressions like EXISTS(...) without field binding
      condition = new Condition(args[0], null)
    } else if (args.length === 2) {
      // Check if the first argument is an expression (like exists(...))
      if (isExpression(args[0])) {
        // args[1] should be SQLBuilderConditionValue or FieldPort in this context
        if (isExpression(args[1])) {
          throw new Error(
            'Second argument cannot be an expression when first argument is an expression'
          )
        }
        const expr = new ConditionExpression(
          '=',
          args[1] as SQLBuilderConditionValue | FieldPort
        )
        condition = new Condition(args[0], expr)
      } else {
        // Standard case: field + expression or field + value
        const isFieldPortArg = isFieldPort(args[1])
        
        if (isExpression(args[1])) {
          // Use Condition for expressions like is_not_null()
          condition = new Condition(args[0], args[1])
        } else {
          // Use array format for simple values to maintain backward compatibility
          const operator = !isFieldPortArg && Array.isArray(args[1]) ? 'in' : '='
          condition = [args[0] as string, operator, args[1] as SQLBuilderConditionValue]
        }
      }
    } else if (args.length === 3) {
      // Keep 3-parameter cases as arrays for backward compatibility
      condition = [args[0] as string, args[1] as SQLBuilderOperator, args[2] as SQLBuilderConditionValue]
    } else if (
      args.length === 1 &&
      (isSQLBuilderConditionExpressionPort(args[0]) || (args[0] && typeof args[0] === 'object' && 'toSQL' in args[0]))
    ) {
      // Single condition expression or conditions object
      condition = args[0] as SQLBuilderConditionExpressionPort | SQLBuilderConditionsPort
    } else {
      throw new Error('Invalid when() parameters. Use when(field, operator, value), when(field, value), or when(conditions)')
    }

    this.pendingCondition = condition
    return this
  }

  then(value: CaseWhenResult): this {
    if (!this.pendingCondition) {
      throw new Error('then() must be called after when()')
    }
    
    this.conditions.push({
      condition: this.pendingCondition,
      then: value
    })
    
    this.pendingCondition = undefined
    return this
  }

  else(value: CaseWhenResult): this {
    if (this.pendingCondition) {
      throw new Error('Cannot call else() with pending when() condition. Call then() first.')
    }
    this.elseValue = value
    return this
  }

  toSQL(options?: SQLBuilderToSQLInputOptions): [string, SQLBuilderBindingValue[]] {
    if (this.pendingCondition) {
      throw new Error('Incomplete case expression. Missing then() call.')
    }
    
    const resolved = ensureToSQL(options)
    const parts: string[] = ['(CASE']

    for (const { condition, then } of this.conditions) {
      const conditionSql = this.conditionToSQL(condition, resolved)
      const thenSql = caseResultToSQL(then, resolved)
      parts.push(`WHEN ${conditionSql} THEN ${thenSql}`)
    }

    if (this.elseValue !== undefined) {
      const elseSql = caseResultToSQL(this.elseValue, resolved)
      parts.push(`ELSE ${elseSql}`)
    }

    parts.push('END)')
    const sql = parts.join(' ')
    return [sql, resolved.bindings.getBindParameters()]
  }

  private conditionToSQL(
    condition: CaseWhenCondition,
    resolved: SQLBuilderToSQLOptions
  ): string {
    if (Array.isArray(condition)) {
      const [field, operator, value] = condition
      const fieldContent = escape(field, { quote: resolved.quote })
      if (value === null && operator === '=') {
        return `${fieldContent} IS NULL`
      }
      if (value === null && operator === '!=') {
        return `${fieldContent} IS NOT NULL`
      }
      const [expressionSql] = new ConditionExpression(operator, value).toSQL(resolved)
      return `${fieldContent} ${expressionSql}`
    }
    if (condition instanceof Condition) {
      const [sql] = condition.toSQL(resolved)
      return sql.startsWith('(') && sql.endsWith(')') ? sql.slice(1, -1) : sql
    }
    const [sql] = condition.toSQL(resolved)
    return sql || ''
  }
}

function caseResultToSQL(
  value: CaseWhenResult,
  resolved: SQLBuilderToSQLOptions
): string {
  if (isSQLBuilderConditionExpressionPort(value)) {
    const [sql] = value.toSQL(resolved)
    return sql
  }

  if (isFieldPort(value)) {
    return value.getContent(resolved)
  }

  if (value === null || value === undefined) {
    return 'NULL'
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  if (typeof value === 'boolean') {
    return String(value)
  }
  return resolved.bindings.create(value as SQLBuilderBindingValue)
}

const jsonObjectDialects: Record<
  SQLBuilderToSQLOptions['driver'],
  { functionName: string; keyCast: string }
> = {
  mysql: { functionName: 'JSON_OBJECT', keyCast: '' },
  postgresql: { functionName: 'json_build_object', keyCast: '::text' },
  sqlite: { functionName: 'JSON_OBJECT', keyCast: '' }
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
    const resolved = ensureToSQL(options)
    const { functionName, keyCast } = jsonObjectDialects[resolved.driver]
    const pairs: string[] = []

    for (const [key, value] of Object.entries(this.fields)) {
      const keyPlaceholder = `${resolved.bindings.create(key)}${keyCast}`
      pairs.push(`${keyPlaceholder}, ${this.buildValueSql(value, resolved)}`)
    }

    const sql = `${functionName}(${pairs.join(', ')})`
    return [sql, resolved.bindings.getBindParameters()]
  }

  private buildValueSql(
    value: string | FieldPort | SQLBuilderConditionExpressionPort,
    resolved: SQLBuilderToSQLOptions
  ): string {
    if (isSQLBuilderConditionExpressionPort(value)) {
      const [sql] = value.toSQL(resolved)
      return sql
    }
    if (isFieldPort(value)) {
      return value.getContent(resolved)
    }
    return escape(value, { quote: resolved.quote })
  }
}

export const isExpression = (
  value: unknown
): value is SQLBuilderConditionExpressionPort => {
  return value instanceof AbstractConditionExpression
}
