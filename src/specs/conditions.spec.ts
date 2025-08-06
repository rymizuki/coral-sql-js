import { expect } from 'chai'
import { createConditions, SQLBuilderConditionsPort } from '../../dist'

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
})