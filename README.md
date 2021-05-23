# coral-sql

[![CI](https://github.com/rymizuki/coral-sql-js/actions/workflows/main.yml/badge.svg)](https://github.com/rymizuki/coral-sql-js/actions/workflows/main.yml)

The nodejs module for building SQL by complec and related like coral.

## Installation

```shell:npm

```

```shell:yarn

```

## Usage

```ts
import { createBuilder } from 'coral-sql'

const [sql, bindings] = createBuilder()
  .columns('age')
  .columns(unescape('COUNT(*)'), 'value')
  .from('users')
  .where('enabled', true)
  .groupBy('age')
  .having('value', '>=', 10)
  .orderBy('value', 'desc')
  .toSQL()

const query = await connection.query(sql, bindings)
// SELECT `age`, COUNT(*) AS `value` FROM `users` WHERE `enabled` = ? GROUP BY `age` HAVING `value` >= ? ORDER BY `value` DESC
// [1, 10]
```
