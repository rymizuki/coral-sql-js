import { ensureToSQL } from '../options'
import {
  SQLBuilderBindingValue,
  SQLBuilderConditionConjunction,
  SQLBuilderConditionInputPattern,
  SQLBuilderConditionPort,
  SQLBuilderConditionsPort,
  SQLBuilderToSQLInputOptions,
  SQLBuilderToSQLOptions
} from '../types'
import { Condition } from './condition'
import { ConditionExpression } from './condition-expression'

export class Conditions implements SQLBuilderConditionsPort {
  private rows: {
    conjunction: SQLBuilderConditionConjunction
    condition: SQLBuilderConditionPort | SQLBuilderConditionsPort
  }[] = []

  and(...args: SQLBuilderConditionInputPattern): this {
    this.add('and', ...args)
    return this
  }

  or(...args: SQLBuilderConditionInputPattern): this {
    this.add('or', ...args)
    return this
  }

  add(
    conjunction: SQLBuilderConditionConjunction,
    ...args: SQLBuilderConditionInputPattern
  ): this {
    this.rows.push({
      conjunction,
      condition: this.createCondition(...args)
    })
    return this
  }

  hasFields(): boolean {
    return this.rows.length > 0
  }

  toSQL(
    input?: SQLBuilderToSQLInputOptions
  ): [string | null, SQLBuilderBindingValue[]] {
    const options = ensureToSQL(input)
    const indent = options.indent
    if (!this.rows.length) {
      return [null, []]
    }
    const output = this.rows
      .map(({ conjunction, condition }, index) => {
        const conj =
          index === 0 ? '' : `${indent}${this.createConjunction(conjunction)} `
        const cond = this.ensureCondition(condition, options)
        if (!cond) {
          return null
        }
        return `${conj}${cond}`
      })
      .filter((section) => section)
      .join('\n')
    return [output, options.bindings.getBindParameters()]
  }

  private createCondition(...args: SQLBuilderConditionInputPattern) {
    if (
      args.length === 1 &&
      (args[0] instanceof Conditions || args[0] instanceof Condition)
    ) {
      return args[0]
    }
    if (args.length === 2) {
      const operator = Array.isArray(args[1]) ? 'in' : '='
      return new Condition(args[0], new ConditionExpression(operator, args[1]))
    }
    if (args.length === 3) {
      return new Condition(args[0], new ConditionExpression(args[1], args[2]))
    }

    // unsupported method input.
    throw new Error('ARIENAI')
  }

  private ensureCondition(
    condition: SQLBuilderConditionPort | SQLBuilderConditionsPort,
    options: SQLBuilderToSQLOptions
  ) {
    const [sql] = condition.toSQL(options)
    if (!sql) {
      return null
    }
    if (condition instanceof Conditions) {
      return `(${sql})`
    }
    return sql
  }

  private createConjunction(payload: SQLBuilderConditionConjunction) {
    switch (payload) {
      case 'and':
        return 'AND'
      case 'or':
        return 'OR'
      default:
        throw new Error(
          `conjunction "${payload as string}" is not supported value.`
        )
    }
  }
}
