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
export type SQLBuilderJoinDirection =
  | 'left'
  | 'right'
  | 'inner'
  | 'outer'
  | null

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
  /**
   * Returns escaped field name.
   *
   * @return string
   */
  getContent(): string
}

export interface BindingsPort {
  /**
   * Create bindings value.
   * Returns placeholder(`?`) value.
   * And saving binding values in private.
   *
   * @param value
   * @returns string
   */
  create(value: SQLBuilderPrimitiveValue): string

  /**
   * Returns binding values on called create method.
   *
   * @returns SQLBuilderBindingValue[]
   */
  getBindParameters(): SQLBuilderBindingValue[]
}

export interface SQLBuilderConditionExpressionPort {
  toSQL(
    options?: SQLBuilderToSQLInputOptions
  ): [string, SQLBuilderBindingValue[]]
}

export interface SQLBuilderConditionPort {
  /**
   * Generate SQL and Binding Values.
   *
   * ```typescript
   * const [sql, bindings] = condition.toSQL()
   * ```
   *
   * @param input
   */

  toSQL(input?: SQLBuilderToSQLInputOptions): [string, SQLBuilderBindingValue[]]
}

export interface SQLBuilderConditionsPort {
  /**
   * Add `and` condition.
   *
   * ```typescript
   * conditions
   *   .and('gender', 'male')
   *   .and('age', '>= ', 20)
   * // sql: (`gender` = ?) AND (`age` >= ?)
   * // bindings: ['male', 20]
   * ```
   *
   * @param args
   */
  and(...args: SQLBuilderConditionInputPattern): this
  /**
   * Add `or` condition.
   *
   * ```typescript
   * conditions
   *  .and('gender', 'male')
   *  .or('age', '>=', 20)
   * // sql: (`gender` = ?) OR (`age` >= ?)
   * // bindings: ['male', 20]
   * ```
   *
   * @param args
   */
  or(...args: SQLBuilderConditionInputPattern): this
  add(
    conjunction: SQLBuilderConditionConjunction,
    ...args: SQLBuilderConditionInputPattern
  ): this
  /**
   * Generate SQL and Binding Values.
   *
   * ```typescript
   * const [sql, bindings] = conditions.toSQL()
   * ```
   *
   * @param input
   */
  toSQL(
    input?: SQLBuilderToSQLInputOptions
  ): [string | null, SQLBuilderBindingValue[]]
}

export interface SQLBuilderPort {
  /**
   * Specified select column.
   *
   * ```typescript
   * builder.column('id')
   * // `id`
   * ```
   *
   * @param name Specified column's name.
   */
  column(name: SQLBuilderField): this
  /**
   * Specified select column with alias name.
   *
   * ```typescript
   * builder.column('id', 'user_id')
   * // `id` AS `user_id`
   * ```
   *
   * @param name
   * @param as
   */
  column(name: SQLBuilderField, as: string): this
  /**
   * Specified table name.
   *
   * ```typescript
   * builder.from('users')
   * // FROM `users`
   * ```
   *
   * @param name
   */
  from(name: string): this
  /**
   * Specified table name with alias.
   *
   * ```typescript
   * builder.from('users', 'u')
   * // FROM `users` AS `u`
   * ```
   *
   * @param name
   * @param as
   */
  from(name: string, as: string): this
  /**
   * Sepcified left join
   *
   * ```typescript
   * builder.leftJoin('passport', 'passport.id = user.passport_id')
   * // LEFT JOIN `passport` ON passport.id = user.passport_id
   * ```
   *
   * @param table_name
   * @param condition
   */
  leftJoin(table_name: string, condition: string): this
  /**
   * Specified left join with table alias.
   *
   * ```typescript
   * builder.leftJoin('passport', 'p', 'p.id = user.passport_id')
   * // LEFT JOIN `passport` AS `p` ON p.id = user.passport_id
   * ```
   *
   * @param table_name
   * @param as
   * @param condition
   */
  leftJoin(table_name: string, as: string, condition: string): this
  /**
   * Specified join.
   *
   * @param direction
   * @param table_name
   * @param condition
   */
  join(
    direction: SQLBuilderJoinDirection,
    table_name: string,
    condition: string
  ): this
  /**
   * Specified join with direction.
   *
   * @param direction
   * @param table_name
   * @param as
   * @param condition
   */
  join(
    direction: SQLBuilderJoinDirection,
    table_name: string,
    as: string,
    condition: string
  ): this

  /**
   * Specified search condition.
   *
   * ```typescript
   * builder.where('id', 1)
   * builder.where('id', [1, 2, 3]) // use `IN`
   * ```
   *
   * @param field field name.
   * @param value condition value.
   */
  where(field: SQLBuilderField, value: SQLBuilderConditionValue): this
  /**
   * Specified search condition with operator.
   *
   * ```typescript
   * builder.where('id', '!=', 1)
   * builder.where('id', 'in', [1, 2, 3])
   * builder.where('created_at', 'between', [start_at, end_at])
   * ```
   *
   * @param field
   * @param operator
   * @param value
   */
  where(
    field: SQLBuilderField,
    operator: SQLBuilderOperator,
    value: SQLBuilderConditionValue
  ): this
  /**
   * Specified where condition.
   *
   * ```
   * builder.where(createConditions().and('value', 1).or('value', 2))
   * ```
   *
   * @param conditions
   */
  where(conditions: SQLBuilderConditionsPort): this
  /**
   * Specified having condition.
   *
   * ```typescript
   * builder.having('value', 1)
   * builder.having('value', [1, 5, 10])
   * ```
   *
   * @param field
   * @param value
   */
  having(field: SQLBuilderField, value: SQLBuilderConditionValue): this
  /**
   * Specified having condition.
   *
   * ```typescript
   * builder.having('value', '>=', 10)
   * builder.having('value', 'in', [1, 5, 10])
   * ```
   *
   * @param field
   * @param operator
   * @param value
   */
  having(
    field: SQLBuilderField,
    operator: SQLBuilderOperator,
    value: SQLBuilderConditionValue
  ): this
  /**
   * Specified group-by condition.
   *
   * ```typescript
   * builder.groupBy('age')
   * ```
   *
   * @param column
   */
  groupBy(column: SQLBuilderField): this
  /**
   * Specified order-by condition.
   *
   * ```typescript
   * builder.orderBy('id', 'asc')
   * builder.orderBy('id', 'desc')
   * ```
   *
   * @param column
   * @param order
   */
  orderBy(column: SQLBuilderField, order: SQLBuilderOrderDirection): this
  /**
   * Specified limit value.
   *
   * ```typescript
   * builder.limit(1)
   * ```
   *
   * @param value
   */
  limit(value: number): this
  /**
   * Specified offset value.
   *
   * ```typescript
   * builder.offset(1)
   * ```
   *
   * @param value
   */
  offset(value: number): this
  /**
   * Returnes SQL and Binding values.
   *
   * ```typescript
   * const [sql, bindings] = builder.toSQL()
   * ```
   *
   * @param options
   */
  toSQL(
    options?: SQLBuilderToSQLInputOptions
  ): [string, SQLBuilderBindingValue[]]
}
