import { expect } from 'chai'
import {
  createBuilder,
  createConditions,
  is_null,
  SQLBuilder,
  SQLBuilderPort,
  unescape
} from '../../dist'

describe('builder', () => {
  describe('select() method', () => {
    describe('basic usage', () => {
      it('allows custom SELECT statement', () => {
        const [sql, bindings] = createBuilder()
          .select('SELECT COUNT(*) AS total')
          .from('users')
          .toSQL()
        expect(sql).to.be.eql('SELECT COUNT(*) AS total\nFROM\n  `users`')
        expect(bindings).to.be.eql([])
      })

      it('works with complex SELECT statements', () => {
        const [sql, bindings] = createBuilder()
          .select('SELECT DISTINCT user_id, MAX(created_at) AS last_login')
          .from('sessions')
          .toSQL()
        expect(sql).to.be.eql(
          'SELECT DISTINCT user_id, MAX(created_at) AS last_login\nFROM\n  `sessions`'
        )
        expect(bindings).to.be.eql([])
      })

      it('overrides column() calls when select() is used', () => {
        const [sql, bindings] = createBuilder()
          .column('id')
          .column('name')
          .select('SELECT COUNT(*)')
          .from('users')
          .toSQL()
        expect(sql).to.be.eql('SELECT COUNT(*)\nFROM\n  `users`')
        expect(bindings).to.be.eql([])
      })
    })

    describe('with other clauses', () => {
      it('works with WHERE clause', () => {
        const [sql, bindings] = createBuilder()
          .select('SELECT COUNT(*) AS count')
          .from('users')
          .where('active', true)
          .toSQL()
        expect(sql).to.be.eql(
          'SELECT COUNT(*) AS count\nFROM\n  `users`\nWHERE\n  (`active` = ?)'
        )
        expect(bindings).to.be.eql([1])
      })

      it('works with GROUP BY and HAVING', () => {
        const [sql, bindings] = createBuilder()
          .select('SELECT department, COUNT(*) AS emp_count')
          .from('employees')
          .groupBy('department')
          .having('emp_count', '>', 10)
          .toSQL()
        expect(sql).to.be.eql(
          'SELECT department, COUNT(*) AS emp_count\nFROM\n  `employees`\nGROUP BY\n  `department`\nHAVING\n  (`emp_count` > ?)'
        )
        expect(bindings).to.be.eql([10])
      })

      it('works with JOIN clause', () => {
        const [sql, bindings] = createBuilder()
          .select('SELECT u.name, COUNT(o.id) AS order_count')
          .from('users', 'u')
          .leftJoin('orders', 'o', 'o.user_id = u.id')
          .groupBy('u.id')
          .toSQL()
        expect(sql).to.be.eql(
          'SELECT u.name, COUNT(o.id) AS order_count\nFROM\n  `users` AS `u`\nLEFT JOIN `orders` AS `o` ON o.user_id = u.id\nGROUP BY\n  `u`.`id`'
        )
        expect(bindings).to.be.eql([])
      })

      it('works with ORDER BY and LIMIT', () => {
        const [sql, bindings] = createBuilder()
          .select('SELECT id, name, created_at')
          .from('users')
          .orderBy('created_at', 'desc')
          .limit(10)
          .toSQL()
        expect(sql).to.be.eql(
          'SELECT id, name, created_at\nFROM\n  `users`\nORDER BY\n  `created_at` DESC\nLIMIT 10'
        )
        expect(bindings).to.be.eql([])
      })
    })

    describe('with different quote options', () => {
      it('respects quote option when set to null', () => {
        const [sql, bindings] = createBuilder({ quote: null })
          .select('SELECT COUNT(*) AS total')
          .from('users')
          .toSQL()
        expect(sql).to.be.eql('SELECT COUNT(*) AS total\nFROM\n  users')
        expect(bindings).to.be.eql([])
      })

      it('respects custom quote character', () => {
        const [sql, bindings] = createBuilder({ quote: '"' })
          .select('SELECT COUNT(*) AS total')
          .from('users')
          .toSQL()
        expect(sql).to.be.eql('SELECT COUNT(*) AS total\nFROM\n  "users"')
        expect(bindings).to.be.eql([])
      })
    })
  })

  describe('no options', () => {
    let builder: SQLBuilderPort
    beforeEach(() => {
      builder = new SQLBuilder()
    })

    describe('.table', () => {
      describe('no alias', () => {
        it('"SELECT * FROM users", []', () => {
          const [sql, bindings] = builder.from('users').toSQL()
          expect(sql).to.be.eql('SELECT\n  *\nFROM\n  `users`')
          expect(bindings).to.be.eql([])
        })
      })
      describe('use alias', () => {
        it('"SELECT * FROM users AS users_1", []', () => {
          const [sql, bindings] = builder.from('users', 'users_1').toSQL()
          expect(sql).to.be.eql('SELECT\n  *\nFROM\n  `users` AS `users_1`')
          expect(bindings).to.be.eql([])
        })
      })
    })

    describe('.column', () => {
      describe('no alias', () => {
        it('"SELECT id, name FROM users", []', () => {
          const [sql, bindings] = builder
            .from('users')
            .column('id')
            .column('name')
            .toSQL()
          expect(sql).to.be.eql('SELECT\n  `id`,\n  `name`\nFROM\n  `users`')
          expect(bindings).to.be.eql([])
        })
      })
      describe('use alias', () => {
        it('"SELECT id AS id_1, name AS name_1 FROM users", []', () => {
          const [sql, bindings] = builder
            .from('users')
            .column('id', 'id_1')
            .column('name', 'name_1')
            .toSQL()
          expect(sql).to.be.eql(
            'SELECT\n  `id` AS `id_1`,\n  `name` AS `name_1`\nFROM\n  `users`'
          )
          expect(bindings).to.be.eql([])
        })
      })
    })

    describe('.leftJoin', () => {
      describe('single', () => {
        it('"SELECT * FROM users LEFT JOIN user_names ON users.id = user_names.user_id", []', () => {
          const [sql, bindings] = builder
            .from('users')
            .leftJoin('user_names', 'users.id = user_names.user_id')
            .toSQL()
          expect(sql).to.be.eql(
            'SELECT\n  *\nFROM\n  `users`\nLEFT JOIN `user_names` ON users.id = user_names.user_id'
          )
          expect(bindings).to.be.eql([])
        })
      })

      describe('multiple', () => {
        it('"SELECT * FROM users LEFT JOIN user_names ON users.id = user_names.user_id LEFT JOIN passport ON passport.id = users.passport_id", []', () => {
          const [sql, bindings] = builder
            .from('users')
            .leftJoin('user_names', 'users.id = user_names.user_id')
            .leftJoin('passport', 'passport.id = users.passport_id')
            .toSQL()
          expect(sql).to.be.eql(
            'SELECT\n  *\nFROM\n  `users`\nLEFT JOIN `user_names` ON users.id = user_names.user_id\nLEFT JOIN `passport` ON passport.id = users.passport_id'
          )
          expect(bindings).to.be.eql([])
        })
      })

      describe('use alias', () => {
        it('"SELECT * FROM users LEFT JOIN user_names ON users.id = user_names.user_id", []', () => {
          const [sql, bindings] = builder
            .from('users')
            .leftJoin('user_names', 'un', 'users.id = un.user_id')
            .toSQL()
          expect(sql).to.be.eql(
            'SELECT\n  *\nFROM\n  `users`\nLEFT JOIN `user_names` AS `un` ON users.id = un.user_id'
          )
          expect(bindings).to.be.eql([])
        })
      })
    })

    describe('.where', () => {
      describe('single', () => {
        it('"SELECT * FROM users WHERE id = ?", [1]', () => {
          const [sql, bindings] = builder.from('users').where('id', 1).toSQL()
          expect(sql).to.be.eql(
            'SELECT\n  *\nFROM\n  `users`\nWHERE\n  (`id` = ?)'
          )
          expect(bindings).to.be.eql([1])
        })
      })

      describe('multiple', () => {
        it('"SELECT * FROM users WHERE gender = ? AND age >= ?", ["male", 20]', () => {
          const [sql, bindings] = builder
            .from('users')
            .where('gender', 'male')
            .where('age', '>=', 20)
            .toSQL()
          expect(sql).to.be.eql(
            'SELECT\n  *\nFROM\n  `users`\nWHERE\n  (`gender` = ?)\n  AND (`age` >= ?)'
          )
          expect(bindings).to.be.eql(['male', 20])
        })
      })

      describe('conditions instance', () => {
        it('"SELECT * FROM users WHERE age = ? OR age <= ?", [10, 20]', () => {
          const conditions = createConditions()
            .and('age', 10)
            .or('age', '<=', 20)
          const [sql, bindings] = builder
            .from('users')
            .where(conditions)
            .toSQL()
          expect(sql).to.be.eql(
            'SELECT\n  *\nFROM\n  `users`\nWHERE\n  ((`age` = ?)\n  OR (`age` <= ?))'
          )
          expect(bindings).to.be.eql([10, 20])
        })
      })

      describe('is_null', () => {
        it('"SELECT * FROM users WHERE age IS NULL", []', () => {
          const [sql, bindings] = builder
            .from('users')
            .where('age', is_null())
            .toSQL()
          expect(sql).to.be.eql(
            'SELECT\n  *\nFROM\n  `users`\nWHERE\n  (`age` IS NULL)'
          )
          expect(bindings).to.be.eql([])
        })
      })

      describe('unescape', () => {
        it('supports unescape as condition value', () => {
          const [sql, bindings] = builder
            .from('users')
            .where('prop', unescape('a.value'))
            .toSQL()
          expect(sql).to.be.eql(
            'SELECT\n  *\nFROM\n  `users`\nWHERE\n  (`prop` = a.value)'
          )
          expect(bindings).to.be.eql([])
        })

        it('supports unescape with operators', () => {
          const [sql, bindings] = builder
            .from('users')
            .where('prop', '!=', unescape('a.value'))
            .toSQL()
          expect(sql).to.be.eql(
            'SELECT\n  *\nFROM\n  `users`\nWHERE\n  (`prop` != a.value)'
          )
          expect(bindings).to.be.eql([])
        })

        it('supports mixed regular values and unescape', () => {
          const [sql, bindings] = builder
            .from('users')
            .where('prop', unescape('a.value'))
            .where('status', 'active')
            .toSQL()
          expect(sql).to.be.eql(
            'SELECT\n  *\nFROM\n  `users`\nWHERE\n  (`prop` = a.value)\n  AND (`status` = ?)'
          )
          expect(bindings).to.be.eql(['active'])
        })
      })
    })

    describe('.groupBy', () => {
      describe('single', () => {
        it('"SELECT id FROM users GROUP BY id", []', () => {
          const [sql, bindings] = builder
            .from('users')
            .column('id')
            .groupBy('id')
            .toSQL()
          expect(sql).to.be.eql(
            'SELECT\n  `id`\nFROM\n  `users`\nGROUP BY\n  `id`'
          )
          expect(bindings).to.be.eql([])
        })
      })
      describe('multiple', () => {
        it('"SELECT id, name FROM users GROUP BY id, name", []', () => {
          const [sql, bindings] = builder
            .from('users')
            .column('id')
            .column('name')
            .groupBy('id')
            .groupBy('name')
            .toSQL()
          expect(sql).to.be.eql(
            'SELECT\n  `id`,\n  `name`\nFROM\n  `users`\nGROUP BY\n  `id`,`name`'
          )
          expect(bindings).to.be.eql([])
        })
      })
    })

    describe('.having', () => {
      it('"SELECT age, COUNT(*) AS value FROM users GROUP BY age HAVING value > ?", [10]', () => {
        const [sql, bindings] = builder
          .from('users')
          .column('age')
          .column(unescape('COUNT(*)'), 'value')
          .groupBy('age')
          .having('value', '>', 10)
          .toSQL()
        expect(sql).to.be.eql(
          'SELECT\n  `age`,\n  COUNT(*) AS `value`\nFROM\n  `users`\nGROUP BY\n  `age`\nHAVING\n  (`value` > ?)'
        )
        expect(bindings).to.be.eql([10])
      })
    })

    describe('.orderBy', () => {
      describe('single', () => {
        it('"SELECT * FROM users ORDER BY id ASC", []', () => {
          const [sql, bindings] = builder
            .from('users')
            .orderBy('id', 'asc')
            .toSQL()
          expect(sql).to.be.eql(
            'SELECT\n  *\nFROM\n  `users`\nORDER BY\n  `id` ASC'
          )
          expect(bindings).to.be.eql([])
        })
      })
      describe('multiple', () => {
        it('"SELECT * FROM users ORDER BY id ASC, age DESC", []', () => {
          const [sql, bindings] = builder
            .from('users')
            .orderBy('id', 'asc')
            .orderBy('age', 'desc')
            .toSQL()
          expect(sql).to.be.eql(
            'SELECT\n  *\nFROM\n  `users`\nORDER BY\n  `id` ASC,\n  `age` DESC'
          )
          expect(bindings).to.be.eql([])
        })
      })
    })

    describe('.limit', () => {
      it('"SELECT * FROM users LIMIT 10", []', () => {
        const [sql, bindings] = builder.from('users').limit(10).toSQL()
        expect(sql).to.be.eql('SELECT\n  *\nFROM\n  `users`\nLIMIT 10')
        expect(bindings).to.be.eql([])
      })
    })

    describe('.offset', () => {
      it('"SELECT * FROM users OFFSET 10", []', () => {
        const [sql, bindings] = builder.from('users').offset(10).toSQL()
        expect(sql).to.be.eql('SELECT\n  *\nFROM\n  `users`\nOFFSET 10')
        expect(bindings).to.be.eql([])
      })
    })
  })

  describe('options.quote = null', () => {
    let builder: SQLBuilderPort
    beforeEach(() => {
      builder = new SQLBuilder({
        quote: null
      })
    })

    describe('.table', () => {
      describe('no alias', () => {
        it('"SELECT * FROM users", []', () => {
          const [sql, bindings] = builder.from('users').toSQL()
          expect(sql).to.be.eql('SELECT\n  *\nFROM\n  users')
          expect(bindings).to.be.eql([])
        })
      })
      describe('use alias', () => {
        it('"SELECT * FROM users AS users_1", []', () => {
          const [sql, bindings] = builder.from('users', 'users_1').toSQL()
          expect(sql).to.be.eql('SELECT\n  *\nFROM\n  users AS users_1')
          expect(bindings).to.be.eql([])
        })
      })
    })

    describe('.column', () => {
      describe('no alias', () => {
        it('"SELECT id, name FROM users", []', () => {
          const [sql, bindings] = builder
            .from('users')
            .column('id')
            .column('name')
            .toSQL()
          expect(sql).to.be.eql('SELECT\n  id,\n  name\nFROM\n  users')
          expect(bindings).to.be.eql([])
        })
      })
      describe('use alias', () => {
        it('"SELECT id AS id_1, name AS name_1 FROM users", []', () => {
          const [sql, bindings] = builder
            .from('users')
            .column('id', 'id_1')
            .column('name', 'name_1')
            .toSQL()
          expect(sql).to.be.eql(
            'SELECT\n  id AS id_1,\n  name AS name_1\nFROM\n  users'
          )
          expect(bindings).to.be.eql([])
        })
      })
    })

    describe('.leftJoin', () => {
      describe('single', () => {
        it('"SELECT * FROM users LEFT JOIN user_names ON users.id = user_names.user_id", []', () => {
          const [sql, bindings] = builder
            .from('users')
            .leftJoin('user_names', 'users.id = user_names.user_id')
            .toSQL()
          expect(sql).to.be.eql(
            'SELECT\n  *\nFROM\n  users\nLEFT JOIN user_names ON users.id = user_names.user_id'
          )
          expect(bindings).to.be.eql([])
        })
      })

      describe('multiple', () => {
        it('"SELECT * FROM users LEFT JOIN user_names ON users.id = user_names.user_id LEFT JOIN passport ON passport.id = users.passport_id", []', () => {
          const [sql, bindings] = builder
            .from('users')
            .leftJoin('user_names', 'users.id = user_names.user_id')
            .leftJoin('passport', 'passport.id = users.passport_id')
            .toSQL()
          expect(sql).to.be.eql(
            'SELECT\n  *\nFROM\n  users\nLEFT JOIN user_names ON users.id = user_names.user_id\nLEFT JOIN passport ON passport.id = users.passport_id'
          )
          expect(bindings).to.be.eql([])
        })
      })

      describe('use alias', () => {
        it('"SELECT * FROM users LEFT JOIN user_names ON users.id = user_names.user_id", []', () => {
          const [sql, bindings] = builder
            .from('users')
            .leftJoin('user_names', 'un', 'users.id = un.user_id')
            .toSQL()
          expect(sql).to.be.eql(
            'SELECT\n  *\nFROM\n  users\nLEFT JOIN user_names AS un ON users.id = un.user_id'
          )
          expect(bindings).to.be.eql([])
        })
      })
    })

    describe('.where', () => {
      describe('single', () => {
        it('"SELECT * FROM users WHERE id = ?", [1]', () => {
          const [sql, bindings] = builder.from('users').where('id', 1).toSQL()
          expect(sql).to.be.eql('SELECT\n  *\nFROM\n  users\nWHERE\n  (id = ?)')
          expect(bindings).to.be.eql([1])
        })
      })

      describe('multiple', () => {
        it('"SELECT * FROM users WHERE gender = ? AND age >= ?", ["male", 20]', () => {
          const [sql, bindings] = builder
            .from('users')
            .where('gender', 'male')
            .where('age', '>=', 20)
            .toSQL()
          expect(sql).to.be.eql(
            'SELECT\n  *\nFROM\n  users\nWHERE\n  (gender = ?)\n  AND (age >= ?)'
          )
          expect(bindings).to.be.eql(['male', 20])
        })
      })

      describe('conditions instance', () => {
        it('"SELECT * FROM users WHERE age = ? OR age <= ?", [10, 20]', () => {
          const conditions = createConditions()
            .and('age', 10)
            .or('age', '<=', 20)
          const [sql, bindings] = builder
            .from('users')
            .where(conditions)
            .toSQL()
          expect(sql).to.be.eql(
            'SELECT\n  *\nFROM\n  users\nWHERE\n  ((age = ?)\n  OR (age <= ?))'
          )
          expect(bindings).to.be.eql([10, 20])
        })
      })

      describe('is_null', () => {
        it('"SELECT * FROM users WHERE age IS NULL", []', () => {
          const [sql, bindings] = builder
            .from('users')
            .where('age', is_null())
            .toSQL()
          expect(sql).to.be.eql(
            'SELECT\n  *\nFROM\n  users\nWHERE\n  (age IS NULL)'
          )
          expect(bindings).to.be.eql([])
        })
      })

      describe('unescape', () => {
        it('supports unescape as condition value', () => {
          const [sql, bindings] = builder
            .from('users')
            .where('prop', unescape('a.value'))
            .toSQL()
          expect(sql).to.be.eql(
            'SELECT\n  *\nFROM\n  users\nWHERE\n  (prop = a.value)'
          )
          expect(bindings).to.be.eql([])
        })

        it('supports unescape with operators', () => {
          const [sql, bindings] = builder
            .from('users')
            .where('prop', '!=', unescape('a.value'))
            .toSQL()
          expect(sql).to.be.eql(
            'SELECT\n  *\nFROM\n  users\nWHERE\n  (prop != a.value)'
          )
          expect(bindings).to.be.eql([])
        })

        it('supports mixed regular values and unescape', () => {
          const [sql, bindings] = builder
            .from('users')
            .where('prop', unescape('a.value'))
            .where('status', 'active')
            .toSQL()
          expect(sql).to.be.eql(
            'SELECT\n  *\nFROM\n  users\nWHERE\n  (prop = a.value)\n  AND (status = ?)'
          )
          expect(bindings).to.be.eql(['active'])
        })
      })
    })

    describe('.groupBy', () => {
      describe('single', () => {
        it('"SELECT id FROM users GROUP BY id", []', () => {
          const [sql, bindings] = builder
            .from('users')
            .column('id')
            .groupBy('id')
            .toSQL()
          expect(sql).to.be.eql('SELECT\n  id\nFROM\n  users\nGROUP BY\n  id')
          expect(bindings).to.be.eql([])
        })
      })
      describe('multiple', () => {
        it('"SELECT id, name FROM users GROUP BY id, name", []', () => {
          const [sql, bindings] = builder
            .from('users')
            .column('id')
            .column('name')
            .groupBy('id')
            .groupBy('name')
            .toSQL()
          expect(sql).to.be.eql(
            'SELECT\n  id,\n  name\nFROM\n  users\nGROUP BY\n  id,name'
          )
          expect(bindings).to.be.eql([])
        })
      })
    })

    describe('.having', () => {
      it('"SELECT age, COUNT(*) AS value FROM users GROUP BY age HAVING value > ?", [10]', () => {
        const [sql, bindings] = builder
          .from('users')
          .column('age')
          .column(unescape('COUNT(*)'), 'value')
          .groupBy('age')
          .having('value', '>', 10)
          .toSQL()
        expect(sql).to.be.eql(
          'SELECT\n  age,\n  COUNT(*) AS value\nFROM\n  users\nGROUP BY\n  age\nHAVING\n  (value > ?)'
        )
        expect(bindings).to.be.eql([10])
      })

      describe('conditions instance', () => {
        it('"SELECT age, COUNT(*) AS value FROM users GROUP BY age HAVING value > ? OR value < ?", [10, 2]', () => {
          const conditions = createConditions()
            .and('value', '>', 10)
            .or('value', '<', 2)
          const [sql, bindings] = builder
            .from('users')
            .column('age')
            .column(unescape('COUNT(*)'), 'value')
            .groupBy('age')
            .having(conditions)
            .toSQL()
          expect(sql).to.be.eql(
            'SELECT\n  age,\n  COUNT(*) AS value\nFROM\n  users\nGROUP BY\n  age\nHAVING\n  ((value > ?)\n  OR (value < ?))'
          )
          expect(bindings).to.be.eql([10, 2])
        })
      })
    })

    describe('.orderBy', () => {
      describe('single', () => {
        it('"SELECT * FROM users ORDER BY id ASC", []', () => {
          const [sql, bindings] = builder
            .from('users')
            .orderBy('id', 'asc')
            .toSQL()
          expect(sql).to.be.eql(
            'SELECT\n  *\nFROM\n  users\nORDER BY\n  id ASC'
          )
          expect(bindings).to.be.eql([])
        })
      })
      describe('multiple', () => {
        it('"SELECT * FROM users ORDER BY id ASC, age DESC", []', () => {
          const [sql, bindings] = builder
            .from('users')
            .orderBy('id', 'asc')
            .orderBy('age', 'desc')
            .toSQL()
          expect(sql).to.be.eql(
            'SELECT\n  *\nFROM\n  users\nORDER BY\n  id ASC,\n  age DESC'
          )
          expect(bindings).to.be.eql([])
        })
      })
    })

    describe('.limit', () => {
      it('"SELECT * FROM users LIMIT 10", []', () => {
        const [sql, bindings] = builder.from('users').limit(10).toSQL()
        expect(sql).to.be.eql('SELECT\n  *\nFROM\n  users\nLIMIT 10')
        expect(bindings).to.be.eql([])
      })
    })

    describe('.offset', () => {
      it('"SELECT * FROM users OFFSET 10", []', () => {
        const [sql, bindings] = builder.from('users').offset(10).toSQL()
        expect(sql).to.be.eql('SELECT\n  *\nFROM\n  users\nOFFSET 10')
        expect(bindings).to.be.eql([])
      })
    })
  })

  describe('options.placeholder = $', () => {
    let builder: SQLBuilderPort
    beforeEach(() => {
      builder = new SQLBuilder({ placeholder: '$' })
    })

    describe('.table', () => {
      describe('no alias', () => {
        it('"SELECT * FROM users", []', () => {
          const [sql, bindings] = builder.from('users').toSQL()
          expect(sql).to.be.eql('SELECT\n  *\nFROM\n  `users`')
          expect(bindings).to.be.eql([])
        })
      })
      describe('use alias', () => {
        it('"SELECT * FROM users AS users_1", []', () => {
          const [sql, bindings] = builder.from('users', 'users_1').toSQL()
          expect(sql).to.be.eql('SELECT\n  *\nFROM\n  `users` AS `users_1`')
          expect(bindings).to.be.eql([])
        })
      })
    })

    describe('.column', () => {
      describe('no alias', () => {
        it('"SELECT id, name FROM users", []', () => {
          const [sql, bindings] = builder
            .from('users')
            .column('id')
            .column('name')
            .toSQL()
          expect(sql).to.be.eql('SELECT\n  `id`,\n  `name`\nFROM\n  `users`')
          expect(bindings).to.be.eql([])
        })
      })
      describe('use alias', () => {
        it('"SELECT id AS id_1, name AS name_1 FROM users", []', () => {
          const [sql, bindings] = builder
            .from('users')
            .column('id', 'id_1')
            .column('name', 'name_1')
            .toSQL()
          expect(sql).to.be.eql(
            'SELECT\n  `id` AS `id_1`,\n  `name` AS `name_1`\nFROM\n  `users`'
          )
          expect(bindings).to.be.eql([])
        })
      })
    })

    describe('.leftJoin', () => {
      describe('single', () => {
        it('"SELECT * FROM users LEFT JOIN user_names ON users.id = user_names.user_id", []', () => {
          const [sql, bindings] = builder
            .from('users')
            .leftJoin('user_names', 'users.id = user_names.user_id')
            .toSQL()
          expect(sql).to.be.eql(
            'SELECT\n  *\nFROM\n  `users`\nLEFT JOIN `user_names` ON users.id = user_names.user_id'
          )
          expect(bindings).to.be.eql([])
        })
      })

      describe('multiple', () => {
        it('"SELECT * FROM users LEFT JOIN user_names ON users.id = user_names.user_id LEFT JOIN passport ON passport.id = users.passport_id", []', () => {
          const [sql, bindings] = builder
            .from('users')
            .leftJoin('user_names', 'users.id = user_names.user_id')
            .leftJoin('passport', 'passport.id = users.passport_id')
            .toSQL()
          expect(sql).to.be.eql(
            'SELECT\n  *\nFROM\n  `users`\nLEFT JOIN `user_names` ON users.id = user_names.user_id\nLEFT JOIN `passport` ON passport.id = users.passport_id'
          )
          expect(bindings).to.be.eql([])
        })
      })

      describe('use alias', () => {
        it('"SELECT * FROM users LEFT JOIN user_names ON users.id = user_names.user_id", []', () => {
          const [sql, bindings] = builder
            .from('users')
            .leftJoin('user_names', 'un', 'users.id = un.user_id')
            .toSQL()
          expect(sql).to.be.eql(
            'SELECT\n  *\nFROM\n  `users`\nLEFT JOIN `user_names` AS `un` ON users.id = un.user_id'
          )
          expect(bindings).to.be.eql([])
        })
      })
    })

    describe('.where', () => {
      describe('single', () => {
        it('"SELECT * FROM users WHERE id = $1", [1]', () => {
          const [sql, bindings] = builder.from('users').where('id', 1).toSQL()
          expect(sql).to.be.eql(
            'SELECT\n  *\nFROM\n  `users`\nWHERE\n  (`id` = $1)'
          )
          expect(bindings).to.be.eql([1])
        })
      })

      describe('multiple', () => {
        it('"SELECT * FROM users WHERE gender = $1 AND age >= $2", ["male", 20]', () => {
          const [sql, bindings] = builder
            .from('users')
            .where('gender', 'male')
            .where('age', '>=', 20)
            .toSQL()
          expect(sql).to.be.eql(
            'SELECT\n  *\nFROM\n  `users`\nWHERE\n  (`gender` = $1)\n  AND (`age` >= $2)'
          )
          expect(bindings).to.be.eql(['male', 20])
        })
      })

      describe('conditions instance', () => {
        it('"SELECT * FROM users WHERE age = $1 OR age <= $2", [10, 20]', () => {
          const conditions = createConditions()
            .and('age', 10)
            .or('age', '<=', 20)
          const [sql, bindings] = builder
            .from('users')
            .where(conditions)
            .toSQL()
          expect(sql).to.be.eql(
            'SELECT\n  *\nFROM\n  `users`\nWHERE\n  ((`age` = $1)\n  OR (`age` <= $2))'
          )
          expect(bindings).to.be.eql([10, 20])
        })
      })

      describe('is_null', () => {
        it('"SELECT * FROM users WHERE age IS NULL", []', () => {
          const [sql, bindings] = builder
            .from('users')
            .where('age', is_null())
            .toSQL()
          expect(sql).to.be.eql(
            'SELECT\n  *\nFROM\n  `users`\nWHERE\n  (`age` IS NULL)'
          )
          expect(bindings).to.be.eql([])
        })
      })
    })

    describe('.groupBy', () => {
      describe('single', () => {
        it('"SELECT id FROM users GROUP BY id", []', () => {
          const [sql, bindings] = builder
            .from('users')
            .column('id')
            .groupBy('id')
            .toSQL()
          expect(sql).to.be.eql(
            'SELECT\n  `id`\nFROM\n  `users`\nGROUP BY\n  `id`'
          )
          expect(bindings).to.be.eql([])
        })
      })
      describe('multiple', () => {
        it('"SELECT id, name FROM users GROUP BY id, name", []', () => {
          const [sql, bindings] = builder
            .from('users')
            .column('id')
            .column('name')
            .groupBy('id')
            .groupBy('name')
            .toSQL()
          expect(sql).to.be.eql(
            'SELECT\n  `id`,\n  `name`\nFROM\n  `users`\nGROUP BY\n  `id`,`name`'
          )
          expect(bindings).to.be.eql([])
        })
      })
    })

    describe('.having', () => {
      it('"SELECT age, COUNT(*) AS value FROM users GROUP BY age HAVING value > $1", [10]', () => {
        const [sql, bindings] = builder
          .from('users')
          .column('age')
          .column(unescape('COUNT(*)'), 'value')
          .groupBy('age')
          .having('value', '>', 10)
          .toSQL()
        expect(sql).to.be.eql(
          'SELECT\n  `age`,\n  COUNT(*) AS `value`\nFROM\n  `users`\nGROUP BY\n  `age`\nHAVING\n  (`value` > $1)'
        )
        expect(bindings).to.be.eql([10])
      })
    })

    describe('.orderBy', () => {
      describe('single', () => {
        it('"SELECT * FROM users ORDER BY id ASC", []', () => {
          const [sql, bindings] = builder
            .from('users')
            .orderBy('id', 'asc')
            .toSQL()
          expect(sql).to.be.eql(
            'SELECT\n  *\nFROM\n  `users`\nORDER BY\n  `id` ASC'
          )
          expect(bindings).to.be.eql([])
        })
      })
      describe('multiple', () => {
        it('"SELECT * FROM users ORDER BY id ASC, age DESC", []', () => {
          const [sql, bindings] = builder
            .from('users')
            .orderBy('id', 'asc')
            .orderBy('age', 'desc')
            .toSQL()
          expect(sql).to.be.eql(
            'SELECT\n  *\nFROM\n  `users`\nORDER BY\n  `id` ASC,\n  `age` DESC'
          )
          expect(bindings).to.be.eql([])
        })
      })
    })

    describe('.limit', () => {
      it('"SELECT * FROM users LIMIT 10", []', () => {
        const [sql, bindings] = builder.from('users').limit(10).toSQL()
        expect(sql).to.be.eql('SELECT\n  *\nFROM\n  `users`\nLIMIT 10')
        expect(bindings).to.be.eql([])
      })
    })

    describe('.offset', () => {
      it('"SELECT * FROM users OFFSET 10", []', () => {
        const [sql, bindings] = builder.from('users').offset(10).toSQL()
        expect(sql).to.be.eql('SELECT\n  *\nFROM\n  `users`\nOFFSET 10')
        expect(bindings).to.be.eql([])
      })
    })
  })
})
