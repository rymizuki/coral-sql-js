---
'coral-sql': patch
---

postgresql の coalesce() で、列や式（json_agg など）と組み合わせた '[]' / '{}' に ::json を付けないようにした。型が他の引数から決まるので jsonb 列にも使える（以前は COALESCE could not convert type json to jsonb で失敗した）。#46

他の引数が値だけのときは、これまでどおり ::json を付ける。unescape() で書いた生 SQL（unescape('NULL') など）と組み合わせると型は付かないので、json として扱うには生 SQL 側でキャストする。
