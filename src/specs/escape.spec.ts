import { expect } from 'chai'
import { case_when, createBuilder } from '../../dist'

type Options = Parameters<typeof createBuilder>[0]

const selectedColumn = (field: string, options?: Options): string => {
  const [sql] = createBuilder(options).column(field).from('t').toSQL()
  return sql.split('\n')[1].trim()
}

const whenSQL = (field: string, options?: Options): string => {
  const [sql] = createBuilder(options)
    .column(case_when().when(field, '=', 1).then(1))
    .from('t')
    .toSQL()
  return sql
}

const requoteCases: Array<[string, string]> = [
  ['t`x', '`t``x`'],
  ['a`b', '`a``b`'],
  ['`t`x', '```t``x`'],
  ['"a\\"""', '`"a\\"""`']
]

const passthroughCases: Array<[string, string]> = [
  ['`users`.id', '`users`.`id`'],
  ['"users"."id"', '"users"."id"'],
  ["'lit'", "'lit'"],
  ['users.id', '`users`.`id`']
]

const postgresqlCases: Array<[string, string]> = [
  ['a"b', '"a""b"'],
  ['`t`x', '"`t`x"'],
  ['"users"."id"', '"users"."id"'],
  ['`x; DROP TABLE users; --`', '"`x; DROP TABLE users; --`"'],
  ['"a""b"', '"""a""""b"""']
]

describe('escape (identifier quoting via the public builder)', () => {
  describe('column() with mysql driver (default)', () => {
    describe('fragment contains the quote character', () => {
      requoteCases.forEach(([input, expected]) => {
        it(`${input} -> ${expected}`, () => {
          expect(selectedColumn(input)).to.be.eql(expected)
        })
      })
    })

    describe('fragment is fully quoted or a plain identifier', () => {
      passthroughCases.forEach(([input, expected]) => {
        it(`${input} -> ${expected}`, () => {
          expect(selectedColumn(input)).to.be.eql(expected)
        })
      })
    })
  })

  describe('column() with postgresql driver', () => {
    postgresqlCases.forEach(([input, expected]) => {
      it(`${input} -> ${expected}`, () => {
        expect(selectedColumn(input, { driver: 'postgresql' })).to.be.eql(
          expected
        )
      })
    })
  })

  describe('column() with mysql driver and an already doubled quote', () => {
    it('`a``b` is doubled again', () => {
      expect(selectedColumn('`a``b`')).to.be.eql('```a````b```')
    })
  })

  describe('column() with quote: null', () => {
    it('users.id is output as-is', () => {
      expect(selectedColumn('users.id', { quote: null })).to.be.eql('users.id')
    })
  })

  describe('other places that take identifiers', () => {
    it('from() doubles the quote character in a table name', () => {
      const [sql] = createBuilder().column('id').from('t`x').toSQL()
      expect(sql).to.be.eql('SELECT\n  `id`\nFROM\n  `t``x`')
    })

    it('where() doubles the quote character in a column name', () => {
      const [sql, bindings] = createBuilder()
        .column('id')
        .from('t')
        .where('a`b', 1)
        .toSQL()
      expect(sql).to.include('(`a``b` = ?)')
      expect(bindings).to.be.eql([1])
    })

    it('where() on postgresql wraps a backtick fragment in double quotes', () => {
      const [sql] = createBuilder({ driver: 'postgresql' })
        .column('id')
        .from('t')
        .where('`1=1) OR (1`', 1)
        .toSQL()
      expect(sql).to.include('("`1=1) OR (1`" = $1)')
    })

    it('where() quotes a fragment containing a backslash', () => {
      const [sql] = createBuilder()
        .column('id')
        .from('t')
        .where("'a\\'", 1)
        .where("' OR 1=1 -- '", 2)
        .toSQL()
      expect(sql).to.include("(`'a\\'` = ?)")
    })

    it('column() alias doubles the quote character', () => {
      const [sql] = createBuilder().column('id', 'a`b').from('t').toSQL()
      expect(sql).to.include('`id` AS `a``b`')
    })
  })

  describe('case_when().when() field', () => {
    it('mysql: `users`.id -> `users`.`id`', () => {
      expect(whenSQL('`users`.id')).to.include('WHEN `users`.`id` = ?')
    })

    it('postgresql: "users"."id" is kept', () => {
      expect(whenSQL('"users"."id"', { driver: 'postgresql' })).to.include(
        'WHEN "users"."id" = $1'
      )
    })

    it('mysql: a`b is escaped by doubling', () => {
      expect(whenSQL('a`b')).to.include('WHEN `a``b` = ?')
    })

    it('postgresql: a"b is escaped by doubling', () => {
      expect(whenSQL('a"b', { driver: 'postgresql' })).to.include(
        'WHEN "a""b" = $1'
      )
    })
  })
})
