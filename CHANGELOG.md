# coral-sql

## 1.6.0

### Minor Changes

- b5046e0: case_when / coalesce / json_object が、バインド値を他の条件と同じ共有の bindings に積むようにした。

  - 生成される SQL が変わる。case_when の THEN / ELSE の文字列と json_object のキーは、SQL に直接埋め込まれず、プレースホルダ（postgresql では json_object のキーが `$N::text`）になる。これらに外部入力が混ざっても SQL injection が成立しない。THEN / ELSE は有限の数値・真偽値・null だけを直接書き、それ以外（NaN・Infinity・Date を含む）はバインドする
  - case_when の when() に `in` / `not in` / `between` と配列を渡したとき、`IN ?` ではなく where() と同じ `IN (?,?)` / `BETWEEN ? AND ?` を生成する
  - 未対応の演算子を where() や case_when の when() に渡すと、SQL を組み立てる時点で `unsupported operator` の例外を投げる。型を迂回して任意の文字列を渡しても SQL に埋め込まれない
  - case_when / coalesce を WHERE で使うとバインド値が消える、postgresql で `?` と `$N` が混在する、case_when に Conditions を渡すと値が二重に積まれる、という不整合を直した
  - サブクエリや exists() を WHERE の左辺に置いて右辺に値を渡したとき、MySQL / sqlite でバインド値の順序が入れ替わっていた不具合を修正
  - `SQLBuilderConditionExpressionPort` を自前で実装している場合は、値を `options.bindings.create()` で共有の bindings に積む必要がある。`toSQL()` が戻り値で返したバインド値は、親に積み直されなくなった
  - case_when の then() / else() の型が null を受け付けるようになった（`THEN NULL` / `ELSE NULL` を生成する。実装は従来から null を扱っていた）

### Patch Changes

- 1ff0d34: limit() / offset() に 0 以上の安全な整数以外を渡すと例外を投げるようにした（SQL injection 対策）。
  数値文字列（例: クエリパラメータの '10'）を渡していた場合は Number() で変換してから渡す。

## 1.5.5

### Patch Changes

- ajust options for feature

## 1.5.4

### Patch Changes

- fix bugs

## 1.5.3

### Patch Changes

- fix export name case_when

## 1.5.2

### Patch Changes

- fix bugs

## 1.5.1

### Patch Changes

- fix bugs for case-when

## 1.5.0

### Minor Changes

- add functional-expression supports

## 1.4.5

### Patch Changes

- update features

## 1.4.4

### Patch Changes

- a few fixes

## 1.4.3

### Patch Changes

- feat: support FieldPort in condition values #14

## 1.4.2

### Patch Changes

- add supports field value with SQLBuilder instance

## 1.4.1

### Patch Changes

- fix having cant use condition

## 1.4.0

### Minor Changes

- Add support for SQLBuilder instances in leftJoin method

  - Enhanced leftJoin to accept SQLBuilder instances as table parameter
  - Improved type safety with better TypeScript support for subqueries
  - Added comprehensive test coverage for the new functionality
    EOF < /dev/null

## 1.3.0

### Minor Changes

- change placeholder

## 1.2.0

### Minor Changes

- add builder.setOptions(options)

## 1.1.2

### Patch Changes

- minimum fixes

## 1.1.1

### Patch Changes

- fix release

## 1.1.0

### Minor Changes

- add feature for escape option

## 1.0.3

### Patch Changes

- fix build

## 1.0.2

### Patch Changes

- build for esm and cjs

## 1.0.1

### Patch Changes

- fix dependencies

## 1.0.0

### Major Changes

- release 1.0.0
