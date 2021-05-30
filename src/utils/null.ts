import { ConditionExpressionNull } from '../builder/condition-expression'
import { SQLBuilderConditionExpressionPort } from '../types'

export const is_null = (): SQLBuilderConditionExpressionPort => {
  return new ConditionExpressionNull('is null')
}

export const is_not_null = (): SQLBuilderConditionExpressionPort => {
  return new ConditionExpressionNull('is not null')
}
