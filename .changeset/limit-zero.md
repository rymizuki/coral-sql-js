---
'coral-sql': patch
---

limit(0) を指定したときに LIMIT 0 を出力するようにした（以前は句が消え、全件を返した）。offset(0) は結果が変わらないので、これまでどおり出力しない（limit なしの OFFSET 0 は sqlite / mysql で構文エラーになるため）。#49
