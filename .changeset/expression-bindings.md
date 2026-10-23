---
'coral-sql': minor
---

case_when / coalesce / json_object が、バインド値を他の条件と同じ共有の bindings に積むようにした。

- 生成される SQL が変わる。case_when の THEN / ELSE の文字列と json_object のキーは、SQL に直接埋め込まれず、プレースホルダ（postgresql では json_object のキーが `$N::text`）になる。これらに外部入力が混ざっても SQL injection が成立しない。THEN / ELSE の数値と真偽値は従来どおり直接書かれる
- 未対応の演算子を where() や case_when の when() に渡すと、SQL を組み立てる時点で `unsupported operator` の例外を投げる。型を迂回して任意の文字列を渡しても SQL に埋め込まれない
- case_when / coalesce を WHERE で使うとバインド値が消える、postgresql で `?` と `$N` が混在する、case_when に Conditions を渡すと値が二重に積まれる、という不整合を直した
- サブクエリや exists() を WHERE の左辺に置いて右辺に値を渡したとき、MySQL / sqlite でバインド値の順序が入れ替わっていた不具合を修正
