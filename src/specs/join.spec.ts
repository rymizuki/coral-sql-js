import { expect } from 'chai'
import {
  case_when,
  column_ref,
  createBuilder,
  createConditions,
  Field,
  unescape
} from '../../dist'

describe('join conditions', () => {
  describe('createConditions with column_ref', () => {
    const build = (options?: { driver: 'postgresql' }) =>
      createBuilder(options)
        .from('users', 'u')
        .leftJoin(
          'passport',
          'p',
          createConditions()
            .and('p.id', '=', column_ref('u.passport_id'))
            .and('p.deleted', 0)
        )
        .where('u.id', 1)
        .toSQL()

    it('escapes identifiers and binds JOIN values before WHERE values (mysql)', () => {
      const [sql, bindings] = build()
      expect(sql).to.be.eql(
        'SELECT\n  *\nFROM\n  `users` AS `u`\nLEFT JOIN `passport` AS `p` ON (`p`.`id` = `u`.`passport_id`)\n  AND (`p`.`deleted` = ?)\nWHERE\n  (`u`.`id` = ?)'
      )
      expect(bindings).to.be.eql([0, 1])
    })

    it('numbers placeholders in order with postgresql', () => {
      const [sql, bindings] = build({ driver: 'postgresql' })
      expect(sql).to.be.eql(
        'SELECT\n  *\nFROM\n  "users" AS "u"\nLEFT JOIN "passport" AS "p" ON ("p"."id" = "u"."passport_id")\n  AND ("p"."deleted" = $1)\nWHERE\n  ("u"."id" = $2)'
      )
      expect(bindings).to.be.eql([0, 1])
    })

    it('binds subquery values, then ON values, then WHERE values', () => {
      const [sql, bindings] = createBuilder()
        .from('users', 'u')
        .leftJoin(
          createBuilder().from('logs').where('kind', 'a'),
          'l',
          createConditions()
            .and('l.user_id', column_ref('u.id'))
            .and('l.level', 3)
        )
        .where('u.id', 1)
        .toSQL()
      expect(sql).to.be.eql(
        'SELECT\n  *\nFROM\n  `users` AS `u`\nLEFT JOIN (SELECT\n  *\nFROM\n  `logs`\nWHERE\n  (`kind` = ?)) AS `l` ON (`l`.`user_id` = `u`.`id`)\n  AND (`l`.`level` = ?)\nWHERE\n  (`u`.`id` = ?)'
      )
      expect(bindings).to.be.eql(['a', 3, 1])
    })

    it('throws when the conditions are empty', () => {
      expect(() =>
        createBuilder()
          .from('users', 'u')
          .leftJoin('passport', 'p', createConditions())
          .toSQL()
      ).to.throw('coral-sql join requires a non-empty condition')
    })
  })

  describe('unescape() condition', () => {
    it('returns a Field instance', () => {
      expect(unescape('x')).to.be.instanceOf(Field)
    })

    it('writes unescape() as raw SQL', () => {
      const [sql, bindings] = createBuilder()
        .from('users', 'u')
        .leftJoin('passport', 'p', unescape('p.id = u.passport_id'))
        .toSQL()
      expect(sql).to.be.eql(
        'SELECT\n  *\nFROM\n  `users` AS `u`\nLEFT JOIN `passport` AS `p` ON p.id = u.passport_id'
      )
      expect(bindings).to.be.eql([])
    })
  })

  describe('string condition (deprecated)', () => {
    it('keeps the 2 argument form output', () => {
      const [sql, bindings] = createBuilder()
        .from('users')
        .leftJoin('passport', 'passport.id = users.passport_id')
        .toSQL()
      expect(sql).to.be.eql(
        'SELECT\n  *\nFROM\n  `users`\nLEFT JOIN `passport` ON passport.id = users.passport_id'
      )
      expect(bindings).to.be.eql([])
    })

    it('keeps the 3 argument form output', () => {
      const [sql, bindings] = createBuilder()
        .from('users', 'u')
        .leftJoin('passport', 'p', 'p.id = u.passport_id')
        .toSQL()
      expect(sql).to.be.eql(
        'SELECT\n  *\nFROM\n  `users` AS `u`\nLEFT JOIN `passport` AS `p` ON p.id = u.passport_id'
      )
      expect(bindings).to.be.eql([])
    })
  })

  describe('column_ref', () => {
    it('is escaped as an identifier when used as a where value', () => {
      const [sql, bindings] = createBuilder()
        .from('t')
        .where('x', column_ref('a.b'))
        .toSQL()
      expect(sql).to.be.eql(
        'SELECT\n  *\nFROM\n  `t`\nWHERE\n  (`x` = `a`.`b`)'
      )
      expect(bindings).to.be.eql([])
    })
  })
  describe('multiple joins with values', () => {
    const build = (driver: 'mysql' | 'postgresql') =>
      createBuilder({ driver })
        .column(case_when().when('a', 1).then('hit'), 'v')
        .from('users', 'u')
        .join(
          'left',
          't1',
          'x',
          createConditions().and('x.k', 'k1').and('x.id', column_ref('u.id'))
        )
        .join('inner', 't2', 'y', createConditions().and('y.k', 'k2'))
        .where('u.w', 'w1')
        .groupBy('u.id')
        .having('v', '>=', 9)
        .toSQL()

    it('orders bindings as SELECT, JOIN1, JOIN2, WHERE, HAVING (mysql)', () => {
      const [sql, bindings] = build('mysql')
      expect(sql).to.be.eql(
        'SELECT\n  (CASE WHEN `a` = ? THEN ? END) AS `v`\nFROM\n  `users` AS `u`\nLEFT JOIN `t1` AS `x` ON (`x`.`k` = ?)\n  AND (`x`.`id` = `u`.`id`)\nINNER JOIN `t2` AS `y` ON (`y`.`k` = ?)\nWHERE\n  (`u`.`w` = ?)\nGROUP BY\n  `u`.`id`\nHAVING\n  (`v` >= ?)'
      )
      expect(bindings).to.be.eql([1, 'hit', 'k1', 'k2', 'w1', 9])
    })

    it('numbers postgresql placeholders in the same order', () => {
      const [sql, bindings] = build('postgresql')
      expect(sql).to.be.eql(
        'SELECT\n  (CASE WHEN "a" = $1 THEN $2 END) AS "v"\nFROM\n  "users" AS "u"\nLEFT JOIN "t1" AS "x" ON ("x"."k" = $3)\n  AND ("x"."id" = "u"."id")\nINNER JOIN "t2" AS "y" ON ("y"."k" = $4)\nWHERE\n  ("u"."w" = $5)\nGROUP BY\n  "u"."id"\nHAVING\n  ("v" >= $6)'
      )
      expect(bindings).to.be.eql([1, 'hit', 'k1', 'k2', 'w1', 9])
    })
  })

  describe('join argument forms', () => {
    it('accepts Conditions in the 2 argument form of join(direction, table, condition)', () => {
      const [sql, bindings] = createBuilder()
        .from('u')
        .join('inner', 't', createConditions().and('t.id', column_ref('u.id')))
        .toSQL()
      expect(sql).to.be.eql(
        'SELECT\n  *\nFROM\n  `u`\nINNER JOIN `t` ON (`t`.`id` = `u`.`id`)'
      )
      expect(bindings).to.be.eql([])
    })

    it('accepts Conditions when direction is null', () => {
      const [sql, bindings] = createBuilder()
        .from('u')
        .join(null, 't', createConditions().and('t.id', column_ref('u.id')))
        .toSQL()
      expect(sql).to.be.eql(
        'SELECT\n  *\nFROM\n  `u`\n JOIN `t` ON (`t`.`id` = `u`.`id`)'
      )
      expect(bindings).to.be.eql([])
    })

    it('accepts unescape() with an alias', () => {
      const [sql] = createBuilder()
        .from('u')
        .join('inner', 't', 'x', unescape('1=1'))
        .toSQL()
      expect(sql).to.be.eql(
        'SELECT\n  *\nFROM\n  `u`\nINNER JOIN `t` AS `x` ON 1=1'
      )
    })
    it('accepts Conditions with direction and an alias', () => {
      const [sql, bindings] = createBuilder()
        .from('u')
        .join(
          'inner',
          't',
          'x',
          createConditions().and('x.id', column_ref('u.id')).and('x.n', 1)
        )
        .toSQL()
      expect(sql).to.be.eql(
        'SELECT\n  *\nFROM\n  `u`\nINNER JOIN `t` AS `x` ON (`x`.`id` = `u`.`id`)\n  AND (`x`.`n` = ?)'
      )
      expect(bindings).to.be.eql([1])
    })

    it('accepts Conditions in the 2 argument form of leftJoin(table, condition)', () => {
      const [sql, bindings] = createBuilder()
        .from('u')
        .leftJoin('t', createConditions().and('t.id', column_ref('u.id')))
        .toSQL()
      expect(sql).to.be.eql(
        'SELECT\n  *\nFROM\n  `u`\nLEFT JOIN `t` ON (`t`.`id` = `u`.`id`)'
      )
      expect(bindings).to.be.eql([])
    })

    it('numbers postgresql placeholders as subquery, ON, then WHERE', () => {
      const [sql, bindings] = createBuilder({ driver: 'postgresql' })
        .from('users', 'u')
        .leftJoin(
          createBuilder({ driver: 'postgresql' })
            .from('logs')
            .where('kind', 'a'),
          'l',
          createConditions().and('l.level', 3)
        )
        .where('u.id', 1)
        .toSQL()
      expect(sql).to.be.eql(
        'SELECT\n  *\nFROM\n  "users" AS "u"\nLEFT JOIN (SELECT\n  *\nFROM\n  "logs"\nWHERE\n  ("kind" = $1)) AS "l" ON ("l"."level" = $2)\nWHERE\n  ("u"."id" = $3)'
      )
      expect(bindings).to.be.eql(['a', 3, 1])
    })

    it('throws when unescape() is empty', () => {
      expect(() =>
        createBuilder().from('u').join('inner', 't', 'x', unescape('')).toSQL()
      ).to.throw('coral-sql join requires a non-empty condition')
    })
  })

  describe('nested and OR conditions', () => {
    it('writes or() as an OR line', () => {
      const [sql, bindings] = createBuilder()
        .from('u')
        .join(
          'inner',
          't',
          createConditions().and('t.id', column_ref('u.id')).or('t.f', 1)
        )
        .toSQL()
      expect(sql).to.be.eql(
        'SELECT\n  *\nFROM\n  `u`\nINNER JOIN `t` ON (`t`.`id` = `u`.`id`)\n  OR (`t`.`f` = ?)'
      )
      expect(bindings).to.be.eql([1])
    })

    it('writes a nested createConditions() as a group and binds its values in order', () => {
      const [sql, bindings] = createBuilder()
        .from('u')
        .join(
          'inner',
          't',
          createConditions()
            .and('t.id', column_ref('u.id'))
            .and(createConditions().and('t.a', 1).or('t.b', 2))
        )
        .toSQL()
      expect(sql).to.be.eql(
        'SELECT\n  *\nFROM\n  `u`\nINNER JOIN `t` ON (`t`.`id` = `u`.`id`)\n  AND ((`t`.`a` = ?)\n  OR (`t`.`b` = ?))'
      )
      expect(bindings).to.be.eql([1, 2])
    })
  })

  describe('identifiers containing the quote character', () => {
    it('doubles backticks in both the column and the column_ref (mysql)', () => {
      const [sql] = createBuilder()
        .from('u')
        .join('inner', 't', createConditions().and('a`b', column_ref('c`d')))
        .toSQL()
      expect(sql).to.be.eql(
        'SELECT\n  *\nFROM\n  `u`\nINNER JOIN `t` ON (`a``b` = `c``d`)'
      )
    })

    it('doubles double quotes in both the column and the column_ref (postgresql)', () => {
      const [sql] = createBuilder({ driver: 'postgresql' })
        .from('u')
        .join('inner', 't', createConditions().and('a"b', column_ref('c"d')))
        .toSQL()
      expect(sql).to.be.eql(
        'SELECT\n  *\nFROM\n  "u"\nINNER JOIN "t" ON ("a""b" = "c""d")'
      )
    })
  })

  describe('column_ref quoting options', () => {
    it('writes bare identifiers when quote is null', () => {
      const [sql] = createBuilder({ quote: null })
        .from('u')
        .where('x', column_ref('a.b'))
        .toSQL()
      expect(sql).to.be.eql('SELECT\n  *\nFROM\n  u\nWHERE\n  (x = a.b)')
    })

    it('uses double quotes with postgresql', () => {
      const [sql, bindings] = createBuilder({ driver: 'postgresql' })
        .from('u')
        .where('x', column_ref('a.b'))
        .toSQL()
      expect(sql).to.be.eql(
        'SELECT\n  *\nFROM\n  "u"\nWHERE\n  ("x" = "a"."b")'
      )
      expect(bindings).to.be.eql([])
    })
  })
})
