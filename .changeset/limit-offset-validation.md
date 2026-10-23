---
'coral-sql': patch
---

limit() / offset() に 0 以上の安全な整数以外を渡すと例外を投げるようにした（SQL injection 対策）
