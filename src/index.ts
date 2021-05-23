import {
  SQLBuilderBindingValue,
  SQLBuilderConditionConjunction,
  SQLBuilderConditionInputPattern,
  SQLBuilderConditionPort,
  SQLBuilderConditionsPort,
  SQLBuilderConditionValue,
  SQLBuilderField,
  SQLBuilderOperator,
  SQLBuilderOrderDirection,
  SQLBuilderPort,
  SQLBuilderToSQLInputOptions
} from './types'
import { SQLBuilder } from './builder'
import { unescape } from './utils/escape'
import { Conditions as SQLBuilderConditions } from './builder/conditions'
import { Condition as SQLBuilderCondition } from './builder/condition'

export {
  SQLBuilderPort,
  SQLBuilder,
  SQLBuilderConditionPort,
  SQLBuilderCondition,
  SQLBuilderConditionsPort,
  SQLBuilderConditions,
  unescape,
  SQLBuilderBindingValue,
  SQLBuilderConditionConjunction,
  SQLBuilderConditionInputPattern,
  SQLBuilderConditionValue,
  SQLBuilderField,
  SQLBuilderOperator,
  SQLBuilderOrderDirection,
  SQLBuilderToSQLInputOptions
}

/**
 * Create SQLBuilder instance.
 *
 * ```typescript
 * const builder = createBuilder()
 * const [sql, bindings] = builder
 *   .from('users')
 *   .where('id', 1001)
 *   .limit(1)
 *   .toSQL()
 * // sql: SELECT * FROM `users` WHERE `id` = ? LIMIT 1
 * // bindings: [1001]
 *
 * ```
 *
 * @returns SQLBuilderPort
 */
export const createBuilder = (): SQLBuilderPort => {
  return new SQLBuilder()
}

/**
 * Create SQLBuilderCondition instance.
 *
 * ```typescript
 * const conditions = createConditions()
 * const [sql, bindings] = createConditions()
 *   .and('age', 'between', [20, 29])
 *   .or('age', 'between', [30, 39])
 * // sql: (`age` BETWEEN ? AND ?) OR (`age` BETWEEN ? AND ?)
 * // bindings: [20, 29, 30, 39]
 * ```
 *
 * @returns SQLBuilderConditionPort
 */
export const createConditions = (): SQLBuilderConditionsPort => {
  return new SQLBuilderConditions()
}
