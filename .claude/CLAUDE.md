# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`coral-sql` is a dependency-free, TypeScript SQL query builder exposing a fluent API.
`createBuilder()` is the entry point; `toSQL()` returns a `[sql, bindings]` tuple that is
passed straight to a driver, e.g. `connection.query(sql, bindings)`.

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
// sql (formatted, WHERE/HAVING conditions are parenthesized):
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

The method is `.column()` (singular). Output is multi-line and WHERE/HAVING conditions are
wrapped in parentheses — see `src/specs/builder.spec.ts` for the exact expected strings.

The published npm package name is `coral-sql` (the GitHub repository is `coral-sql-js`).

## Development Commands

⚠️ **Tests import the build output, not the source.** Every spec does `from '../../dist'`
(see `src/specs/*.spec.ts`), so **you must `npm run build` before `npm test`** or you will be
testing a stale `dist/`. CI (`.github/workflows/main.yml`) runs `build` → `lint` → `test` in that order.

```bash
npm run build && npm test   # the reliable local loop — build first, always
```

- **`npm run build`** — `tsup` (`tsup.config.ts`). Emits ESM + CJS + `.d.ts` into `dist/`,
  using `tsconfig.build.json` (which excludes `src/specs/**`).
- **`npm test`** — Mocha + Chai + ts-node (`.mocharc.json`). Specs live in `src/specs/**/*.spec.ts`
  and use Chai's `expect`. There is no Jest/Vitest.
  - **Single test**: `npx mocha src/specs/<name>.spec.ts`, or add `.only()` to a `describe`/`it`.
    (Still reads the built `dist/`, so build first.)
- **`npm run lint`** — `eslint src/**/*.ts && tsc --noEmit`. Type checking is folded into lint;
  there is no separate `typecheck` script.
- **`npm run format`** — Prettier (`.prettierrc.js`: no semicolons, single quotes, no trailing commas).

Package manager: **npm** (`package-lock.json`). Node version is pinned in `.node-version` (`22.1.0`).

Releases use Changesets: `npm run changeset` to record a change, `npm run version` to bump +
regenerate CHANGELOG/lockfile, and a published GitHub Release triggers `publish.yml` → `changeset publish`.

## Architecture

The big picture lives across `src/index.ts`, `src/builder.ts`, and `src/options.ts`.

### Public contract vs. internals

`src/index.ts` is the only barrel. It re-exports:

- **Factory functions** — `createBuilder`, `createConditions`, `unescape`, `exists`/`not_exists`,
  `is_null`/`is_not_null`, `case_when`, `coalesce`, `json_object`, `json_array_aggregate`.
- **A few implementation classes** — `Field`, `Condition` (as `SQLBuilderCondition`), and
  `Conditions` (as `SQLBuilderConditions`) are part of the public surface. Most clause classes
  (`Columns`, `Table`, `Join`, `Groups`, `Orders`, …) stay private.
- **Port interfaces** (`XxxPort` types) from `src/types.ts`, the single source of truth for all
  types. A `Port` interface and its implementing class share a name minus the suffix
  (`FieldPort` ⇔ `Field`, `BindingsPort` ⇔ `Bindings`).

### SQLBuilder is a composition hub (`src/builder.ts`)

The constructor initializes one collection object per SQL clause — `Columns`, two `Conditions`
(one for WHERE, one for HAVING — the **same class is reused** for both), `Groups`, `Orders`,
`Join[]`, `Table`. Each fluent method (`column`/`from`/`join`/`where`/`having`/`groupBy`/`orderBy`)
delegates to its collection and returns `this` to chain. `toSQL()` just calls each clause's
`toSQL()`, drops the `null` sections, and `join('\n')`s them.

### Option propagation via `ensureToSQL()` (`src/options.ts`) — the crux of the design

