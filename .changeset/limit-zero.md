---
'coral-sql': patch
---

limit(0) / offset(0) を指定したときに LIMIT 0 / OFFSET 0 を出力するようにした（以前は句が消え、limit(0) で全件を返した）。#49
