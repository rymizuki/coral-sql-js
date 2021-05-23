import {
  SQLBuilderPort,
  SQLBuilderConditionValue,
  SQLBuilderConditionPort,
  SQLBuilderConditionsPort
} from './types'
import { SQLBuilder } from './builder'
import { unescape } from './utils/escape'
import { Conditions as SQLBuilderConditions } from './builder/conditions'
import { Condition as SQLBuilderCondition } from './builder/condition'

export {
  SQLBuilderConditionValue,
  SQLBuilderPort,
  SQLBuilder,
  SQLBuilderConditionPort,
  SQLBuilderCondition,
  SQLBuilderConditionsPort,
  SQLBuilderConditions,
  unescape
}

export const createBuilder = (): SQLBuilderPort => {
  return new SQLBuilder()
}

export const createConditions = (): SQLBuilderConditionsPort => {
  return new SQLBuilderConditions()
}
