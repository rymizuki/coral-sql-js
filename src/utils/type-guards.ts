import {
  FieldPort,
  SQLBuilderConditionExpressionPort,
  SQLBuilderPort
} from '../types'

/**
 * Type guard to check if a value is a FieldPort
 */
export function isFieldPort(value: unknown): value is FieldPort {
  return (
    value !== null &&
    typeof value === 'object' &&
    'getContent' in value &&
    typeof (value as FieldPort).getContent === 'function'
  )
}

/**
 * Type guard to check if a value is a SQLBuilderConditionExpressionPort
 */
export function isSQLBuilderConditionExpressionPort(
  value: unknown
): value is SQLBuilderConditionExpressionPort {
  return (
    value !== null &&
    typeof value === 'object' &&
    'toSQL' in value &&
    typeof (value as SQLBuilderConditionExpressionPort).toSQL === 'function'
  )
}

/**
 * Type guard to check if a value is a SQLBuilderPort (has select method)
 */
export function isSQLBuilderPort(value: unknown): value is SQLBuilderPort {
  return (
    value !== null &&
    typeof value === 'object' &&
    'select' in value &&
    'toSQL' in value &&
    typeof (value as SQLBuilderPort).select === 'function' &&
    typeof (value as SQLBuilderPort).toSQL === 'function'
  )
}

/**
 * Type guard to check if a value has toSQL method (covers both SQLBuilderPort and SQLBuilderConditionExpressionPort)
 */
export function hasToSQLMethod(
  value: unknown
): value is SQLBuilderPort | SQLBuilderConditionExpressionPort {
  return (
    value !== null &&
    typeof value === 'object' &&
    'toSQL' in value &&
    typeof (value as { toSQL: unknown }).toSQL === 'function'
  )
}