`ensureToSQL()` normalizes `SQLBuilderToSQLInputOptions` (partial, user-facing) into a resolved
`SQLBuilderToSQLOptions`. Most `toSQL()` implementations call it first to pull out the resolved
`bindings`/`driver`/`quote`. Some pure pass-through nodes do **not** call it and just forward the
raw `options` downstream — `Table.toSQL()`, `Join.toSQL()`, and the `EXISTS`/`NOT EXISTS`
expressions (`src/builder/condition-expression.ts`) delegate straight to the subquery/`escape()`.

Crucially, a **single `bindings` instance is threaded through the whole tree via the shared
`options` object** — child components never create their own `Bindings`, they push onto
`options.bindings`. This is what keeps bind-parameter order consistent across nested subqueries
and expressions. `new Bindings` appears in exactly one place (`src/options.ts`); if
`input.bindings` already exists, `ensureToSQL()` reuses it rather than allocating a new one.

### Driver-dependent dialect differences (a common gotcha)

`driver: 'mysql' | 'postgresql' | 'sqlite'` (default `mysql`) changes generated SQL. This is
confined to two places:

- `src/options.ts`: `getDefaultPlaceholder` (postgresql → `$N` numbered, mysql/sqlite → `?`) and
  `getDefaultQuote` (postgresql → `"`, others → `` ` ``). Driver is resolved **before** placeholder
  so the placeholder default can depend on it.
- Each `ConditionExpression*.toSQL()`: `JSON_ARRAYAGG` vs `json_agg`, `JSON_OBJECT` vs
  `json_build_object`, and a `::json` cast on `coalesce('[]' | '{}')` for postgresql.

An explicit `placeholder`/`quote` in options always wins over the driver default.

### Duck-typed field normalization

A field may be a `string`, `FieldPort`, `SQLBuilderPort` (a nested builder → subquery), or
`SQLBuilderConditionExpressionPort`. Each component runs the same guard sequence from
`src/utils/type-guards.ts` and normalizes to a `FieldPort`-compatible object.

### Condition expression hierarchy (`src/builder/condition-expression.ts`)

```
Conditions (AND/OR set)
  └─ Condition (field + expr)
       └─ AbstractConditionExpression
            ├─ ConditionExpression (operators: =, in, between, like, …)
            ├─ ConditionExpressionNull / Exists / NotExists
            ├─ ConditionExpressionCoalesce
            ├─ ConditionExpressionJsonObject / JsonArrayAggregate
            └─ ConditionExpressionCaseWhen
```

`case_when` is the exception: it has its own `when()`/`then()`/`else()` fluent API, and embeds
THEN/ELSE values **directly into the SQL string** rather than as placeholders.

### Directory responsibilities

- `src/builder/` — one class per SQL clause / expression.
- `src/utils/` — thin public factory functions wrapping the `builder/` classes
  (e.g. `utils/json.ts` → `coalesce`/`json_object`/`json_array_aggregate`/`case_when`).
- `src/types.ts` — all Port interfaces and types.
- `src/specs/` — Mocha specs.

## Adding a New SQL Function

1. Add the implementation class to `src/builder/condition-expression.ts`, extending
   `AbstractConditionExpression`.
2. Add a thin public factory to the matching `src/utils/*.ts` (JSON helpers go in `utils/json.ts`).
3. Re-export it from `src/index.ts`.
4. If it needs dialect differences, branch on `options.driver` inside `toSQL()` — the existing
   JSON functions are the template.

## Known Issue: Subquery Binding Duplication

Using a `SQLBuilderPort` subquery inside `columns`/`groupBy`/`orderBy` can duplicate bindings.
Always pass the parent `options` (i.e. the same `bindings` instance) into a subquery's `toSQL()`.
`Columns.add()`'s expression branch has a workaround that manually merges the returned bindings
back into the parent.

## Debugging

- **"Missing support for operator"** — check `ConditionExpression.createOperator()` and the
  `SQLBuilderOperator` type in `src/types.ts`.
- **Binding count mismatch** — verify subquery `toSQL()` receives the parent `options.bindings`
  (see the known issue above).
