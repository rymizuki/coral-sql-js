---
'coral-sql': minor
---

select() に unescape() を渡せるようにした。文字列の select() は非推奨で、次のメジャーバージョンで unescape() が必須になる。
new Field(x, true)（unescape フラグを渡す 2 引数形）は非推奨にした。生 SQL は unescape() で作る。
join / leftJoin の ON 条件は createConditions() か unescape() 以外を渡すと Error を投げる。空白だけの unescape() も Error になる。
SQLBuilderJoinDirection を型として公開した。
SQLBuilderPort を自前で実装している場合は、select に RawSQLPort を受け取る overload の実装が必要。
