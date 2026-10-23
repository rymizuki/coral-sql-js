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

## Documentation

Document is [here](https://rymizuki.github.io/coral-sql-js/).
