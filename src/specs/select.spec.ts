import { expect } from 'chai'
import { createBuilder } from '../../dist'

describe('builder.select()', () => {
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