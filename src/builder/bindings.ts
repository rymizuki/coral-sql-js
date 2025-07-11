import {
  BindingsPort,
  SQLBuilderBindingValue,
  SQLBuilderPrimitiveValue,
  SQLBuilderToSQLOptions
} from '../types'
import { resolve } from '../utils/type'

export class Bindings implements BindingsPort {
  private values: SQLBuilderBindingValue[] = []

  constructor(private placeholder: SQLBuilderToSQLOptions['placeholder']) {}

  create(value: SQLBuilderPrimitiveValue): string {
    this.values.push(resolve(value))
    if (this.placeholder === '?') {
      return '?'
    }
    return `$${this.values.length}`
  }

  getBindParameters(): SQLBuilderBindingValue[] {
    return this.values
  }
}
