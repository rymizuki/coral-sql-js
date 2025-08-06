import { expect } from 'chai'
import {
  createBuilder,
  SQLBuilder,
  SQLBuilderPort,
  unescape
} from '../../dist'

describe('builder leftJoin with subquery', () => {
  describe('no options', () => {
    let builder: SQLBuilderPort
    beforeEach(() => {
      builder = new SQLBuilder()
    })

    describe('.leftJoin', () => {
      describe('with subquery', () => {
        it('"SELECT * FROM users AS u LEFT JOIN (subquery) AS ul ON condition", []', () => {
          const [sql, bindings] = builder
            .from('users', 'u')
            .leftJoin(
              createBuilder()
                .from('user_logged')
                .column(unescape('MAX(logged_at)'), 'last_logged_at')
                .column('user_id')
                .groupBy('user_id'),
              'ul',
              'ul.user_id = u.id'
            )
            .toSQL()
          expect(sql).to.be.eql(
            'SELECT\n  *\nFROM\n  `users` AS `u`\nLEFT JOIN (SELECT\n  MAX(logged_at) AS `last_logged_at`,\n  `user_id`\nFROM\n  `user_logged`\nGROUP BY\n  `user_id`) AS `ul` ON ul.user_id = u.id'
          )
          expect(bindings).to.be.eql([])
        })

        it('"SELECT * FROM users AS u LEFT JOIN (subquery with bindings) AS o ON condition", [bindings]', () => {
          const [sql, bindings] = builder
            .from('users', 'u')
            .leftJoin(
              createBuilder()
                .from('orders')
                .column(unescape('COUNT(*)'), 'order_count')
                .column('user_id')
                .where('status', 'completed')
                .where('amount', '>', 100)
                .groupBy('user_id'),
              'o',
              'o.user_id = u.id'
            )
            .toSQL()
          expect(sql).to.be.eql(
            'SELECT\n  *\nFROM\n  `users` AS `u`\nLEFT JOIN (SELECT\n  COUNT(*) AS `order_count`,\n  `user_id`\nFROM\n  `orders`\nWHERE\n  (`status` = ?)\n  AND (`amount` > ?)\nGROUP BY\n  `user_id`) AS `o` ON o.user_id = u.id'
          )
          expect(bindings).to.be.eql(['completed', 100])
        })

        it('"SELECT columns FROM users AS u LEFT JOIN (complex subquery) AS last_log ON condition", [bindings]', () => {
          const subquery = createBuilder()
            .from('user_logged', 'ul')
            .column(unescape('MAX(logged_at)'), 'last_logged_at')
            .column('user_id')
            .where('logged_at', '>=', new Date('2024-01-01'))
            .where('status', 'active')
            .groupBy('user_id')
            .having(unescape('COUNT(*)'), '>', 5)

          const [sql, bindings] = createBuilder()
            .from('users', 'u')
            .column('u.id')
            .column('u.name')
            .column('last_log.last_logged_at')
            .leftJoin(subquery, 'last_log', 'last_log.user_id = u.id')
            .where('u.active', true)
            .toSQL()

          expect(sql).to.be.eql(
            'SELECT\n  `u`.`id`,\n  `u`.`name`,\n  `last_log`.`last_logged_at`\nFROM\n  `users` AS `u`\nLEFT JOIN (SELECT\n  MAX(logged_at) AS `last_logged_at`,\n  `user_id`\nFROM\n  `user_logged` AS `ul`\nWHERE\n  (`logged_at` >= ?)\n  AND (`status` = ?)\nGROUP BY\n  `user_id`\nHAVING\n  (COUNT(*) > ?)) AS `last_log` ON last_log.user_id = u.id\nWHERE\n  (`u`.`active` = ?)'
          )
          expect(bindings).to.be.eql([new Date('2024-01-01'), 'active', 5, 1])
        })
      })

      describe('join with subquery', () => {
        it('"SELECT * FROM users AS u INNER JOIN (subquery) AS o ON condition", []', () => {
          const subquery = createBuilder()
            .from('orders')
            .column('user_id')
            .column(unescape('SUM(amount)'), 'total_amount')
            .groupBy('user_id')

          const [sql, bindings] = builder
            .from('users', 'u')
            .join('inner', subquery, 'o', 'o.user_id = u.id')
            .toSQL()
          
          expect(sql).to.be.eql(
            'SELECT\n  *\nFROM\n  `users` AS `u`\nINNER JOIN (SELECT\n  `user_id`,\n  SUM(amount) AS `total_amount`\nFROM\n  `orders`\nGROUP BY\n  `user_id`) AS `o` ON o.user_id = u.id'
          )
          expect(bindings).to.be.eql([])
        })
      })
    })
  })

  describe('options.quote = null', () => {
    let builder: SQLBuilderPort
    beforeEach(() => {
      builder = new SQLBuilder({ quote: null })
    })

    describe('.leftJoin', () => {
      describe('with subquery', () => {
        it('"SELECT * FROM users AS u LEFT JOIN (subquery) AS o ON condition", [bindings]', () => {
          const [sql, bindings] = builder
            .from('users', 'u')
            .leftJoin(
              createBuilder({ quote: null })
                .from('orders')
                .column(unescape('COUNT(*)'), 'order_count')
                .where('status', 'completed')
                .groupBy('user_id'),
              'o',
              'o.user_id = u.id'
            )
            .toSQL()
          
          expect(sql).to.be.eql(
            'SELECT\n  *\nFROM\n  users AS u\nLEFT JOIN (SELECT\n  COUNT(*) AS order_count\nFROM\n  orders\nWHERE\n  (status = ?)\nGROUP BY\n  user_id) AS o ON o.user_id = u.id'
          )
          expect(bindings).to.be.eql(['completed'])
        })
      })
    })
  })
})