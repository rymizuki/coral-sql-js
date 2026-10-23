# coral-sql

[![npm version](https://badge.fury.io/js/coral-sql.svg)](https://badge.fury.io/js/coral-sql)
[![CI](https://github.com/rymizuki/coral-sql-js/actions/workflows/main.yml/badge.svg)](https://github.com/rymizuki/coral-sql-js/actions/workflows/main.yml)

The nodejs module for building SQL by complec and related like coral.

## Installation

```shell:npm
> npm install coral-sql
```

```shell:yarn
> yarn add coral-sql
```

## Usage

```ts
import { createBuilder, unescape } from 'coral-sql'

const [sql, bindings] = createBuilder()
  .column('age')
  .column(unescape('COUNT(*)'), 'value')
  .from('users')
  .where('enabled', true)
  .groupBy('age')
  .having('value', '>=', 10)
  .orderBy('value', 'desc')
  .toSQL()

const query = await connection.query(sql, bindings)

// sql:
//   SELECT
//     `age`,
//     COUNT(*) AS `value`
//   FROM
//     `users`
//   WHERE
//     (`enabled` = ?)
//   GROUP BY
//     `age`
//   HAVING
//     (`value` >= ?)
//   ORDER BY
//     `value` DESC
// bindings: [1, 10]
```

### Join

Build the ON condition with `createConditions()`. Values are bound and identifiers are escaped.
Use `column_ref()` on the right-hand side to compare two columns.

```ts
import { createBuilder, createConditions, column_ref } from 'coral-sql'

const [sql, bindings] = createBuilder()
  .from('users', 'u')
  .leftJoin(
    'passport',
    'p',
    createConditions()
      .and('p.id', '=', column_ref('u.passport_id'))
      .and('p.deleted', 0)
  )
  .where('u.id', 1)
  .toSQL()

// sql:
//   SELECT
//     *
//   FROM
//     `users` AS `u`
//   LEFT JOIN `passport` AS `p` ON (`p`.`id` = `u`.`passport_id`)
//     AND (`p`.`deleted` = ?)
//   WHERE
//     (`u`.`id` = ?)
// bindings: [0, 1]
```

Pass `unescape()` for raw SQL, e.g. `unescape('p.id = u.passport_id')`.

A plain string ON condition (`.leftJoin('passport', 'p', 'p.id = u.passport_id')`) is deprecated.
It is still written as-is, so never put user input in it. The next major version will require `unescape()`.

### Custom SELECT

Pass `unescape()` to replace the SELECT clause with raw SQL.

```ts
import { createBuilder, unescape } from 'coral-sql'

const [sql] = createBuilder()
  .select(unescape('SELECT COUNT(*) AS total'))
  .from('users')
  .toSQL()

// sql:
//   SELECT COUNT(*) AS total
//   FROM
//     `users`
```

A plain string (`.select('SELECT COUNT(*) AS total')`) is deprecated.
It is still written as-is, so never put user input in it. The next major version will require `unescape()`.

## Security

- **Values are always bound.** Values in `where()` / `having()`, ON conditions, `case_when()` THEN / ELSE and `json_object()` keys become placeholders.
- **Identifiers are quoted.** Field and table names are split on `.` and each part is quoted with the driver's quote (`` ` `` for mysql / sqlite, `"` for postgresql); a quote inside a name is doubled.
  A part is written as-is only when it is wrapped in that quote and contains neither the quote nor a backslash (e.g. `` `users` `` on mysql, `"users"` on postgresql).
  Quoting stops SQL injection, but a caller-chosen name can still point at any column, so pick names from an allowlist.
- **`limit()` / `offset()`** accept only non-negative safe integers and throw otherwise.
- **Raw SQL is written as-is.** Never put user input in:
  - `unescape()`
  - a plain string passed to `select()` or as an ON condition (deprecated)
  - `new Field(x, true)` (deprecated)
- **`quote: null`** turns identifier quoting off.

## Migrating to 1.8

| Before                                                 | After                                                                                          |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `.select('SELECT COUNT(*) AS total')`                  | `.select(unescape('SELECT COUNT(*) AS total'))`                                                |
| `.leftJoin('passport', 'p', 'p.id = u.passport_id')`   | `.leftJoin('passport', 'p', createConditions().and('p.id', '=', column_ref('u.passport_id')))` |
| `new Field('COUNT(*)', true)`                          | `unescape('COUNT(*)')`                                                                         |
| `.where('"users"."id"', 1)` on mysql / sqlite          | `.where('users.id', 1)`                                                                        |
| `let f = unescape('COUNT(*)'); f = column_ref('u.id')` | `let f: FieldPort = unescape('COUNT(*)'); f = column_ref('u.id')`                              |

The string forms still work in 1.8 and are deprecated.
If you implement `SQLBuilderPort` yourself, add the `select(RawSQLPort)` overload and the join overloads that take `SQLBuilderConditionsPort | RawSQLPort`.
See [CHANGELOG.md](./CHANGELOG.md) for the full list.

## Documentation

Document is [here](https://rymizuki.github.io/coral-sql-js/).
