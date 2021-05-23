import {
  BindingsPort,
  SQLBuilderBindingValue,
  SQLBuilderPrimitiveValue
} from '../types'
import { resolve } from '../utils/type'

export class Bindings implements BindingsPort {
  private values: SQLBuilderBindingValue[] = []

  create(value: SQLBuilderPrimitiveValue): string {
    this.values.push(resolve(value))
    return '?'
  }

  getBindParameters(): SQLBuilderBindingValue[] {
    return this.values
  }
}
