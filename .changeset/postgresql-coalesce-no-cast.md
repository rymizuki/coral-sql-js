---
'coral-sql': patch
---

postgresql の coalesce() で '[]' / '{}' に ::json を付けないようにした。型は COALESCE の他の引数から決まるので jsonb 列にも使える（以前は COALESCE could not convert type json to jsonb で失敗した）。#46
