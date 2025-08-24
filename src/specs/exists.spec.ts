import { expect } from 'chai'
import {
  createBuilder,
  createConditions,
  exists,
  not_exists,
  SQLBuilder,
  SQLBuilderPort
} from '../../dist'

describe('exists', () => {
  let builder: SQLBuilderPort
  beforeEach(() => {
    builder = new SQLBuilder()
  })

  describe('.exists', () => {
    it('simple exists condition', () => {
      const subquery = createBuilder()
        .from('orders')
        .where('orders.user_id', 'users.id')
        .where('orders.status', 'completed')

      const [sql, bindings] = builder
        .from('users')
        .where('id', exists(subquery))
        .toSQL()

      expect(sql).to.be.eql(
        'SELECT\n  *\nFROM\n  `users`\nWHERE\n  (`id` EXISTS (SELECT\n  *\nFROM\n  `orders`\nWHERE\n  (`orders`.`user_id` = ?)\n  AND (`orders`.`status` = ?)))'
      )
      expect(bindings).to.be.eql(['users.id', 'completed'])
    })

    it('exists with complex subquery', () => {
      const subquery = createBuilder()
        .from('orders')
        .column('user_id')
        .where('orders.user_id', 'users.id')
        .where('orders.amount', '>', 1000)
        .where('orders.created_at', '>=', '2024-01-01')

      const [sql, bindings] = builder
        .from('users')
        .column('id')
        .column('name')
        .where('active', true)
        .where('id', exists(subquery))
        .toSQL()

      expect(sql).to.be.eql(
        'SELECT\n  `id`,\n  `name`\nFROM\n  `users`\nWHERE\n  (`active` = ?)\n  AND (`id` EXISTS (SELECT\n  `user_id`\nFROM\n  `orders`\nWHERE\n  (`orders`.`user_id` = ?)\n  AND (`orders`.`amount` > ?)\n  AND (`orders`.`created_at` >= ?)))'
      )
      expect(bindings).to.be.eql([1, 'users.id', 1000, '2024-01-01'])
    })

    it('exists(..., true) syntax', () => {
      const subquery = createBuilder()
        .from('orders')
        .where('orders.user_id', 'users.id')
        .where('orders.status', 'completed')

      const [sql, bindings] = builder
        .from('users')
        .where(exists(subquery), true)
        .toSQL()

      expect(sql).to.be.eql(
        'SELECT\n  *\nFROM\n  `users`\nWHERE\n  ((EXISTS (SELECT\n  *\nFROM\n  `orders`\nWHERE\n  (`orders`.`user_id` = ?)\n  AND (`orders`.`status` = ?))) = ?)'
      )
      expect(bindings).to.be.eql([1, 'users.id', 'completed'])
    })

    it('exists(..., false) syntax', () => {
      const subquery = createBuilder()
        .from('orders')
        .where('orders.user_id', 'users.id')

      const [sql, bindings] = builder
        .from('users')
        .where(exists(subquery), false)
        .toSQL()

      expect(sql).to.be.eql(
        'SELECT\n  *\nFROM\n  `users`\nWHERE\n  ((EXISTS (SELECT\n  *\nFROM\n  `orders`\nWHERE\n  (`orders`.`user_id` = ?))) = ?)'
      )
      expect(bindings).to.be.eql([0, 'users.id'])
    })
  })

  describe('.not_exists', () => {
    it('simple not exists condition', () => {
      const subquery = createBuilder()
        .from('orders')
        .where('orders.user_id', 'users.id')

      const [sql, bindings] = builder
        .from('users')
        .where('id', not_exists(subquery))
        .toSQL()

      expect(sql).to.be.eql(
        'SELECT\n  *\nFROM\n  `users`\nWHERE\n  (`id` NOT EXISTS (SELECT\n  *\nFROM\n  `orders`\nWHERE\n  (`orders`.`user_id` = ?)))'
      )
      expect(bindings).to.be.eql(['users.id'])
    })
  })

  describe('combined with conditions', () => {
    it('exists with createConditions', () => {
      const subquery = createBuilder()
        .from('orders')
        .where('orders.user_id', 'users.id')
        .where('orders.status', 'completed')

      const conditions = createConditions()
        .and('active', true)
        .or('id', exists(subquery))

      const [sql, bindings] = builder
        .from('users')
        .where(conditions)
        .toSQL()

      expect(sql).to.be.eql(
        'SELECT\n  *\nFROM\n  `users`\nWHERE\n  ((`active` = ?)\n  OR (`id` EXISTS (SELECT\n  *\nFROM\n  `orders`\nWHERE\n  (`orders`.`user_id` = ?)\n  AND (`orders`.`status` = ?))))'
      )
      expect(bindings).to.be.eql([1, 'users.id', 'completed'])
    })
  })
})