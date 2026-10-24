# coral-sql

## 1.8.1

### Patch Changes

- 92ee993: limit(0) を指定したときに LIMIT 0 を出力するようにした（以前は句が消え、全件を返した）。offset(0) は結果が変わらないので、これまでどおり出力しない（limit なしの OFFSET 0 は sqlite / mysql で構文エラーになるため）。#49
- 92ee993: postgresql の coalesce() で、列や式（json_agg など）と組み合わせた '[]' / '{}' に ::json を付けないようにした。型が他の引数から決まるので jsonb 列にも使える（以前は COALESCE could not convert type json to jsonb で失敗した）。#46

  他の引数が値だけのときは、これまでどおり ::json を付ける。unescape() で書いた生 SQL（unescape('NULL') など）と組み合わせると型は付かないので、json として扱うには生 SQL 側でキャストする。

- 92ee993: sqlite で json_array_aggregate() が json_group_array() を出力するようにした（以前は JSON_ARRAYAGG を出力して実行できなかった）。#45

## 1.8.0

### Minor Changes

- a550521: join / leftJoin の ON 条件に createConditions() と unescape() を渡せるようにした。unescape() の戻り値の型を RawSQLPort（FieldPort の部分型）にした。ON 条件に渡せるのは createConditions() か unescape() で、column_ref() は条件の右辺に置く。値はバインドされ、識別子はエスケープされる。
  SQLBuilderPort を自前で実装している場合は、ON 条件に Conditions / RawSQLPort を受け取る overload の実装が必要。
  空の条件（空の createConditions() や unescape('')）を渡すと Error を投げる。
  ON 条件に column_ref() や Field を渡すと Error を投げる。
  unescape() の戻り値を受けた変数へ column_ref() や Field を再代入している場合は、型注釈を FieldPort に広げる必要がある。
  FieldPort を型として公開した（unescape() / column_ref() の戻り値や Field を受ける型を利用側で書けるようにするため）。
  文字列の ON 条件は非推奨で、次のメジャーバージョンで unescape() が必須になる。
- c802214: 識別子をクォートせずに出力する条件を絞った。quote: null を除き、設定されたクォート文字で全体が囲まれ、中に同じクォート文字とバックスラッシュを含まない断片だけをそのまま出力する。既定（mysql / sqlite の `` ` ``、postgresql の `"`）では、`'x'` と、mysql / sqlite の `"x"` はクォートし直される。
  以前は素通しされ、文字列リテラルとして評価されて where("'name'", 'name') のような条件を恒真にできた（外部入力からフィールド名を組む場合に絞り込みを迂回される）。
  移行: クォートせずに users.id と渡すか、自分の driver のクォート文字でクォートして渡す。
- 91aac08: select() に unescape() を渡せるようにした。文字列の select() は非推奨で、次のメジャーバージョンで unescape() が必須になる。
  new Field(x, true)（unescape フラグを渡す 2 引数形）は非推奨にした。生 SQL は unescape() で作る。
  join / leftJoin の ON 条件に、文字列・createConditions()・unescape() 以外（exists() などの式）を渡すと Error を投げる。空白だけの unescape() も Error になる。
  SQLBuilderJoinDirection を型として公開した。
  SQLBuilderPort を自前で実装している場合は、select に RawSQLPort を受け取る overload の実装が必要。

## 1.7.0

### Minor Changes

- 8371de6: 識別子（列名・テーブル名・別名）のエスケープを厳格にした。

  - 識別子に含まれるクォート文字を二重化する（mysql / sqlite では `` ` `` → ` `` `、postgresql では `"` → `""`）。外部入力由来の識別子でクォートを閉じて SQL を差し込めなくなる。`quote: null` を指定した場合は従来どおりエスケープしないので、この保護は効かない
  - そのまま出力する「クォート済みの断片」を、`.` で区切った断片全体が `"x"` / `'x'`（クォートが `` ` `` のときは `` `x` `` も）で囲まれ、中に同じクォート文字とバックスラッシュを含まないものに限った。`` `t`x `` のような部分的なクォートは、断片全体をクォートし直す。postgresql では `` `x` `` も素通ししない
  - 二重化済みのクォート文字を含む識別子（`` `a``b` `` / `"a""b"`）は素通しせず、もう一度二重化する。エスケープ済みの値を渡していた場合は、エスケープ前の値（`` a`b `` / `a"b`）を渡すこと
  - case_when の when() に渡すフィールドを、column() / where() と同じ規則でエスケープする。`` `users`.id `` や `"users"."id"` のようなクォート済みの断片が二重にクォートされていた不具合を直した

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
