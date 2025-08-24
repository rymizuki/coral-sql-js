import { expect } from 'chai'
import { createConditions, SQLBuilderConditionsPort, unescape, Field } from '../../dist'

describe('conditions', () => {
  let builder: SQLBuilderConditionsPort

  beforeEach(() => {
    builder = createConditions()
  })

  describe('.add', () => {
    describe('conjunction: and', () => {
      it('"a = ? AND b = ?", [10, 20]', () => {
        const [sql, bindings] = builder
          .add('and', 'a', 10)
          .add('and', 'b', 20)
          .toSQL()
        expect(sql).to.be.eql('(`a` = ?)\n  AND (`b` = ?)')
        expect(bindings).to.be.eql([10, 20])
      })
    })

    describe('conjunction: or', () => {
      it('"a = ? OR b = ?", [10, 20]', () => {
        const [sql, bindings] = builder
          .add('and', 'a', 10)
          .add('or', 'b', 20)
          .toSQL()
        expect(sql).to.be.eql('(`a` = ?)\n  OR (`b` = ?)')
        expect(bindings).to.be.eql([10, 20])
      })
    })

    describe('use conditions instance', () => {
      it('"a = ? OR a = ?", [1, 10]', () => {
        const [sql, bindings] = builder
          .add('and', createConditions().and('a', 1).or('a', 10))
          .toSQL()
        expect(sql).to.be.eql('((`a` = ?)\n  OR (`a` = ?))')
        expect(bindings).to.be.eql([1, 10])
      })
    })
  })

  describe('.and', () => {
    it('"a = ? AND b = ?", [10, 20]', () => {
      const [sql, bindings] = builder.and('a', 10).and('b', 20).toSQL()
      expect(sql).to.be.eql('(`a` = ?)\n  AND (`b` = ?)')
      expect(bindings).to.be.eql([10, 20])
    })
  })

  describe('.or', () => {
    it('"a = ? OR b = ?", [10, 20]', () => {
      const [sql, bindings] = builder.and('a', 10).or('b', 20).toSQL()
      expect(sql).to.be.eql('(`a` = ?)\n  OR (`b` = ?)')
      expect(bindings).to.be.eql([10, 20])
    })
  })

  describe('FieldPort support in condition values', () => {
    describe('with unescape() function', () => {
      it('supports unescape as condition value', () => {
        const [sql, bindings] = builder
          .and('patient_id', unescape('p.id'))
          .toSQL()
        expect(sql).to.be.eql('(`patient_id` = p.id)')
        expect(bindings).to.be.eql([])
      })

      it('supports unescape with operators', () => {
        const [sql, bindings] = builder
          .and('patient_id', '!=', unescape('p.id'))
          .toSQL()
        expect(sql).to.be.eql('(`patient_id` != p.id)')
        expect(bindings).to.be.eql([])
      })

      it('supports mixed regular values and unescape', () => {
        const [sql, bindings] = builder
          .and('patient_id', unescape('p.id'))
          .and('status', 'active')
          .toSQL()
        expect(sql).to.be.eql('(`patient_id` = p.id)\n  AND (`status` = ?)')
        expect(bindings).to.be.eql(['active'])
      })
    })

    describe('with Field instance', () => {
      it('supports Field instance as condition value', () => {
        const field = new Field('user.name', true) // unescaped
        const [sql, bindings] = builder
          .and('display_name', field)
          .toSQL()
        expect(sql).to.be.eql('(`display_name` = user.name)')
        expect(bindings).to.be.eql([])
      })

      it('supports escaped Field instance as condition value', () => {
        const field = new Field('user_name', false) // escaped
        const [sql, bindings] = builder
          .and('display_name', field)
          .toSQL()
        expect(sql).to.be.eql('(`display_name` = `user_name`)')
        expect(bindings).to.be.eql([])
      })

      it('supports Field instance with operators', () => {
        const field = new Field('other_table.id', true)
        const [sql, bindings] = builder
          .and('table_id', '<>', field)
          .toSQL()
        expect(sql).to.be.eql('(`table_id` <> other_table.id)')
        expect(bindings).to.be.eql([])
      })
    })

    describe('complex scenarios', () => {
      it('supports EXISTS with unescape in condition', () => {
        const existsBuilder = createConditions()
          .and('pt.patient_id', unescape('p.id'))
          .and('pt.value', 'test_value')
        
        const [sql, bindings] = builder
          .and(existsBuilder)
          .toSQL()
        expect(sql).to.be.eql('((`pt`.`patient_id` = p.id)\n  AND (`pt`.`value` = ?))')
        expect(bindings).to.be.eql(['test_value'])
      })
    })
  })
})