---
'coral-sql': patch
---

sqlite で json_array_aggregate() が json_group_array() を出力するようにした（以前は JSON_ARRAYAGG を出力して実行できなかった）。#45
