import { expect } from 'chai'
import {
  createBuilder,
  createConditions,
  exists,
  not_exists,
  unescape,
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

  describe('exists with FieldPort support', () => {
    it('exists subquery with unescape in conditions', () => {
      const subquery = createBuilder()
        .from('patient_telephone', 'pt')
        .column(unescape('1'))
        .where(
          createConditions()
            .and('pt.patient_id', unescape('p.id'))
            .and('pt.value', 'test_value'),
        )

      const [sql, bindings] = builder
        .from('patients', 'p')
        .where('p.active', true)
        .where('p.id', exists(subquery))
        .toSQL()

      expect(sql).to.be.eql(
        'SELECT\n  *\nFROM\n  `patients` AS `p`\nWHERE\n  (`p`.`active` = ?)\n  AND (`p`.`id` EXISTS (SELECT\n  1\nFROM\n  `patient_telephone` AS `pt`\nWHERE\n  ((`pt`.`patient_id` = p.id)\n  AND (`pt`.`value` = ?))))'
      )
      expect(bindings).to.be.eql([1, 'test_value'])
    })

    it('exists with mixed escaped and unescaped field comparisons', () => {
      const subquery = createBuilder()
        .from('user_roles', 'ur')
        .where('ur.user_id', unescape('u.id'))
        .where('ur.role_name', 'admin')

      const [sql, bindings] = builder
        .from('users', 'u')
        .where('u.status', 'active')
        .where('u.id', exists(subquery))
        .toSQL()

      expect(sql).to.be.eql(
        'SELECT\n  *\nFROM\n  `users` AS `u`\nWHERE\n  (`u`.`status` = ?)\n  AND (`u`.`id` EXISTS (SELECT\n  *\nFROM\n  `user_roles` AS `ur`\nWHERE\n  (`ur`.`user_id` = u.id)\n  AND (`ur`.`role_name` = ?)))'
      )
      expect(bindings).to.be.eql(['active', 'admin'])
    })

    it('not exists with unescape condition value', () => {
      const subquery = createBuilder()
        .from('deleted_users', 'du')
        .where('du.original_id', unescape('u.id'))

      const [sql, bindings] = builder
        .from('users', 'u')
        .where('u.id', not_exists(subquery))
        .toSQL()

      expect(sql).to.be.eql(
        'SELECT\n  *\nFROM\n  `users` AS `u`\nWHERE\n  (`u`.`id` NOT EXISTS (SELECT\n  *\nFROM\n  `deleted_users` AS `du`\nWHERE\n  (`du`.`original_id` = u.id)))'
      )
      expect(bindings).to.be.eql([])
    })
  })

  
  describe('standard EXISTS syntax', () => {
    it('supports standalone EXISTS without field binding', () => {
      const subquery = createBuilder()
        .column(unescape('1'))
        .from('user_telephone', 't')
        .where('user.id', unescape('t.user_id'))
        .where('t.value', 'phone_number')

      const [sql, bindings] = builder
        .from('user')
        .where(exists(subquery))
        .toSQL()

      expect(sql).to.be.eql(
        'SELECT\n  *\nFROM\n  `user`\nWHERE\n  EXISTS (SELECT\n  1\nFROM\n  `user_telephone` AS `t`\nWHERE\n  (`user`.`id` = t.user_id)\n  AND (`t`.`value` = ?))'
      )
      expect(bindings).to.be.eql(['phone_number'])
    })

    it('supports complex standalone EXISTS with multiple conditions', () => {
      const subquery = createBuilder()
        .column(unescape('1'))
        .from('orders', 'o')
        .where('o.user_id', unescape('users.id'))
        .where('o.status', 'completed')
        .where('o.amount', '>', 100)

      const [sql, bindings] = builder
        .from('users')
        .where('active', true)
        .where(exists(subquery))
        .toSQL()

      expect(sql).to.be.eql(
        'SELECT\n  *\nFROM\n  `users`\nWHERE\n  (`active` = ?)\n  AND EXISTS (SELECT\n  1\nFROM\n  `orders` AS `o`\nWHERE\n  (`o`.`user_id` = users.id)\n  AND (`o`.`status` = ?)\n  AND (`o`.`amount` > ?))'
      )
      expect(bindings).to.be.eql([1, 'completed', 100])
    })

    it('supports standalone NOT EXISTS', () => {
      const subquery = createBuilder()
        .from('deleted_users', 'du')
        .where('du.original_id', unescape('u.id'))

      const [sql, bindings] = builder
        .from('users', 'u')
        .where(not_exists(subquery))
        .toSQL()

      expect(sql).to.be.eql(
        'SELECT\n  *\nFROM\n  `users` AS `u`\nWHERE\n  NOT EXISTS (SELECT\n  *\nFROM\n  `deleted_users` AS `du`\nWHERE\n  (`du`.`original_id` = u.id))'
      )
      expect(bindings).to.be.eql([])
    })

    it('supports mixed conditions with standalone EXISTS', () => {
      const subquery = createBuilder()
        .from('user_roles', 'ur')
        .where('ur.user_id', unescape('u.id'))
        .where('ur.role', 'admin')

      const [sql, bindings] = createConditions()
        .and('u.status', 'active')
        .and(exists(subquery))
        .or('u.is_superuser', true)
        .toSQL()

      expect(sql).to.be.eql(
        '(`u`.`status` = ?)\n  AND EXISTS (SELECT\n  *\nFROM\n  `user_roles` AS `ur`\nWHERE\n  (`ur`.`user_id` = u.id)\n  AND (`ur`.`role` = ?))\n  OR (`u`.`is_superuser` = ?)'
      )
      expect(bindings).to.be.eql(['active', 'admin', 1])
    })
  })
})