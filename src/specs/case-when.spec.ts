import { expect } from 'chai'
import {
  case_when,
  createBuilder,
  createConditions,
  unescape,
  is_not_null,
  SQLBuilder,
  SQLBuilderPort
} from '../../dist'

describe('case_when() function', () => {
  let builder: SQLBuilderPort
  let postgresqlBuilder: SQLBuilderPort
  
  beforeEach(() => {
    builder = new SQLBuilder() as unknown as SQLBuilderPort
    postgresqlBuilder = new SQLBuilder({ driver: 'postgresql' }) as unknown as SQLBuilderPort
  })

  describe('basic usage', () => {
    it('SELECT CASE WHEN `status` = ? THEN ? ELSE ? END FROM `users`', () => {
      const [sql, bindings] = builder
        .from('users')
        .column(
          case_when()
            .when('status', '=', 'active').then('Active User')
            .else('Inactive User')
        )
        .toSQL()
      expect(sql).to.be.eql(
        'SELECT\n  (CASE WHEN `status` = ? THEN ? ELSE ? END)\nFROM\n  `users`'
      )
      expect(bindings).to.be.eql(['active', 'Active User', 'Inactive User'])
    })

    it('Multiple WHEN conditions', () => {
      const [sql, bindings] = builder
        .from('users')
        .column(
          case_when()
            .when('status', '=', 'active').then('Active')
            .when('status', '=', 'pending').then('Pending')
            .when('status', '=', 'suspended').then('Suspended')
            .else('Unknown')
        )
        .toSQL()
      expect(sql).to.be.eql(
        'SELECT\n  (CASE WHEN `status` = ? THEN ? WHEN `status` = ? THEN ? WHEN `status` = ? THEN ? ELSE ? END)\nFROM\n  `users`'
      )
      expect(bindings).to.be.eql(['active', 'Active', 'pending', 'Pending', 'suspended', 'Suspended', 'Unknown'])
    })
  })

  describe('with table aliases', () => {
    it('SELECT CASE WHEN `u`.`status` = ? THEN ? END FROM `users` AS `u`', () => {
      const [sql, bindings] = builder
        .from('users', 'u')
        .column(
          case_when()
            .when('u.status', '=', 'active').then('Active')
            .else('Inactive')
        )
        .toSQL()
      expect(sql).to.be.eql(
        'SELECT\n  (CASE WHEN `u`.`status` = ? THEN ? ELSE ? END)\nFROM\n  `users` AS `u`'
      )
      expect(bindings).to.be.eql(['active', 'Active', 'Inactive'])
    })
  })

  describe('with different data types', () => {
    it('Numeric values', () => {
      const [sql, bindings] = builder
        .from('orders')
        .column(
          case_when()
            .when('amount', '>', 1000).then('High Value')
            .when('amount', '>', 100).then('Medium Value')
            .else('Low Value')
        )
        .toSQL()
      expect(sql).to.be.eql(
        'SELECT\n  (CASE WHEN `amount` > ? THEN ? WHEN `amount` > ? THEN ? ELSE ? END)\nFROM\n  `orders`'
      )
      expect(bindings).to.be.eql([1000, 'High Value', 100, 'Medium Value', 'Low Value'])
    })

    it('NULL handling', () => {
      const [sql, bindings] = builder
        .from('users')
        .column(
          case_when()
            .when('email', '=', null as any).then('No Email')
            .else('Has Email')
        )
        .toSQL()
      expect(sql).to.be.eql(
        'SELECT\n  (CASE WHEN `email` IS NULL THEN ? ELSE ? END)\nFROM\n  `users`'
      )
      expect(bindings).to.be.eql(['No Email', 'Has Email'])
    })

    it('NOT NULL handling', () => {
      const [sql, bindings] = builder
        .from('users')
        .column(
          case_when()
            .when('email', '!=', null as any).then('Has Email')
            .else('No Email')
        )
        .toSQL()
      expect(sql).to.be.eql(
        'SELECT\n  (CASE WHEN `email` IS NOT NULL THEN ? ELSE ? END)\nFROM\n  `users`'
      )
      expect(bindings).to.be.eql(['Has Email', 'No Email'])
    })
  })

  describe('with complex conditions', () => {
    it('Using createConditions for complex logic', () => {
      const conditions = createConditions()
        .add('and', 'age', '>=', 18)
        .add('and', 'status', '=', 'active')
      
      const [sql, bindings] = builder
        .from('users')
        .column(
          case_when()
            .when(conditions).then('Adult Active User')
            .else('Other')
        )
        .toSQL()
      expect(sql).to.be.eql(
        'SELECT\n  (CASE WHEN (`age` >= ?)\n  AND (`status` = ?) THEN ? ELSE ? END)\nFROM\n  `users`'
      )
      expect(bindings).to.be.eql([18, 'active', 'Adult Active User', 'Other'])
    })
  })

  describe('with field references in THEN clause', () => {
    it('Using unescape() in THEN clause', () => {
      const [sql, bindings] = builder
        .from('users')
        .column(
          case_when()
            .when('status', '=', 'active').then(unescape('UPPER(name)'))
            .else('Unknown')
        )
        .toSQL()
      expect(sql).to.be.eql(
        'SELECT\n  (CASE WHEN `status` = ? THEN UPPER(name) ELSE ? END)\nFROM\n  `users`'
      )
      expect(bindings).to.be.eql(['active', 'Unknown'])
    })
  })

  describe('with column alias', () => {
    it('CASE with AS alias', () => {
      const [sql, bindings] = builder
        .from('users')
        .column(
          case_when()
            .when('status', '=', 'active').then('Active')
            .else('Inactive'),
          'status_label'
        )
        .toSQL()
      expect(sql).to.be.eql(
        'SELECT\n  (CASE WHEN `status` = ? THEN ? ELSE ? END) AS `status_label`\nFROM\n  `users`'
      )
      expect(bindings).to.be.eql(['active', 'Active', 'Inactive'])
    })
  })

  describe('PostgreSQL driver', () => {
    it('Uses double quotes for PostgreSQL', () => {
      const [sql, bindings] = postgresqlBuilder
        .from('users')
        .column(
          case_when()
            .when('status', '=', 'active').then('Active')
            .else('Inactive')
        )
        .toSQL()
      expect(sql).to.be.eql(
        'SELECT\n  (CASE WHEN "status" = $1 THEN $2 ELSE $3 END)\nFROM\n  "users"'
      )
      expect(bindings).to.be.eql(['active', 'Active', 'Inactive'])
    })
  })

  describe('with is_not_null() and is_null() functions', () => {
    it('Using is_not_null() as condition expression', () => {
      const [sql, bindings] = builder
        .from('users')
        .column(
          case_when()
            .when('email', is_not_null()).then('Has Email')
            .else('No Email')
        )
        .toSQL()
      expect(sql).to.be.eql(
        'SELECT\n  (CASE WHEN `email` IS NOT NULL THEN ? ELSE ? END)\nFROM\n  `users`'
      )
      expect(bindings).to.be.eql(['Has Email', 'No Email'])
    })
  })

  describe('error handling', () => {
    it('Should throw error when then() called without when()', () => {
      expect(() => {
        case_when().then('value')
      }).to.throw('then() must be called after when()')
    })

    it('Should throw error when else() called with pending condition', () => {
      expect(() => {
        case_when()
          .when('status', '=', 'active')
          .else('Default')
      }).to.throw('Cannot call else() with pending when() condition. Call then() first.')
    })

    it('Should throw error when toSQL() called with incomplete condition', () => {
      expect(() => {
        case_when()
          .when('status', '=', 'active')
          .toSQL()
      }).to.throw('Incomplete case expression. Missing then() call.')
    })
  })

  describe('without else clause', () => {
    it('CASE without ELSE clause', () => {
      const [sql, bindings] = builder
        .from('users')
        .column(
          case_when()
            .when('status', '=', 'active').then('Active User')
        )
        .toSQL()
      expect(sql).to.be.eql(
        'SELECT\n  (CASE WHEN `status` = ? THEN ? END)\nFROM\n  `users`'
      )
      expect(bindings).to.be.eql(['active', 'Active User'])
    })
  })

  describe('bindings', () => {
    it('THEN / ELSE の文字列は SQL に埋め込まれずバインドされる', () => {
      const [sql, bindings] = createBuilder()
        .from('t')
        .column(
          case_when().when('a', 1).then("\\' OR 1=1 -- ").else('z')
        )
        .toSQL()
      expect(sql).to.be.eql(
        'SELECT\n  (CASE WHEN `a` = ? THEN ? ELSE ? END)\nFROM\n  `t`'
      )
      expect(bindings).to.be.eql([1, "\\' OR 1=1 -- ", 'z'])
    })

    it('WHERE で使ってもプレースホルダと bindings の数が一致する', () => {
      const [sql, bindings] = createBuilder()
        .from('t')
        .where(case_when().when('a', 1).then('x').else('y'), 'x')
        .where('b', 2)
        .toSQL()
      expect(sql.match(/\?/g)).to.have.length(bindings.length)
      expect(bindings).to.be.eql([1, 'x', 'y', 'x', 2])
    })

    it('postgresql では $1 から連番になり ? が混ざらない', () => {
      const [sql, bindings] = createBuilder()
        .from('t')
        .column(case_when().when('a', 1).then('x'))
        .where('b', 2)
        .toSQL({ driver: 'postgresql' })
      expect(sql).to.include('$1').and.to.include('$2').and.to.include('$3')
      expect(sql).to.not.include('?')
      expect(bindings).to.be.eql([1, 'x', 2])
    })

    it('Conditions を when に渡しても値が二重に積まれない', () => {
      const [, bindings] = createBuilder()
        .from('t')
        .column(
          case_when().when(createConditions().and('a', 1)).then('x')
        )
        .where('b', 2)
        .toSQL()
      expect(bindings).to.be.eql([1, 'x', 2])
    })

    it('THEN / ELSE の数値は SQL に直接書かれ bindings に入らない', () => {
      const [sql, bindings] = createBuilder()
        .from('t')
        .column(case_when().when('a', 1).then(1).else(0))
        .toSQL()
      expect(sql).to.be.eql(
        'SELECT\n  (CASE WHEN `a` = ? THEN 1 ELSE 0 END)\nFROM\n  `t`'
      )
      expect(bindings).to.be.eql([1])
    })

    it('when の IN は IN (?,?) になり値が出現順にバインドされる', () => {
      const [sql, bindings] = createBuilder()
        .from('t')
        .column(case_when().when('a', 'in', [1, 2]).then('x'))
        .toSQL()
      expect(sql).to.contain('`a` IN (?,?) THEN ?')
      expect(bindings).to.be.eql([1, 2, 'x'])
    })

    it('when の BETWEEN は BETWEEN ? AND ? になる', () => {
      const [sql, bindings] = createBuilder()
        .from('t')
        .column(case_when().when('a', 'between', [1, 9]).then('x'))
        .toSQL()
      expect(sql).to.contain('`a` BETWEEN ? AND ? THEN ?')
      expect(bindings).to.be.eql([1, 9, 'x'])
    })

    it('postgresql では IN の $1,$2 と THEN の $3 が出現順に並ぶ', () => {
      const [sql, bindings] = createBuilder({ driver: 'postgresql' })
        .from('t')
        .column(case_when().when('a', 'in', [1, 2]).then('x'))
        .toSQL()
      expect(sql).to.contain('"a" IN ($1,$2) THEN $3')
      expect(bindings).to.be.eql([1, 2, 'x'])
    })

    it('THEN に NaN / Infinity / Date を渡すと埋め込まれずバインドされる', () => {
      const date = new Date(0)
      const [sql, bindings] = createBuilder()
        .from('t')
        .column(case_when().when('a', 1).then(NaN).when('a', 2).then(Infinity).when('a', 3).then(date))
        .toSQL()
      expect(sql).to.contain('WHEN `a` = ? THEN ? WHEN `a` = ? THEN ? WHEN `a` = ? THEN ?')
      expect(bindings).to.be.eql([1, NaN, 2, Infinity, 3, date])
    })

    it('THEN に 0 / false / null を渡すと直接書かれ bindings に入らない', () => {
      const [sql, bindings] = createBuilder()
        .from('t')
        .column(case_when().when('a', 1).then(0).when('a', 2).then(false).when('a', 3).then(null))
        .toSQL()
      expect(sql).to.contain('THEN 0 WHEN `a` = ? THEN false WHEN `a` = ? THEN NULL')
      expect(bindings).to.be.eql([1, 2, 3])
    })

    it('ELSE に null を渡すと ELSE NULL になり bindings に入らない', () => {
      const [sql, bindings] = createBuilder()
        .from('t')
        .column(case_when().when('a', 1).then('x').else(null))
        .toSQL()
      expect(sql).to.contain('ELSE NULL')
      expect(bindings).to.be.eql([1, 'x'])
    })
  })
})
