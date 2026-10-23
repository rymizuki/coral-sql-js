import { expect } from 'chai'
import {
  column_ref,
  createBuilder,
  Field,
  SQLBuilderPort,
  unescape
} from '../../dist'

describe('select statement', () => {
  it('writes unescape() as the SELECT clause', () => {
    const [sql, bindings] = createBuilder()
      .select(unescape('SELECT COUNT(*) AS total'))
      .from('users')
      .toSQL()
    expect(sql).to.be.eql('SELECT COUNT(*) AS total\nFROM\n  `users`')
    expect(bindings).to.be.eql([])
  })

  it('keeps writing a string statement as-is', () => {
    const [sql] = createBuilder()
      .select('SELECT COUNT(*) AS total')
      .from('users')
      .toSQL()
    expect(sql).to.be.eql('SELECT COUNT(*) AS total\nFROM\n  `users`')
  })

  it('throws when column_ref() is passed', () => {
    expect(() =>
      createBuilder()
        // @ts-expect-error column_ref() is not a select statement
        .select(column_ref('x'))
        .from('users')
        .toSQL()
    ).to.throw('coral-sql select statement must be unescape()')
  })

  it('throws when a Field instance is passed', () => {
    expect(() =>
      createBuilder()
        // @ts-expect-error Field is not a select statement
        .select(new Field('x'))
        .from('users')
        .toSQL()
    ).to.throw('coral-sql select statement must be unescape()')
  })

  describe('via SQLBuilderPort', () => {
    const build = (): SQLBuilderPort => createBuilder().from('users')

    it('throws when column_ref() is passed', () => {
      const builder = build()
      expect(() =>
        // @ts-expect-error column_ref() is not a select statement
        builder.select(column_ref('x')).toSQL()
      ).to.throw('coral-sql select statement must be unescape()')
    })

    it('accepts unescape() without a type error', () => {
      const [sql] = build().select(unescape('SELECT 1')).toSQL()
      expect(sql).to.be.eql('SELECT 1\nFROM\n  `users`')
    })
  })

  it('throws when unescape() is whitespace only', () => {
    expect(() =>
      createBuilder().select(unescape('  ')).from('users').toSQL()
    ).to.throw('coral-sql select requires a non-empty statement')
  })
})

describe('Field', () => {
  it('returns the content as-is with the legacy unescape flag', () => {
    expect(new Field('COUNT(*)', true).getContent()).to.be.eql('COUNT(*)')
  })

  it('makes unescape() an instance of Field', () => {
    expect(unescape('a') instanceof Field).to.be.eql(true)
  })
})
