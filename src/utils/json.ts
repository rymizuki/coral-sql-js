import {
  ConditionExpressionCoalesce,
  ConditionExpressionJsonArrayAggregate,
  ConditionExpressionJsonObject
} from '../builder/condition-expression'
import {
  FieldPort,
  SQLBuilderConditionExpressionPort,
  SQLBuilderConditionValue
} from '../types'

/**
 * Create COALESCE expression.
 *
 * ```typescript
 * import { createBuilder, coalesce, json_array_aggregate, json_object } from 'coral-sql'
 *
 * const [sql, bindings] = createBuilder()
 *   .from('order', 'o')
 *   .column(
 *     coalesce(
 *       json_array_aggregate(
 *         json_object({ id: 'o.id', ordered_at: 'o.created_at' }),
 *       ),
 *       '[]',
 *     ),
 *   )
 *   .where('order.user_id', unescape('u.id'))
 *   .orderBy('o.created_at', 'desc')
 *   .limit(5)
 *   .toSQL()
 * ```
 *
 * @param args Arguments for COALESCE function
 * @returns SQLBuilderConditionExpressionPort
 */
export const coalesce = (
  ...args: Array<
    SQLBuilderConditionExpressionPort | SQLBuilderConditionValue | FieldPort
  >
): SQLBuilderConditionExpressionPort => {
  return new ConditionExpressionCoalesce(...args)
}

/**
 * Create JSON_ARRAYAGG expression.
 *
 * ```typescript
 * import { createBuilder, json_array_aggregate, json_object } from 'coral-sql'
 *
 * const [sql, bindings] = createBuilder()
 *   .from('orders')
 *   .column(
 *     json_array_aggregate(
 *       json_object({ id: 'id', total: 'total_amount' })
 *     )
 *   )
 *   .toSQL()
 * // sql: SELECT JSON_ARRAYAGG(JSON_OBJECT('id', `id`, 'total', `total_amount`)) FROM `orders`
 * ```
 *
 * @param expression Expression to aggregate
 * @returns SQLBuilderConditionExpressionPort
 */
export const json_array_aggregate = (
  expression: SQLBuilderConditionExpressionPort | FieldPort,
  autoCoalesce?: boolean
): SQLBuilderConditionExpressionPort => {
  const jsonAggregateExpression = new ConditionExpressionJsonArrayAggregate(expression)
  
  if (autoCoalesce) {
    return new ConditionExpressionCoalesce(jsonAggregateExpression, '[]')
  }
  
  return jsonAggregateExpression
}

/**
 * Create JSON_OBJECT expression.
 *
 * ```typescript
 * import { createBuilder, json_object } from 'coral-sql'
 *
 * const [sql, bindings] = createBuilder()
 *   .from('users')
 *   .column(
 *     json_object({ id: 'id', name: 'name', email: 'email' })
 *   )
 *   .toSQL()
 * // sql: SELECT JSON_OBJECT('id', `id`, 'name', `name`, 'email', `email`) FROM `users`
 * ```
 *
 * @param fields Object mapping JSON keys to field names
 * @returns SQLBuilderConditionExpressionPort
 */
export const json_object = (
  fields: Record<string, string | FieldPort | SQLBuilderConditionExpressionPort>
): SQLBuilderConditionExpressionPort => {
  return new ConditionExpressionJsonObject(fields)
}
