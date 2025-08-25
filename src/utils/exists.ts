import {
  ConditionExpressionExists,
  ConditionExpressionNotExists
} from '../builder/condition-expression'
import { SQLBuilderConditionExpressionPort, SQLBuilderPort } from '../types'

/**
 * Create EXISTS condition expression.
 *
 * ```typescript
 * import { createBuilder, exists } from 'coral-sql'
 *
 * const [sql, bindings] = createBuilder()
 *   .from('users')
 *   .where('id', exists(
 *     createBuilder()
 *       .from('orders')
 *       .where('orders.user_id', 'users.id')
 *       .where('orders.status', 'completed')
 *   ))
 *   .toSQL()
 * // sql: SELECT * FROM `users` WHERE `id` EXISTS (SELECT * FROM `orders` WHERE `orders.user_id` = `users.id` AND `orders.status` = ?)
 * // bindings: ['completed']
 * ```
 *
 * @param subquery SQLBuilder instance for EXISTS subquery
 * @returns SQLBuilderConditionExpressionPort
 */
export const exists = (
  subquery: SQLBuilderPort
): SQLBuilderConditionExpressionPort => {
  return new ConditionExpressionExists(subquery)
}

/**
 * Create NOT EXISTS condition expression.
 *
 * ```typescript
 * import { createBuilder, not_exists } from 'coral-sql'
 *
 * const [sql, bindings] = createBuilder()
 *   .from('users')
 *   .where('id', not_exists(
 *     createBuilder()
 *       .from('orders')
 *       .where('orders.user_id', 'users.id')
 *   ))
 *   .toSQL()
 * // sql: SELECT * FROM `users` WHERE `id` NOT EXISTS (SELECT * FROM `orders` WHERE `orders.user_id` = `users.id`)
 * ```
 *
 * @param subquery SQLBuilder instance for NOT EXISTS subquery
 * @returns SQLBuilderConditionExpressionPort
 */
export const not_exists = (
  subquery: SQLBuilderPort
): SQLBuilderConditionExpressionPort => {
  return new ConditionExpressionNotExists(subquery)
}
