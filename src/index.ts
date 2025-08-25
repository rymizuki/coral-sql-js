import { SQLBuilder } from './builder'
import { Condition as SQLBuilderCondition } from './builder/condition'
import { Conditions as SQLBuilderConditions } from './builder/conditions'
import { Field } from './builder/field'
import {
  SQLBuilderBindingValue,
  SQLBuilderConditionConjunction,
  SQLBuilderConditionExpressionPort,
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
import { unescape } from './utils/escape'
import { exists, not_exists } from './utils/exists'
import { coalesce, json_array_aggregate, json_object } from './utils/json'
import { is_not_null, is_null } from './utils/null'

export {
  coalesce,
  exists,
  Field,
  is_not_null,
  is_null,
  json_array_aggregate,
  json_object,
  not_exists,
  SQLBuilder,
  SQLBuilderBindingValue,
  SQLBuilderCondition,
  SQLBuilderConditionConjunction,
  SQLBuilderConditionExpressionPort,
  SQLBuilderConditionInputPattern,
  SQLBuilderConditionPort,
  SQLBuilderConditions,
  SQLBuilderConditionsPort,
  SQLBuilderConditionValue,
  SQLBuilderField,
  SQLBuilderOperator,
  SQLBuilderOrderDirection,
  SQLBuilderPort,
  SQLBuilderToSQLInputOptions,
  unescape
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
export const createBuilder = (
  options?: SQLBuilderToSQLInputOptions
): SQLBuilderPort => {
  return new SQLBuilder(options)
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
