---
'coral-sql': minor
---

join / leftJoin の ON 条件に createConditions() と unescape() を渡せるようにした。unescape() の戻り値の型を RawSQLPort（FieldPort の部分型）にした。ON 条件に渡せるのは createConditions() か unescape() で、column_ref() は条件の右辺に置く。値はバインドされ、識別子はエスケープされる。
SQLBuilderPort を自前で実装している場合は、ON 条件に Conditions / RawSQLPort を受け取る overload の実装が必要。
空の条件（空の createConditions() や unescape('')）を渡すと Error を投げる。
ON 条件に column_ref() や Field を渡すと Error を投げる。
unescape() の戻り値を受けた変数へ column_ref() や Field を再代入している場合は、型注釈を FieldPort に広げる必要がある。
FieldPort を型として公開した（unescape() / column_ref() の戻り値や Field を受ける型を利用側で書けるようにするため）。
文字列の ON 条件は非推奨で、次のメジャーバージョンで unescape() が必須になる。
