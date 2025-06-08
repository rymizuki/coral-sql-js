import { expect } from 'chai'
import {
  createConditions,
  is_null,
  SQLBuilder,
  SQLBuilderPort,
  unescape
} from '../../dist'

describe('builder', () => {
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
        const conditions = createConditions().and('age', 10).or('age', '<=', 20)
        const [sql, bindings] = builder.from('users').where(conditions).toSQL()
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
