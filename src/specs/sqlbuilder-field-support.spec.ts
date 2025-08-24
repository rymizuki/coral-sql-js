import { expect } from 'chai'
import {
  createBuilder,
  SQLBuilder,
  SQLBuilderPort
} from '../../dist'

describe('SQLBuilder field support for subqueries', () => {
  let builder: SQLBuilderPort
  beforeEach(() => {
    builder = new SQLBuilder()
  })

  describe('.column() with SQLBuilderPort', () => {
    it('simple subquery as column', () => {
      const subquery = createBuilder()
        .select('SELECT COUNT(*)')
        .from('orders')
        .where('user_id', 'users.id')

      const [sql, bindings] = builder
        .from('users')
        .column('id')
        .column(subquery)
        .toSQL()

      expect(sql).to.be.eql(
        'SELECT\n  `id`,\n  (SELECT COUNT(*)\nFROM\n  `orders`\nWHERE\n  (`user_id` = ?))\nFROM\n  `users`'
      )
      expect(bindings).to.be.eql(['users.id'])
    })

    it('subquery as column with alias', () => {
      const subquery = createBuilder()
        .select('SELECT COUNT(*)')
        .from('orders')
        .where('user_id', 'users.id')
        .where('status', 'completed')

      const [sql, bindings] = builder
        .from('users')
        .column('id')
        .column('name')
        .column(subquery, 'order_count')
        .toSQL()

      expect(sql).to.be.eql(
        'SELECT\n  `id`,\n  `name`,\n  (SELECT COUNT(*)\nFROM\n  `orders`\nWHERE\n  (`user_id` = ?)\n  AND (`status` = ?)) AS `order_count`\nFROM\n  `users`'
      )
      expect(bindings).to.be.eql(['users.id', 'completed'])
    })

    it('multiple subqueries as columns', () => {
      const orderCountQuery = createBuilder()
        .select('SELECT COUNT(*)')
        .from('orders')
        .where('user_id', 'users.id')

      const activeOrderCountQuery = createBuilder()
        .select('SELECT COUNT(*)')
        .from('orders')
        .where('user_id', 'users.id')
        .where('status', 'active')

      const [sql, bindings] = builder
        .from('users')
        .column('id')
        .column(orderCountQuery, 'total_orders')
        .column(activeOrderCountQuery, 'active_orders')
        .toSQL()

      expect(sql).to.be.eql(
        'SELECT\n  `id`,\n  (SELECT COUNT(*)\nFROM\n  `orders`\nWHERE\n  (`user_id` = ?)) AS `total_orders`,\n  (SELECT COUNT(*)\nFROM\n  `orders`\nWHERE\n  (`user_id` = ?)\n  AND (`status` = ?)) AS `active_orders`\nFROM\n  `users`'
      )
      expect(bindings).to.be.eql(['users.id', 'users.id', 'active'])
    })

    it('complex subquery with joins and aggregation', () => {
      const complexSubquery = createBuilder()
        .select('SELECT AVG(amount)')
        .from('orders', 'o')
        .leftJoin('order_items', 'oi', 'oi.order_id = o.id')
        .where('o.user_id', 'users.id')
        .where('o.created_at', '>=', '2024-01-01')
        .groupBy('o.id')

      const [sql, bindings] = builder
        .from('users')
        .column('id')
        .column('name')
        .column(complexSubquery, 'avg_order_amount')
        .where('active', true)
        .toSQL()

      expect(sql).to.be.eql(
        'SELECT\n  `id`,\n  `name`,\n  (SELECT AVG(amount)\nFROM\n  `orders` AS `o`\nLEFT JOIN `order_items` AS `oi` ON oi.order_id = o.id\nWHERE\n  (`o`.`user_id` = ?)\n  AND (`o`.`created_at` >= ?)\nGROUP BY\n  `o`.`id`) AS `avg_order_amount`\nFROM\n  `users`\nWHERE\n  (`active` = ?)'
      )
      expect(bindings).to.be.eql(['users.id', '2024-01-01', 1])
    })
  })

  describe('.groupBy() with SQLBuilderPort', () => {
    it('simple subquery in GROUP BY', () => {
      const subquery = createBuilder()
        .select('SELECT DATE(created_at)')
        .from('orders')
        .where('user_id', 'stats.user_id')

      const [sql, bindings] = builder
        .select('SELECT user_id, COUNT(*) as count')
        .from('user_stats', 'stats')
        .groupBy(subquery)
        .toSQL()

      expect(sql).to.be.eql(
        'SELECT user_id, COUNT(*) as count\nFROM\n  `user_stats` AS `stats`\nGROUP BY\n  (SELECT DATE(created_at)\nFROM\n  `orders`\nWHERE\n  (`user_id` = ?))'
      )
      expect(bindings).to.be.eql(['stats.user_id'])
    })

    it('subquery with multiple fields in GROUP BY', () => {
      const dateSubquery = createBuilder()
        .select('SELECT DATE(created_at)')
        .from('orders')
        .where('user_id', 'stats.user_id')

      const [sql, bindings] = builder
        .select('SELECT user_id, status, COUNT(*) as count')
        .from('user_stats', 'stats')
        .groupBy('user_id')
        .groupBy(dateSubquery)
        .groupBy('status')
        .toSQL()

      expect(sql).to.be.eql(
        'SELECT user_id, status, COUNT(*) as count\nFROM\n  `user_stats` AS `stats`\nGROUP BY\n  `user_id`,(SELECT DATE(created_at)\nFROM\n  `orders`\nWHERE\n  (`user_id` = ?)),`status`'
      )
      expect(bindings).to.be.eql(['stats.user_id'])
    })

    it('complex subquery in GROUP BY with aggregation', () => {
      const complexSubquery = createBuilder()
        .select('SELECT CASE WHEN amount > 100 THEN "high" ELSE "low" END')
        .from('orders')
        .where('user_id', 'sales.user_id')
        .where('status', 'completed')

      const [sql, bindings] = builder
        .select('SELECT user_id, SUM(amount) as total_amount')
        .from('sales')
        .groupBy('user_id')
        .groupBy(complexSubquery)
        .having('total_amount', '>', 1000)
        .toSQL()

      expect(sql).to.be.eql(
        'SELECT user_id, SUM(amount) as total_amount\nFROM\n  `sales`\nGROUP BY\n  `user_id`,(SELECT CASE WHEN amount > 100 THEN "high" ELSE "low" END\nFROM\n  `orders`\nWHERE\n  (`user_id` = ?)\n  AND (`status` = ?))\nHAVING\n  (`total_amount` > ?)'
      )
      expect(bindings).to.be.eql(['sales.user_id', 'completed', 1000])
    })
  })

  describe('.orderBy() with SQLBuilderPort', () => {
    it('simple subquery in ORDER BY ascending', () => {
      const subquery = createBuilder()
        .select('SELECT COUNT(*)')
        .from('orders')
        .where('user_id', 'users.id')

      const [sql, bindings] = builder
        .from('users')
        .column('id')
        .column('name')
        .orderBy(subquery, 'asc')
        .toSQL()

      expect(sql).to.be.eql(
        'SELECT\n  `id`,\n  `name`\nFROM\n  `users`\nORDER BY\n  (SELECT COUNT(*)\nFROM\n  `orders`\nWHERE\n  (`user_id` = ?)) ASC'
      )
      expect(bindings).to.be.eql(['users.id'])
    })

    it('simple subquery in ORDER BY descending', () => {
      const subquery = createBuilder()
        .select('SELECT MAX(created_at)')
        .from('orders')
        .where('user_id', 'users.id')
        .where('status', 'completed')

      const [sql, bindings] = builder
        .from('users')
        .column('id')
        .column('name')
        .orderBy(subquery, 'desc')
        .toSQL()

      expect(sql).to.be.eql(
        'SELECT\n  `id`,\n  `name`\nFROM\n  `users`\nORDER BY\n  (SELECT MAX(created_at)\nFROM\n  `orders`\nWHERE\n  (`user_id` = ?)\n  AND (`status` = ?)) DESC'
      )
      expect(bindings).to.be.eql(['users.id', 'completed'])
    })

    it('multiple ORDER BY with mixed fields and subqueries', () => {
      const orderCountSubquery = createBuilder()
        .select('SELECT COUNT(*)')
        .from('orders')
        .where('user_id', 'users.id')

      const lastOrderDateSubquery = createBuilder()
        .select('SELECT MAX(created_at)')
        .from('orders')
        .where('user_id', 'users.id')

      const [sql, bindings] = builder
        .from('users')
        .column('id')
        .column('name')
        .orderBy('name', 'asc')
        .orderBy(orderCountSubquery, 'desc')
        .orderBy(lastOrderDateSubquery, 'desc')
        .toSQL()

      expect(sql).to.be.eql(
        'SELECT\n  `id`,\n  `name`\nFROM\n  `users`\nORDER BY\n  `name` ASC,\n  (SELECT COUNT(*)\nFROM\n  `orders`\nWHERE\n  (`user_id` = ?)) DESC,\n  (SELECT MAX(created_at)\nFROM\n  `orders`\nWHERE\n  (`user_id` = ?)) DESC'
      )
      expect(bindings).to.be.eql(['users.id', 'users.id'])
    })

    it('complex subquery with joins in ORDER BY', () => {
      const complexSubquery = createBuilder()
        .select('SELECT AVG(oi.price * oi.quantity)')
        .from('orders', 'o')
        .leftJoin('order_items', 'oi', 'oi.order_id = o.id')
        .where('o.user_id', 'users.id')
        .where('o.status', 'completed')
        .groupBy('o.user_id')

      const [sql, bindings] = builder
        .from('users')
        .column('id')
        .column('name')
        .where('active', true)
        .orderBy(complexSubquery, 'desc')
        .limit(10)
        .toSQL()

      expect(sql).to.be.eql(
        'SELECT\n  `id`,\n  `name`\nFROM\n  `users`\nWHERE\n  (`active` = ?)\nORDER BY\n  (SELECT AVG(oi.price * oi.quantity)\nFROM\n  `orders` AS `o`\nLEFT JOIN `order_items` AS `oi` ON oi.order_id = o.id\nWHERE\n  (`o`.`user_id` = ?)\n  AND (`o`.`status` = ?)\nGROUP BY\n  `o`.`user_id`) DESC\nLIMIT 10'
      )
      expect(bindings).to.be.eql([1, 'users.id', 'completed'])
    })
  })

  describe('.where() with SQLBuilderPort', () => {
    it('subquery in WHERE condition', () => {
      const subquery = createBuilder()
        .select('SELECT COUNT(*)')
        .from('orders')
        .where('user_id', 'users.id')
        .where('status', 'completed')

      const [sql, bindings] = builder
        .from('users')
        .column('id')
        .column('name')
        .where(subquery, 5)
        .toSQL()

      expect(sql).to.be.eql(
        'SELECT\n  `id`,\n  `name`\nFROM\n  `users`\nWHERE\n  ((SELECT COUNT(*)\nFROM\n  `orders`\nWHERE\n  (`user_id` = ?)\n  AND (`status` = ?)) = ?)'
      )
      expect(bindings).to.be.eql([5, 'users.id', 'completed'])
    })

    it('subquery with comparison operator in WHERE', () => {
      const subquery = createBuilder()
        .select('SELECT AVG(amount)')
        .from('orders')
        .where('user_id', 'users.id')

      const [sql, bindings] = builder
        .from('users')
        .column('id')
        .column('name')
        .where(subquery, '>', 100)
        .toSQL()

      expect(sql).to.be.eql(
        'SELECT\n  `id`,\n  `name`\nFROM\n  `users`\nWHERE\n  ((SELECT AVG(amount)\nFROM\n  `orders`\nWHERE\n  (`user_id` = ?)) > ?)'
      )
      expect(bindings).to.be.eql([100, 'users.id'])
    })

    it('multiple subqueries in WHERE conditions', () => {
      const orderCountSubquery = createBuilder()
        .select('SELECT COUNT(*)')
        .from('orders')
        .where('user_id', 'users.id')

      const avgAmountSubquery = createBuilder()
        .select('SELECT AVG(amount)')
        .from('orders')
        .where('user_id', 'users.id')
        .where('status', 'completed')

      const [sql, bindings] = builder
        .from('users')
        .column('id')
        .where('active', true)
        .where(orderCountSubquery, '>', 0)
        .where(avgAmountSubquery, '>=', 50)
        .toSQL()

      expect(sql).to.be.eql(
        'SELECT\n  `id`\nFROM\n  `users`\nWHERE\n  (`active` = ?)\n  AND ((SELECT COUNT(*)\nFROM\n  `orders`\nWHERE\n  (`user_id` = ?)) > ?)\n  AND ((SELECT AVG(amount)\nFROM\n  `orders`\nWHERE\n  (`user_id` = ?)\n  AND (`status` = ?)) >= ?)'
      )
      expect(bindings).to.be.eql([1, 0, 'users.id', 50, 'users.id', 'completed'])
    })

    it('subquery with IN operator', () => {
      const subquery = createBuilder()
        .select('SELECT category_id')
        .from('user_preferences')
        .where('user_id', 'users.id')

      const [sql, bindings] = builder
        .from('users')
        .column('id')
        .column('name')
        .where(subquery, 'in', [1, 2, 3])
        .toSQL()

      expect(sql).to.be.eql(
        'SELECT\n  `id`,\n  `name`\nFROM\n  `users`\nWHERE\n  ((SELECT category_id\nFROM\n  `user_preferences`\nWHERE\n  (`user_id` = ?)) IN (?,?,?))'
      )
      expect(bindings).to.be.eql([1, 2, 3, 'users.id'])
    })
  })

  describe('combined SQLBuilderPort usage', () => {
    it('subqueries in column, groupBy, and orderBy together', () => {
      const orderCountSubquery = createBuilder()
        .select('SELECT COUNT(*)')
        .from('orders')
        .where('user_id', 'users.id')

      const avgAmountSubquery = createBuilder()
        .select('SELECT AVG(amount)')
        .from('orders')
        .where('user_id', 'users.id')
        .where('status', 'completed')

      const categorySubquery = createBuilder()
        .select('SELECT category')
        .from('user_categories')
        .where('user_id', 'users.id')

      const [sql, bindings] = builder
        .from('users')
        .column('id')
        .column('name')
        .column(orderCountSubquery, 'total_orders')
        .column(avgAmountSubquery, 'avg_order_amount')
        .where('active', true)
        .groupBy('id')
        .groupBy(categorySubquery)
        .orderBy(orderCountSubquery, 'desc')
        .orderBy('name', 'asc')
        .limit(20)
        .toSQL()

      expect(sql).to.be.eql(
        'SELECT\n  `id`,\n  `name`,\n  (SELECT COUNT(*)\nFROM\n  `orders`\nWHERE\n  (`user_id` = ?)) AS `total_orders`,\n  (SELECT AVG(amount)\nFROM\n  `orders`\nWHERE\n  (`user_id` = ?)\n  AND (`status` = ?)) AS `avg_order_amount`\nFROM\n  `users`\nWHERE\n  (`active` = ?)\nGROUP BY\n  `id`,(SELECT category\nFROM\n  `user_categories`\nWHERE\n  (`user_id` = ?))\nORDER BY\n  (SELECT COUNT(*)\nFROM\n  `orders`\nWHERE\n  (`user_id` = ?)) DESC,\n  `name` ASC\nLIMIT 20'
      )
      expect(bindings).to.be.eql(['users.id', 'users.id', 'completed', 1, 'users.id', 'users.id'])
    })
  })
})