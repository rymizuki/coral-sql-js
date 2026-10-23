---
'coral-sql': minor
---

join / leftJoin の ON 条件に createConditions() と unescape() を渡せるようにした。列どうしを比較するときは条件の右辺に column_ref() を置く。値はバインドされ、識別子はエスケープされる。
SQLBuilderPort を自前で実装している場合は、ON 条件に Conditions / FieldPort を受け取る overload の実装が必要。
空の条件（空の createConditions() や unescape('')）を渡すと Error を投げる。
文字列の ON 条件は非推奨で、次のメジャーバージョンで unescape() が必須になる。
