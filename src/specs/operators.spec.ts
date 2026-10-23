import { expect } from 'chai'
import {
  case_when,
  createBuilder,
  createConditions,
  is_not_null,
  is_null,
  SQLBuilderOperator
} from '../../dist'

describe('operators', () => {
  describe('comparison', () => {
    it('"a = ?", [1]', () => {
      const [sql, bindings] = createConditions().and('a', 1).toSQL()
      expect(sql).to.be.eql('(`a` = ?)')
      expect(bindings).to.be.eql([1])
    })

    it('"a != ?", [1]', () => {
      const [sql, bindings] = createConditions().and('a', '!=', 1).toSQL()
      expect(sql).to.be.eql('(`a` != ?)')
      expect(bindings).to.be.eql([1])
    })

    it('"a <> ?" [1]', () => {
      const [sql, bindings] = createConditions().and('a', '<>', 1).toSQL()
      expect(sql).to.be.eql('(`a` <> ?)')
      expect(bindings).to.be.eql([1])
    })

    it('"a <> ?" [1]', () => {
      const [sql, bindings] = createConditions().and('a', '<>', 1).toSQL()
      expect(sql).to.be.eql('(`a` <> ?)')
      expect(bindings).to.be.eql([1])
    })

    it('"a < ?" [1]', () => {
      const [sql, bindings] = createConditions().and('a', '<', 1).toSQL()
      expect(sql).to.be.eql('(`a` < ?)')
      expect(bindings).to.be.eql([1])
    })

    it('"a <= ?" [1]', () => {
      const [sql, bindings] = createConditions().and('a', '<=', 1).toSQL()
      expect(sql).to.be.eql('(`a` <= ?)')
      expect(bindings).to.be.eql([1])
    })

    it('"a >= ?" [1]', () => {
      const [sql, bindings] = createConditions().and('a', '>=', 1).toSQL()
      expect(sql).to.be.eql('(`a` >= ?)')
      expect(bindings).to.be.eql([1])
    })

    it('"a > ?" [1]', () => {
      const [sql, bindings] = createConditions().and('a', '>', 1).toSQL()
      expect(sql).to.be.eql('(`a` > ?)')
      expect(bindings).to.be.eql([1])
    })
  })

  describe('in', () => {
    describe('specified operator', () => {
      it('"a IN (?,?)" [1, 2]', () => {
        const [sql, bindings] = createConditions()
          .and('a', 'in', [1, 2])
          .toSQL()
        expect(sql).to.be.eql('(`a` IN (?,?))')
        expect(bindings).to.be.eql([1, 2])
      })
    })

    describe('omitted operator', () => {
      it('"a IN (?,?)" [1, 2]', () => {
        const [sql, bindings] = createConditions().and('a', [1, 2]).toSQL()
        expect(sql).to.be.eql('(`a` IN (?,?))')
        expect(bindings).to.be.eql([1, 2])
      })
    })

    describe('denied', () => {
      it('"a NOT IN (?,?)" [1, 2]', () => {
        const [sql, bindings] = createConditions()
          .and('a', 'not in', [1, 2])
          .toSQL()
        expect(sql).to.be.eql('(`a` NOT IN (?,?))')
        expect(bindings).to.be.eql([1, 2])
      })
    })
  })

  describe('like', () => {
    it('"a LIKE ?" ["a%"]', () => {
      const [sql, bindings] = createConditions().and('a', 'like', 'a%').toSQL()
      expect(sql).to.be.eql('(`a` LIKE ?)')
      expect(bindings).to.be.eql(['a%'])
    })

    it('"a NOT LIKE ?" ["a%"]', () => {
      const [sql, bindings] = createConditions()
        .and('a', 'not like', 'a%')
        .toSQL()
      expect(sql).to.be.eql('(`a` NOT LIKE ?)')
      expect(bindings).to.be.eql(['a%'])
    })
  })

  describe('is null', () => {
    it('"a IS NULL", []', () => {
      const [sql, bindings] = createConditions().and('a', is_null()).toSQL()
      expect(sql).to.be.eql('(`a` IS NULL)')
      expect(bindings).to.be.eql([])
    })
    it('"a IS NOT NULL", []', () => {
      const [sql, bindings] = createConditions().and('a', is_not_null()).toSQL()
      expect(sql).to.be.eql('(`a` IS NOT NULL)')
      expect(bindings).to.be.eql([])
    })
  })

  describe('between', () => {
    it('"a BETWEEN ? AND ?", [1, 10]', () => {
      const [sql, bindings] = createConditions()
        .and('a', 'between', [1, 10])
        .toSQL()
      expect(sql).to.be.eql('(`a` BETWEEN ? AND ?)')
      expect(bindings).to.be.eql([1, 10])
    })
  })

  describe('regexp', () => {
    it('"a REGEXP ?", ["^a"]', () => {
      const [sql, bindings] = createConditions()
        .and('a', 'regexp', '^a')
        .toSQL()
      expect(sql).to.be.eql('(`a` REGEXP ?)')
      expect(bindings).to.be.eql(['^a'])
    })
  })

  describe('未対応の演算子', () => {
    it('where() に渡すと unsupported operator を投げる', () => {
      expect(() =>
        createBuilder()
          .from('t')
          .where('id', '= 1 OR 1=1 OR id =' as SQLBuilderOperator, 5)
          .toSQL()
      ).to.throw('unsupported operator')
    })

    it('case_when() の when に渡すと unsupported operator を投げる', () => {
      expect(() =>
        createBuilder()
          .from('t')
          .column(
            case_when()
              .when('a', '= 1 OR 1=1 OR a =' as SQLBuilderOperator, 1)
              .then('y')
          )
          .toSQL()
      ).to.throw('unsupported operator')
    })
  })
})
