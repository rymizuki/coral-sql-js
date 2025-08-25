import { expect } from 'chai'
import {
  caseWhen,
  createConditions,
  unescape,
  is_not_null,
  SQLBuilder,
  SQLBuilderPort
} from '../../dist'

describe('caseWhen() function', () => {
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
          caseWhen()
            .when('status', '=', 'active').then('Active User')
            .else('Inactive User')
        )
        .toSQL()
      expect(sql).to.be.eql(
        'SELECT\n  (CASE WHEN `status` = ? THEN \'Active User\' ELSE \'Inactive User\' END)\nFROM\n  `users`'
      )
      expect(bindings).to.be.eql(['active'])
    })

    it('Multiple WHEN conditions', () => {
      const [sql, bindings] = builder
        .from('users')
        .column(
          caseWhen()
            .when('status', '=', 'active').then('Active')
            .when('status', '=', 'pending').then('Pending')
            .when('status', '=', 'suspended').then('Suspended')
            .else('Unknown')
        )
        .toSQL()
      expect(sql).to.be.eql(
        'SELECT\n  (CASE WHEN `status` = ? THEN \'Active\' WHEN `status` = ? THEN \'Pending\' WHEN `status` = ? THEN \'Suspended\' ELSE \'Unknown\' END)\nFROM\n  `users`'
      )
      expect(bindings).to.be.eql(['active', 'pending', 'suspended'])
    })
  })

  describe('with table aliases', () => {
    it('SELECT CASE WHEN `u`.`status` = ? THEN ? END FROM `users` AS `u`', () => {
      const [sql, bindings] = builder
        .from('users', 'u')
        .column(
          caseWhen()
            .when('u.status', '=', 'active').then('Active')
            .else('Inactive')
        )
        .toSQL()
      expect(sql).to.be.eql(
        'SELECT\n  (CASE WHEN `u`.`status` = ? THEN \'Active\' ELSE \'Inactive\' END)\nFROM\n  `users` AS `u`'
      )
      expect(bindings).to.be.eql(['active'])
    })
  })

  describe('with different data types', () => {
    it('Numeric values', () => {
      const [sql, bindings] = builder
        .from('orders')
        .column(
          caseWhen()
            .when('amount', '>', 1000).then('High Value')
            .when('amount', '>', 100).then('Medium Value')
            .else('Low Value')
        )
        .toSQL()
      expect(sql).to.be.eql(
        'SELECT\n  (CASE WHEN `amount` > ? THEN \'High Value\' WHEN `amount` > ? THEN \'Medium Value\' ELSE \'Low Value\' END)\nFROM\n  `orders`'
      )
      expect(bindings).to.be.eql([1000, 100])
    })

    it('NULL handling', () => {
      const [sql, bindings] = builder
        .from('users')
        .column(
          caseWhen()
            .when('email', '=', null as any).then('No Email')
            .else('Has Email')
        )
        .toSQL()
      expect(sql).to.be.eql(
        'SELECT\n  (CASE WHEN `email` IS NULL THEN \'No Email\' ELSE \'Has Email\' END)\nFROM\n  `users`'
      )
      expect(bindings).to.be.eql([])
    })

    it('NOT NULL handling', () => {
      const [sql, bindings] = builder
        .from('users')
        .column(
          caseWhen()
            .when('email', '!=', null as any).then('Has Email')
            .else('No Email')
        )
        .toSQL()
      expect(sql).to.be.eql(
        'SELECT\n  (CASE WHEN `email` IS NOT NULL THEN \'Has Email\' ELSE \'No Email\' END)\nFROM\n  `users`'
      )
      expect(bindings).to.be.eql([])
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
          caseWhen()
            .when(conditions).then('Adult Active User')
            .else('Other')
        )
        .toSQL()
      expect(sql).to.be.eql(
        'SELECT\n  (CASE WHEN (`age` >= ?)\n  AND (`status` = ?) THEN \'Adult Active User\' ELSE \'Other\' END)\nFROM\n  `users`'
      )
      expect(bindings).to.be.eql([18, 'active', 18, 'active'])
    })
  })

  describe('with field references in THEN clause', () => {
    it('Using unescape() in THEN clause', () => {
      const [sql, bindings] = builder
        .from('users')
        .column(
          caseWhen()
            .when('status', '=', 'active').then(unescape('UPPER(name)'))
            .else('Unknown')
        )
        .toSQL()
      expect(sql).to.be.eql(
        'SELECT\n  (CASE WHEN `status` = ? THEN UPPER(name) ELSE \'Unknown\' END)\nFROM\n  `users`'
      )
      expect(bindings).to.be.eql(['active'])
    })
  })

  describe('with column alias', () => {
    it('CASE with AS alias', () => {
      const [sql, bindings] = builder
        .from('users')
        .column(
          caseWhen()
            .when('status', '=', 'active').then('Active')
            .else('Inactive'),
          'status_label'
        )
        .toSQL()
      expect(sql).to.be.eql(
        'SELECT\n  (CASE WHEN `status` = ? THEN \'Active\' ELSE \'Inactive\' END) AS `status_label`\nFROM\n  `users`'
      )
      expect(bindings).to.be.eql(['active'])
    })
  })

  describe('PostgreSQL driver', () => {
    it('Uses double quotes for PostgreSQL', () => {
      const [sql, bindings] = postgresqlBuilder
        .from('users')
        .column(
          caseWhen()
            .when('status', '=', 'active').then('Active')
            .else('Inactive')
        )
        .toSQL()
      expect(sql).to.be.eql(
        'SELECT\n  (CASE WHEN "status" = ? THEN \'Active\' ELSE \'Inactive\' END)\nFROM\n  "users"'
      )
      expect(bindings).to.be.eql(['active'])
    })
  })

  describe('with is_not_null() and is_null() functions', () => {
    it('Using is_not_null() as condition expression', () => {
      const [sql, bindings] = builder
        .from('users')
        .column(
          caseWhen()
            .when('email', is_not_null()).then('Has Email')
            .else('No Email')
        )
        .toSQL()
      expect(sql).to.be.eql(
        'SELECT\n  (CASE WHEN `email` IS NOT NULL THEN \'Has Email\' ELSE \'No Email\' END)\nFROM\n  `users`'
      )
      expect(bindings).to.be.eql([])
    })
  })

  describe('error handling', () => {
    it('Should throw error when then() called without when()', () => {
      expect(() => {
        caseWhen().then('value')
      }).to.throw('then() must be called after when()')
    })

    it('Should throw error when else() called with pending condition', () => {
      expect(() => {
        caseWhen()
          .when('status', '=', 'active')
          .else('Default')
      }).to.throw('Cannot call else() with pending when() condition. Call then() first.')
    })

    it('Should throw error when toSQL() called with incomplete condition', () => {
      expect(() => {
        caseWhen()
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
          caseWhen()
            .when('status', '=', 'active').then('Active User')
        )
        .toSQL()
      expect(sql).to.be.eql(
        'SELECT\n  (CASE WHEN `status` = ? THEN \'Active User\' END)\nFROM\n  `users`'
      )
      expect(bindings).to.be.eql(['active'])
    })
  })
})