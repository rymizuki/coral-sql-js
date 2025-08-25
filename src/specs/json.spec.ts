import { expect } from 'chai'
import {
  createBuilder,
  coalesce,
  json_array_aggregate,
  json_object,
  unescape,
  SQLBuilder,
  SQLBuilderPort
} from '../../dist'

describe('JSON functions', () => {
  let builder: SQLBuilderPort
  let postgresqlBuilder: SQLBuilderPort
  
  beforeEach(() => {
    builder = new SQLBuilder() as unknown as SQLBuilderPort
    postgresqlBuilder = new SQLBuilder({ driver: 'postgresql' }) as unknown as SQLBuilderPort
  })

  describe('json_object() function', () => {
    describe('basic usage', () => {
      it("SELECT JSON_OBJECT('id', `id`, 'name', `name`) FROM `users`", () => {
        const [sql, bindings] = builder
          .from('users')
          .column(json_object({ id: 'id', name: 'name' }))
          .toSQL()
        expect(sql).to.be.eql(
          "SELECT\n  JSON_OBJECT('id', `id`, 'name', `name`)\nFROM\n  `users`"
        )
        expect(bindings).to.be.eql([])
      })

      it("SELECT JSON_OBJECT('id', `id`, 'name', `name`, 'email', `email`, 'created', `created_at`) FROM `users`", () => {
        const [sql, bindings] = builder
          .from('users')
          .column(
            json_object({
              id: 'id',
              name: 'name',
              email: 'email',
              created: 'created_at'
            })
          )
          .toSQL()
        expect(sql).to.be.eql(
          "SELECT\n  JSON_OBJECT('id', `id`, 'name', `name`, 'email', `email`, 'created', `created_at`)\nFROM\n  `users`"
        )
        expect(bindings).to.be.eql([])
      })
    })

    describe('with table aliases', () => {
      it("SELECT JSON_OBJECT('id', `o`.`id`, 'ordered_at', `o`.`created_at`) FROM `order` AS `o`", () => {
        const [sql, bindings] = builder
          .from('order', 'o')
          .column(json_object({ id: 'o.id', ordered_at: 'o.created_at' }))
          .toSQL()
        expect(sql).to.be.eql(
          "SELECT\n  JSON_OBJECT('id', `o`.`id`, 'ordered_at', `o`.`created_at`)\nFROM\n  `order` AS `o`"
        )
        expect(bindings).to.be.eql([])
      })

      it("SELECT JSON_OBJECT('order_id', `o`.`id`, 'user_name', `u`.`name`, 'user_email', `u`.`email`) FROM `orders` AS `o` INNER JOIN `users` AS `u` ON `o`.`user_id` = `u`.`id`", () => {
        const [sql, bindings] = builder
          .from('orders', 'o')
          .join('inner', 'users', 'u', '`o`.`user_id` = `u`.`id`')
          .column(
            json_object({
              order_id: 'o.id',
              user_name: 'u.name',
              user_email: 'u.email'
            })
          )
          .toSQL()
        expect(sql).to.be.eql(
          "SELECT\n  JSON_OBJECT('order_id', `o`.`id`, 'user_name', `u`.`name`, 'user_email', `u`.`email`)\nFROM\n  `orders` AS `o`\nINNER JOIN `users` AS `u` ON `o`.`user_id` = `u`.`id`"
        )
        expect(bindings).to.be.eql([])
      })
    })

    describe('with unescape for raw SQL', () => {
      it("SELECT JSON_OBJECT('id', `id`, 'count', COUNT(*)) FROM `users`", () => {
        const [sql, bindings] = builder
          .from('users')
          .column(
            json_object({
              id: 'id',
              count: unescape('COUNT(*)')
            })
          )
          .toSQL()
        expect(sql).to.be.eql(
          "SELECT\n  JSON_OBJECT('id', `id`, 'count', COUNT(*))\nFROM\n  `users`"
        )
        expect(bindings).to.be.eql([])
      })

      it("SELECT JSON_OBJECT('total', SUM(amount), 'average', AVG(amount), 'max', MAX(amount)) FROM `sales`", () => {
        const [sql, bindings] = builder
          .from('sales')
          .column(
            json_object({
              total: unescape('SUM(amount)'),
              average: unescape('AVG(amount)'),
              max: unescape('MAX(amount)')
            })
          )
          .toSQL()
        expect(sql).to.be.eql(
          "SELECT\n  JSON_OBJECT('total', SUM(amount), 'average', AVG(amount), 'max', MAX(amount))\nFROM\n  `sales`"
        )
        expect(bindings).to.be.eql([])
      })

      it("SELECT JSON_OBJECT('product_id', `oi`.`product_id`, 'total', oi.quantity * oi.unit_price) FROM `order_items` AS `oi`", () => {
        const [sql, bindings] = builder
          .from('order_items', 'oi')
          .column(
            json_object({
              product_id: 'oi.product_id',
              total: unescape('oi.quantity * oi.unit_price')
            })
          )
          .toSQL()
        expect(sql).to.be.eql(
          "SELECT\n  JSON_OBJECT('product_id', `oi`.`product_id`, 'total', oi.quantity * oi.unit_price)\nFROM\n  `order_items` AS `oi`"
        )
        expect(bindings).to.be.eql([])
      })
    })
  })

  describe('json_array_aggregate() function', () => {
    describe('basic usage', () => {
      it("SELECT JSON_ARRAYAGG(JSON_OBJECT('sku', `sku`, 'price', `price`)) FROM `products`", () => {
        const [sql, bindings] = builder
          .from('products')
          .column(
            json_array_aggregate(json_object({ sku: 'sku', price: 'price' }))
          )
          .toSQL()
        expect(sql).to.be.eql(
          "SELECT\n  JSON_ARRAYAGG(JSON_OBJECT('sku', `sku`, 'price', `price`))\nFROM\n  `products`"
        )
        expect(bindings).to.be.eql([])
      })

      it('SELECT JSON_ARRAYAGG(name) FROM `users`', () => {
        const [sql, bindings] = builder
          .from('users')
          .column(json_array_aggregate(unescape('name')))
          .toSQL()
        expect(sql).to.be.eql('SELECT\n  JSON_ARRAYAGG(name)\nFROM\n  `users`')
        expect(bindings).to.be.eql([])
      })
    })

    describe('with complex JSON objects', () => {
      it("SELECT JSON_ARRAYAGG(JSON_OBJECT('product_id', `oi`.`product_id`, 'quantity', `oi`.`quantity`, 'unit_price', `oi`.`unit_price`, 'total', oi.quantity * oi.unit_price)) FROM `order_items` AS `oi`", () => {
        const [sql, bindings] = builder
          .from('order_items', 'oi')
          .column(
            json_array_aggregate(
              json_object({
                product_id: 'oi.product_id',
                quantity: 'oi.quantity',
                unit_price: 'oi.unit_price',
                total: unescape('oi.quantity * oi.unit_price')
              })
            )
          )
          .toSQL()
        expect(sql).to.be.eql(
          "SELECT\n  JSON_ARRAYAGG(JSON_OBJECT('product_id', `oi`.`product_id`, 'quantity', `oi`.`quantity`, 'unit_price', `oi`.`unit_price`, 'total', oi.quantity * oi.unit_price))\nFROM\n  `order_items` AS `oi`"
        )
        expect(bindings).to.be.eql([])
      })
    })

    describe('with GROUP BY clause', () => {
      it("SELECT `oi`.`order_id`, JSON_ARRAYAGG(JSON_OBJECT('product_id', `oi`.`product_id`, 'quantity', `oi`.`quantity`)) FROM `order_items` AS `oi` GROUP BY `oi`.`order_id`", () => {
        const [sql, bindings] = builder
          .from('order_items', 'oi')
          .column('oi.order_id')
          .column(
            json_array_aggregate(
              json_object({
                product_id: 'oi.product_id',
                quantity: 'oi.quantity'
              })
            )
          )
          .groupBy('oi.order_id')
          .toSQL()
        expect(sql).to.be.eql(
          "SELECT\n  `oi`.`order_id`,\n  JSON_ARRAYAGG(JSON_OBJECT('product_id', `oi`.`product_id`, 'quantity', `oi`.`quantity`))\nFROM\n  `order_items` AS `oi`\nGROUP BY\n  `oi`.`order_id`"
        )
        expect(bindings).to.be.eql([])
      })
    })
  })

  describe('coalesce() function', () => {
    describe('basic usage', () => {
      it('SELECT COALESCE(description, ?) FROM `items`', () => {
        const [sql, bindings] = builder
          .from('items')
          .column(coalesce(unescape('description'), 'No description'))
          .toSQL()
        expect(sql).to.be.eql(
          'SELECT\n  COALESCE(description, ?)\nFROM\n  `items`'
        )
        expect(bindings).to.be.eql(['No description'])
      })

      it('SELECT COALESCE(description, short_desc, summary, ?) FROM `items`', () => {
        const [sql, bindings] = builder
          .from('items')
          .column(
            coalesce(unescape('description'), unescape('short_desc'), unescape('summary'), 'No description')
          )
          .toSQL()
        expect(sql).to.be.eql(
          'SELECT\n  COALESCE(description, short_desc, summary, ?)\nFROM\n  `items`'
        )
        expect(bindings).to.be.eql(['No description'])
      })
    })

    describe('with numeric defaults', () => {
      it('SELECT COALESCE(discount, ?) FROM `products`', () => {
        const [sql, bindings] = builder
          .from('products')
          .column(coalesce(unescape('discount'), 0))
          .toSQL()
        expect(sql).to.be.eql(
          'SELECT\n  COALESCE(discount, ?)\nFROM\n  `products`'
        )
        expect(bindings).to.be.eql([0])
      })
    })

    describe('with JSON aggregation', () => {
      it("SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT('id', `o`.`id`, 'ordered_at', `o`.`created_at`)), ?) FROM `order` AS `o`", () => {
        const [sql, bindings] = builder
          .from('order', 'o')
          .column(
            coalesce(
              json_array_aggregate(
                json_object({ id: 'o.id', ordered_at: 'o.created_at' })
              ),
              '[]'
            )
          )
          .toSQL()
        expect(sql).to.be.eql(
          "SELECT\n  COALESCE(JSON_ARRAYAGG(JSON_OBJECT('id', `o`.`id`, 'ordered_at', `o`.`created_at`)), ?)\nFROM\n  `order` AS `o`"
        )
        expect(bindings).to.be.eql(['[]'])
      })

      it("SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT('id', `u`.`id`, 'name', `u`.`name`)), ?) FROM `users` AS `u`", () => {
        const [sql, bindings] = builder
          .from('users', 'u')
          .column(
            coalesce(
              json_array_aggregate(json_object({ id: 'u.id', name: 'u.name' })),
              '{}'
            )
          )
          .toSQL()
        expect(sql).to.be.eql(
          "SELECT\n  COALESCE(JSON_ARRAYAGG(JSON_OBJECT('id', `u`.`id`, 'name', `u`.`name`)), ?)\nFROM\n  `users` AS `u`"
        )
        expect(bindings).to.be.eql(['{}'])
      })
    })

    describe('with aggregate functions', () => {
      it('SELECT COALESCE(MAX(score), ?) FROM `users`', () => {
        const [sql, bindings] = builder
          .from('users')
          .column(coalesce(unescape('MAX(score)'), 0))
          .toSQL()
        expect(sql).to.be.eql(
          'SELECT\n  COALESCE(MAX(score), ?)\nFROM\n  `users`'
        )
        expect(bindings).to.be.eql([0])
      })

      it('SELECT COALESCE(SUM(total_amount), ?) FROM `orders`', () => {
        const [sql, bindings] = builder
          .from('orders')
          .column(coalesce(unescape('SUM(total_amount)'), 0))
          .toSQL()
        expect(sql).to.be.eql(
          'SELECT\n  COALESCE(SUM(total_amount), ?)\nFROM\n  `orders`'
        )
        expect(bindings).to.be.eql([0])
      })
    })
  })

  describe('complex queries', () => {
    describe('user order history with JSON aggregation', () => {
      it("SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT('id', `o`.`id`, 'ordered_at', `o`.`created_at`)), ?) FROM `order` AS `o` WHERE (`order`.`user_id` = u.id) ORDER BY `o`.`created_at` desc LIMIT 5", () => {
        const [sql, bindings] = createBuilder()
          .from('order', 'o')
          .column(
            coalesce(
              json_array_aggregate(
                json_object({ id: 'o.id', ordered_at: 'o.created_at' })
              ),
              '[]'
            )
          )
          .where('order.user_id', unescape('u.id'))
          .orderBy('o.created_at', 'desc')
          .limit(5)
          .toSQL()
        expect(sql).to.be.eql(
          "SELECT\n  COALESCE(JSON_ARRAYAGG(JSON_OBJECT('id', `o`.`id`, 'ordered_at', `o`.`created_at`)), ?)\nFROM\n  `order` AS `o`\nWHERE\n  (`order`.`user_id` = u.id)\nORDER BY\n  `o`.`created_at` DESC\nLIMIT 5"
        )
        expect(bindings).to.be.eql(['[]'])
      })
    })

    describe('user orders summary with nested JSON', () => {
      it("SELECT JSON_OBJECT('user_name', `u`.`name`, 'orders', COALESCE(JSON_ARRAYAGG(JSON_OBJECT('order_id', `o`.`id`, 'total', `o`.`total_amount`, 'date', `o`.`created_at`)), ?)) FROM `orders` AS `o` INNER JOIN `users` AS `u` ON `o`.`user_id` = `u`.`id` GROUP BY `u`.`id`", () => {
        const [sql, bindings] = createBuilder()
          .from('orders', 'o')
          .join('inner', 'users', 'u', '`o`.`user_id` = `u`.`id`')
          .column(
            json_object({
              user_name: 'u.name',
              orders: coalesce(
                json_array_aggregate(
                  json_object({
                    order_id: 'o.id',
                    total: 'o.total_amount',
                    date: 'o.created_at'
                  })
                ),
                '[]'
              )
            })
          )
          .groupBy('u.id')
          .toSQL()
        expect(sql).to.be.eql(
          "SELECT\n  JSON_OBJECT('user_name', `u`.`name`, 'orders', COALESCE(JSON_ARRAYAGG(JSON_OBJECT('order_id', `o`.`id`, 'total', `o`.`total_amount`, 'date', `o`.`created_at`)), ?))\nFROM\n  `orders` AS `o`\nINNER JOIN `users` AS `u` ON `o`.`user_id` = `u`.`id`\nGROUP BY\n  `u`.`id`"
        )
        expect(bindings).to.be.eql(['[]'])
      })
    })

    describe('product aggregation by category', () => {
      it("SELECT `p`.`category`, COALESCE(JSON_ARRAYAGG(JSON_OBJECT('id', `p`.`id`, 'name', `p`.`name`, 'price', `p`.`price`, 'in_stock', `p`.`stock_quantity`)), ?) AS `products_json` FROM `products` AS `p` GROUP BY `p`.`category` HAVING (COUNT(*) > ?)", () => {
        const [sql, bindings] = createBuilder()
          .from('products', 'p')
          .column('p.category')
          .column(
            coalesce(
              json_array_aggregate(
                json_object({
                  id: 'p.id',
                  name: 'p.name',
                  price: 'p.price',
                  in_stock: 'p.stock_quantity'
                })
              ),
              '[]'
            ),
            'products_json'
          )
          .groupBy('p.category')
          .having(unescape('COUNT(*)'), '>', 0)
          .toSQL()
        expect(sql).to.be.eql(
          "SELECT\n  `p`.`category`,\n  COALESCE(JSON_ARRAYAGG(JSON_OBJECT('id', `p`.`id`, 'name', `p`.`name`, 'price', `p`.`price`, 'in_stock', `p`.`stock_quantity`)), ?) AS `products_json`\nFROM\n  `products` AS `p`\nGROUP BY\n  `p`.`category`\nHAVING\n  (COUNT(*) > ?)"
        )
        expect(bindings).to.be.eql(['[]', 0])
      })
    })
  })

  describe('PostgreSQL driver', () => {
    describe('json_object() function with PostgreSQL driver', () => {
      describe('basic usage', () => {
        it('SELECT json_build_object(\'id\', "id", \'name\', "name") FROM "users"', () => {
          const [sql, bindings] = postgresqlBuilder
            .from('users')
            .column(json_object({ id: 'id', name: 'name' }))
            .toSQL()
          expect(sql).to.be.eql(
            'SELECT\n  json_build_object(\'id\', "id", \'name\', "name")\nFROM\n  "users"'
          )
          expect(bindings).to.be.eql([])
        })

        it('SELECT json_build_object(\'id\', "id", \'name\', "name", \'email\', "email", \'created\', "created_at") FROM "users"', () => {
          const [sql, bindings] = postgresqlBuilder
            .from('users')
            .column(
              json_object({
                id: 'id',
                name: 'name',
                email: 'email',
                created: 'created_at'
              })
            )
            .toSQL()
          expect(sql).to.be.eql(
            'SELECT\n  json_build_object(\'id\', "id", \'name\', "name", \'email\', "email", \'created\', "created_at")\nFROM\n  "users"'
          )
          expect(bindings).to.be.eql([])
        })
      })

      describe('with table aliases', () => {
        it('SELECT json_build_object(\'id\', "o"."id", \'ordered_at\', "o"."created_at") FROM "order" AS "o"', () => {
          const [sql, bindings] = postgresqlBuilder
            .from('order', 'o')
            .column(json_object({ id: 'o.id', ordered_at: 'o.created_at' }))
            .toSQL()
          expect(sql).to.be.eql(
            'SELECT\n  json_build_object(\'id\', "o"."id", \'ordered_at\', "o"."created_at")\nFROM\n  "order" AS "o"'
          )
          expect(bindings).to.be.eql([])
        })
      })
    })

    describe('json_array_aggregate() function with PostgreSQL driver', () => {
      describe('basic usage', () => {
        it('SELECT json_agg(json_build_object(\'sku\', "sku", \'price\', "price")) FROM "products"', () => {
          const [sql, bindings] = postgresqlBuilder
            .from('products')
            .column(
              json_array_aggregate(json_object({ sku: 'sku', price: 'price' }))
            )
            .toSQL()
          expect(sql).to.be.eql(
            'SELECT\n  json_agg(json_build_object(\'sku\', "sku", \'price\', "price"))\nFROM\n  "products"'
          )
          expect(bindings).to.be.eql([])
        })

        it('SELECT json_agg(name) FROM "users"', () => {
          const [sql, bindings] = postgresqlBuilder
            .from('users')
            .column(json_array_aggregate(unescape('name')))
          .toSQL()
          expect(sql).to.be.eql('SELECT\n  json_agg(name)\nFROM\n  "users"')
          expect(bindings).to.be.eql([])
        })
      })
    })
  })
})
