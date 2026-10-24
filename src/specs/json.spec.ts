import { expect } from 'chai'
import {
  createBuilder,
  coalesce,
  column_ref,
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
      it("SELECT JSON_OBJECT(?, `id`, ?, `name`) FROM `users`", () => {
        const [sql, bindings] = builder
          .from('users')
          .column(json_object({ id: 'id', name: 'name' }))
          .toSQL()
        expect(sql).to.be.eql(
          "SELECT\n  JSON_OBJECT(?, `id`, ?, `name`)\nFROM\n  `users`"
        )
        expect(bindings).to.be.eql(['id', 'name'])
      })

      it("SELECT JSON_OBJECT(?, `id`, ?, `name`, ?, `email`, ?, `created_at`) FROM `users`", () => {
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
          "SELECT\n  JSON_OBJECT(?, `id`, ?, `name`, ?, `email`, ?, `created_at`)\nFROM\n  `users`"
        )
        expect(bindings).to.be.eql(['id', 'name', 'email', 'created'])
      })
    })

    describe('with table aliases', () => {
      it("SELECT JSON_OBJECT(?, `o`.`id`, ?, `o`.`created_at`) FROM `order` AS `o`", () => {
        const [sql, bindings] = builder
          .from('order', 'o')
          .column(json_object({ id: 'o.id', ordered_at: 'o.created_at' }))
          .toSQL()
        expect(sql).to.be.eql(
          "SELECT\n  JSON_OBJECT(?, `o`.`id`, ?, `o`.`created_at`)\nFROM\n  `order` AS `o`"
        )
        expect(bindings).to.be.eql(['id', 'ordered_at'])
      })

      it("SELECT JSON_OBJECT(?, `o`.`id`, ?, `u`.`name`, ?, `u`.`email`) FROM `orders` AS `o` INNER JOIN `users` AS `u` ON `o`.`user_id` = `u`.`id`", () => {
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
          "SELECT\n  JSON_OBJECT(?, `o`.`id`, ?, `u`.`name`, ?, `u`.`email`)\nFROM\n  `orders` AS `o`\nINNER JOIN `users` AS `u` ON `o`.`user_id` = `u`.`id`"
        )
        expect(bindings).to.be.eql(['order_id', 'user_name', 'user_email'])
      })
    })

    describe('with unescape for raw SQL', () => {
      it("SELECT JSON_OBJECT(?, `id`, ?, COUNT(*)) FROM `users`", () => {
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
          "SELECT\n  JSON_OBJECT(?, `id`, ?, COUNT(*))\nFROM\n  `users`"
        )
        expect(bindings).to.be.eql(['id', 'count'])
      })

      it("SELECT JSON_OBJECT(?, SUM(amount), ?, AVG(amount), ?, MAX(amount)) FROM `sales`", () => {
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
          "SELECT\n  JSON_OBJECT(?, SUM(amount), ?, AVG(amount), ?, MAX(amount))\nFROM\n  `sales`"
        )
        expect(bindings).to.be.eql(['total', 'average', 'max'])
      })

      it("SELECT JSON_OBJECT(?, `oi`.`product_id`, ?, oi.quantity * oi.unit_price) FROM `order_items` AS `oi`", () => {
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
          "SELECT\n  JSON_OBJECT(?, `oi`.`product_id`, ?, oi.quantity * oi.unit_price)\nFROM\n  `order_items` AS `oi`"
        )
        expect(bindings).to.be.eql(['product_id', 'total'])
      })
    })
  })

  describe('json_array_aggregate() function', () => {
    describe('basic usage', () => {
      it("SELECT JSON_ARRAYAGG(JSON_OBJECT(?, `sku`, ?, `price`)) FROM `products`", () => {
        const [sql, bindings] = builder
          .from('products')
          .column(
            json_array_aggregate(json_object({ sku: 'sku', price: 'price' }))
          )
          .toSQL()
        expect(sql).to.be.eql(
          "SELECT\n  JSON_ARRAYAGG(JSON_OBJECT(?, `sku`, ?, `price`))\nFROM\n  `products`"
        )
        expect(bindings).to.be.eql(['sku', 'price'])
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
      it("SELECT JSON_ARRAYAGG(JSON_OBJECT(?, `oi`.`product_id`, ?, `oi`.`quantity`, ?, `oi`.`unit_price`, ?, oi.quantity * oi.unit_price)) FROM `order_items` AS `oi`", () => {
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
          "SELECT\n  JSON_ARRAYAGG(JSON_OBJECT(?, `oi`.`product_id`, ?, `oi`.`quantity`, ?, `oi`.`unit_price`, ?, oi.quantity * oi.unit_price))\nFROM\n  `order_items` AS `oi`"
        )
        expect(bindings).to.be.eql(['product_id', 'quantity', 'unit_price', 'total'])
      })
    })

    describe('with GROUP BY clause', () => {
      it("SELECT `oi`.`order_id`, JSON_ARRAYAGG(JSON_OBJECT(?, `oi`.`product_id`, ?, `oi`.`quantity`)) FROM `order_items` AS `oi` GROUP BY `oi`.`order_id`", () => {
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
          "SELECT\n  `oi`.`order_id`,\n  JSON_ARRAYAGG(JSON_OBJECT(?, `oi`.`product_id`, ?, `oi`.`quantity`))\nFROM\n  `order_items` AS `oi`\nGROUP BY\n  `oi`.`order_id`"
        )
        expect(bindings).to.be.eql(['product_id', 'quantity'])
      })
    })

    describe('with auto-coalesce feature', () => {
      it("SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT(?, `sku`, ?, `price`)), '[]') FROM `products`", () => {
        const [sql, bindings] = builder
          .from('products')
          .column(
            json_array_aggregate(json_object({ sku: 'sku', price: 'price' }), true)
          )
          .toSQL()
        expect(sql).to.be.eql(
          "SELECT\n  COALESCE(JSON_ARRAYAGG(JSON_OBJECT(?, `sku`, ?, `price`)), '[]')\nFROM\n  `products`"
        )
        expect(bindings).to.be.eql(['sku', 'price'])
      })

      it("New API with 'with_coalesce': SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT(?, `sku`, ?, `price`)), '[]') FROM `products`", () => {
        const [sql, bindings] = builder
          .from('products')
          .column(
            json_array_aggregate(json_object({ sku: 'sku', price: 'price' }), 'with_coalesce')
          )
          .toSQL()
        expect(sql).to.be.eql(
          "SELECT\n  COALESCE(JSON_ARRAYAGG(JSON_OBJECT(?, `sku`, ?, `price`)), '[]')\nFROM\n  `products`"
        )
        expect(bindings).to.be.eql(['sku', 'price'])
      })

      it("New API with 'without_coalesce': SELECT JSON_ARRAYAGG(JSON_OBJECT(?, `sku`, ?, `price`)) FROM `products`", () => {
        const [sql, bindings] = builder
          .from('products')
          .column(
            json_array_aggregate(json_object({ sku: 'sku', price: 'price' }), 'without_coalesce')
          )
          .toSQL()
        expect(sql).to.be.eql(
          "SELECT\n  JSON_ARRAYAGG(JSON_OBJECT(?, `sku`, ?, `price`))\nFROM\n  `products`"
        )
        expect(bindings).to.be.eql(['sku', 'price'])
      })

      it("SELECT COALESCE(JSON_ARRAYAGG(name), '[]') FROM `users`", () => {
        const [sql, bindings] = builder
          .from('users')
          .column(json_array_aggregate(unescape('name'), true))
          .toSQL()
        expect(sql).to.be.eql("SELECT\n  COALESCE(JSON_ARRAYAGG(name), '[]')\nFROM\n  `users`")
        expect(bindings).to.be.eql([])
      })

      it('Without auto-coalesce: SELECT JSON_ARRAYAGG(name) FROM `users`', () => {
        const [sql, bindings] = builder
          .from('users')
          .column(json_array_aggregate(unescape('name')))
          .toSQL()
        expect(sql).to.be.eql('SELECT\n  JSON_ARRAYAGG(name)\nFROM\n  `users`')
        expect(bindings).to.be.eql([])
      })
    })

    describe('PostgreSQL auto-coalesce with json type casting', () => {
      it("SELECT COALESCE(json_agg(json_build_object($1::text, \"sku\", $2::text, \"price\")), '[]'::json) FROM \"products\"", () => {
        const [sql, bindings] = postgresqlBuilder
          .from('products')
          .column(
            json_array_aggregate(json_object({ sku: 'sku', price: 'price' }), true)
          )
          .toSQL()
        expect(sql).to.be.eql(
          "SELECT\n  COALESCE(json_agg(json_build_object($1::text, \"sku\", $2::text, \"price\")), '[]'::json)\nFROM\n  \"products\""
        )
        expect(bindings).to.be.eql(['sku', 'price'])
      })

      it("New API with 'with_coalesce': SELECT COALESCE(json_agg(json_build_object($1::text, \"sku\", $2::text, \"price\")), '[]'::json) FROM \"products\"", () => {
        const [sql, bindings] = postgresqlBuilder
          .from('products')
          .column(
            json_array_aggregate(json_object({ sku: 'sku', price: 'price' }), 'with_coalesce')
          )
          .toSQL()
        expect(sql).to.be.eql(
          "SELECT\n  COALESCE(json_agg(json_build_object($1::text, \"sku\", $2::text, \"price\")), '[]'::json)\nFROM\n  \"products\""
        )
        expect(bindings).to.be.eql(['sku', 'price'])
      })

      it("SELECT COALESCE(json_agg(name), '[]'::json) FROM \"users\"", () => {
        const [sql, bindings] = postgresqlBuilder
          .from('users')
          .column(json_array_aggregate(unescape('name'), true))
          .toSQL()
        expect(sql).to.be.eql("SELECT\n  COALESCE(json_agg(name), '[]'::json)\nFROM\n  \"users\"")
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
      it("SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT(?, `o`.`id`, ?, `o`.`created_at`)), '[]') FROM `order` AS `o`", () => {
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
          "SELECT\n  COALESCE(JSON_ARRAYAGG(JSON_OBJECT(?, `o`.`id`, ?, `o`.`created_at`)), '[]')\nFROM\n  `order` AS `o`"
        )
        expect(bindings).to.be.eql(['id', 'ordered_at'])
      })

      it("SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT(?, `u`.`id`, ?, `u`.`name`)), '{}') FROM `users` AS `u`", () => {
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
          "SELECT\n  COALESCE(JSON_ARRAYAGG(JSON_OBJECT(?, `u`.`id`, ?, `u`.`name`)), '{}')\nFROM\n  `users` AS `u`"
        )
        expect(bindings).to.be.eql(['id', 'name'])
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

    describe('with JSON literal embedding', () => {
      it("SELECT COALESCE(JSON_ARRAYAGG(name), '[]') FROM `users`", () => {
        const [sql, bindings] = builder
          .from('users')
          .column(coalesce(json_array_aggregate(unescape('name')), '[]'))
          .toSQL()
        expect(sql).to.be.eql(
          "SELECT\n  COALESCE(JSON_ARRAYAGG(name), '[]')\nFROM\n  `users`"
        )
        expect(bindings).to.be.eql([])
      })

      it("SELECT COALESCE(JSON_OBJECT(?, `data`), '{}') FROM `items`", () => {
        const [sql, bindings] = builder
          .from('items')
          .column(coalesce(json_object({ data: 'data' }), '{}'))
          .toSQL()
        expect(sql).to.be.eql(
          "SELECT\n  COALESCE(JSON_OBJECT(?, `data`), '{}')\nFROM\n  `items`"
        )
        expect(bindings).to.be.eql(['data'])
      })

      it('Other string values still use placeholders: SELECT COALESCE(title, ?) FROM `articles`', () => {
        const [sql, bindings] = builder
          .from('articles')
          .column(coalesce(unescape('title'), 'Default Title'))
          .toSQL()
        expect(sql).to.be.eql(
          'SELECT\n  COALESCE(title, ?)\nFROM\n  `articles`'
        )
        expect(bindings).to.be.eql(['Default Title'])
      })
    })
  })

  describe('complex queries', () => {
    describe('user order history with JSON aggregation', () => {
      it("SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT(?, `o`.`id`, ?, `o`.`created_at`)), '[]') FROM `order` AS `o` WHERE (`order`.`user_id` = u.id) ORDER BY `o`.`created_at` desc LIMIT 5", () => {
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
          "SELECT\n  COALESCE(JSON_ARRAYAGG(JSON_OBJECT(?, `o`.`id`, ?, `o`.`created_at`)), '[]')\nFROM\n  `order` AS `o`\nWHERE\n  (`order`.`user_id` = u.id)\nORDER BY\n  `o`.`created_at` DESC\nLIMIT 5"
        )
        expect(bindings).to.be.eql(['id', 'ordered_at'])
      })
    })

    describe('user orders summary with nested JSON', () => {
      it("SELECT JSON_OBJECT(?, `u`.`name`, ?, COALESCE(JSON_ARRAYAGG(JSON_OBJECT(?, `o`.`id`, ?, `o`.`total_amount`, ?, `o`.`created_at`)), '[]')) FROM `orders` AS `o` INNER JOIN `users` AS `u` ON `o`.`user_id` = `u`.`id` GROUP BY `u`.`id`", () => {
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
          "SELECT\n  JSON_OBJECT(?, `u`.`name`, ?, COALESCE(JSON_ARRAYAGG(JSON_OBJECT(?, `o`.`id`, ?, `o`.`total_amount`, ?, `o`.`created_at`)), '[]'))\nFROM\n  `orders` AS `o`\nINNER JOIN `users` AS `u` ON `o`.`user_id` = `u`.`id`\nGROUP BY\n  `u`.`id`"
        )
        expect(bindings).to.be.eql(['user_name', 'orders', 'order_id', 'total', 'date'])
      })
    })

    describe('product aggregation by category', () => {
      it("SELECT `p`.`category`, COALESCE(JSON_ARRAYAGG(JSON_OBJECT(?, `p`.`id`, ?, `p`.`name`, ?, `p`.`price`, ?, `p`.`stock_quantity`)), '[]') AS `products_json` FROM `products` AS `p` GROUP BY `p`.`category` HAVING (COUNT(*) > ?)", () => {
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
          "SELECT\n  `p`.`category`,\n  COALESCE(JSON_ARRAYAGG(JSON_OBJECT(?, `p`.`id`, ?, `p`.`name`, ?, `p`.`price`, ?, `p`.`stock_quantity`)), '[]') AS `products_json`\nFROM\n  `products` AS `p`\nGROUP BY\n  `p`.`category`\nHAVING\n  (COUNT(*) > ?)"
        )
        expect(bindings).to.be.eql(['id', 'name', 'price', 'in_stock', 0])
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
            'SELECT\n  json_build_object($1::text, "id", $2::text, "name")\nFROM\n  "users"'
          )
          expect(bindings).to.be.eql(['id', 'name'])
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
            'SELECT\n  json_build_object($1::text, "id", $2::text, "name", $3::text, "email", $4::text, "created_at")\nFROM\n  "users"'
          )
          expect(bindings).to.be.eql(['id', 'name', 'email', 'created'])
        })
      })

      describe('with table aliases', () => {
        it('SELECT json_build_object(\'id\', "o"."id", \'ordered_at\', "o"."created_at") FROM "order" AS "o"', () => {
          const [sql, bindings] = postgresqlBuilder
            .from('order', 'o')
            .column(json_object({ id: 'o.id', ordered_at: 'o.created_at' }))
            .toSQL()
          expect(sql).to.be.eql(
            'SELECT\n  json_build_object($1::text, "o"."id", $2::text, "o"."created_at")\nFROM\n  "order" AS "o"'
          )
          expect(bindings).to.be.eql(['id', 'ordered_at'])
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
            'SELECT\n  json_agg(json_build_object($1::text, "sku", $2::text, "price"))\nFROM\n  "products"'
          )
          expect(bindings).to.be.eql(['sku', 'price'])
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

  describe('SQLite driver', () => {
    let sqliteBuilder: SQLBuilderPort

    beforeEach(() => {
      sqliteBuilder = new SQLBuilder({ driver: 'sqlite' }) as unknown as SQLBuilderPort
    })

    describe('json_array_aggregate() function with SQLite driver', () => {
      it('SELECT json_group_array(`name`) FROM `users`', () => {
        const [sql, bindings] = sqliteBuilder
          .from('users')
          .column(json_array_aggregate(column_ref('name')))
          .toSQL()
        expect(sql).to.be.eql(
          'SELECT\n  json_group_array(`name`)\nFROM\n  `users`'
        )
        expect(bindings).to.be.eql([])
      })

      it("with 'with_coalesce': SELECT COALESCE(json_group_array(`name`), '[]') FROM `users`", () => {
        const [sql, bindings] = sqliteBuilder
          .from('users')
          .column(json_array_aggregate(column_ref('name'), 'with_coalesce'))
          .toSQL()
        expect(sql).to.be.eql(
          "SELECT\n  COALESCE(json_group_array(`name`), '[]')\nFROM\n  `users`"
        )
        expect(bindings).to.be.eql([])
      })
    })
  })

  describe('bindings', () => {
    it('coalesce を WHERE の左辺に使うと postgresql で $N の連番になる', () => {
      const [sql, bindings] = createBuilder()
        .from('t')
        .where(coalesce('a', 'b'), '=', 'c')
        .toSQL({ driver: 'postgresql' })
      expect(sql).to.be.eql(
        'SELECT\n  *\nFROM\n  "t"\nWHERE\n  ((COALESCE($1, $2)) = $3)'
      )
      expect(bindings).to.be.eql(['a', 'b', 'c'])
    })

    it('json_object のキーはプレースホルダになり bindings に入る', () => {
      const key = "a', (SELECT 1), 'b"
      const [sql, bindings] = createBuilder()
        .from('t')
        .column(json_object({ [key]: 'id' }))
        .toSQL()
      expect(sql).to.be.eql('SELECT\n  JSON_OBJECT(?, `id`)\nFROM\n  `t`')
      expect(bindings).to.be.eql([key])
    })

    it('json_object のキーは postgresql で $N::text になる', () => {
      const key = "a', (SELECT 1), 'b"
      const [sql, bindings] = createBuilder()
        .from('t')
        .column(json_object({ [key]: 'id' }))
        .toSQL({ driver: 'postgresql' })
      expect(sql).to.be.eql('SELECT\n  json_build_object($1::text, "id")\nFROM\n  "t"')
      expect(bindings).to.be.eql([key])
    })
  })
})
