export type SQLBuilderPrimitiveValue = string | number | boolean
export type SQLBuilderConditionValue =
  | SQLBuilderPrimitiveValue
  | SQLBuilderPrimitiveValue[]
export type SQLBuilderField = string | FieldPort
export type SQLBuilderConditionConjunction = 'and' | 'or'
export type SQLBuilderConditionInputPattern =
  | [SQLBuilderConditionsPort]
  | [SQLBuilderConditionPort]
  | [SQLBuilderField, SQLBuilderConditionValue]
  | [SQLBuilderField, SQLBuilderOperator, SQLBuilderConditionValue]
export type SQLBuilderOperator =
  | '='
  | '!='
  | '<>'
  | '<'
  | '<='
  | '>='
  | '>'
  | 'in'
  | 'not in'
  | 'like'
  | 'not like'
  // TODO: どうにかしよう
  //  | 'is null'
  //  | 'is not null'
  | 'between'
  | 'regexp'

export type SQLBuilderOrderDirection = 'asc' | 'desc'
export type SQLBuilderToSQLInputOptions = {
  indent?: string
  bindings?: BindingsPort
}
export type SQLBuilderToSQLOptions = {
  indent: string
  bindings: BindingsPort
}
export type SQLBuilderBindingValue = string | number

export interface FieldPort {
  getContent(): string
}

export interface BindingsPort {
  create(value: SQLBuilderPrimitiveValue): string
  getBindParameters(): SQLBuilderBindingValue[]
}

export interface SQLBuilderConditionExpressionPort {
  toSQL(
    options?: SQLBuilderToSQLInputOptions
  ): [string, SQLBuilderBindingValue[]]
}

export interface SQLBuilderConditionPort {
  toSQL(input?: SQLBuilderToSQLInputOptions): [string, SQLBuilderBindingValue[]]
}

export interface SQLBuilderConditionsPort {
  and(...args: SQLBuilderConditionInputPattern): this
  or(...args: SQLBuilderConditionInputPattern): this
  add(
    conjunction: SQLBuilderConditionConjunction,
    ...args: SQLBuilderConditionInputPattern
  ): this
  toSQL(
    input?: SQLBuilderToSQLInputOptions
  ): [string | null, SQLBuilderBindingValue[]]
}

export interface SQLBuilderPort {
  column(name: SQLBuilderField): this
  column(name: SQLBuilderField, as: string): this
  from(name: string): this
  from(name: string, as: string): this
  where(field: SQLBuilderField, value: SQLBuilderConditionValue): this
  where(
    field: SQLBuilderField,
    operator: SQLBuilderOperator,
    value: SQLBuilderConditionValue
  ): this
  having(field: SQLBuilderField, value: SQLBuilderConditionValue): this
  having(
    field: SQLBuilderField,
    operator: SQLBuilderOperator,
    value: SQLBuilderConditionValue
  ): this
  groupBy(column: SQLBuilderField): this
  orderBy(column: SQLBuilderField, order: SQLBuilderOrderDirection): this
  limit(value: number): this
  offset(value: number): this
  toSQL(
    options?: SQLBuilderToSQLInputOptions
  ): [string, SQLBuilderBindingValue[]]
}
