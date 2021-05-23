import { FieldPort } from '../types'

export class Field implements FieldPort {
  private content: string
  private unescape: boolean

  constructor(field: string, unescape?: boolean) {
    this.unescape = !!unescape

    if (this.unescape) {
      this.content = field
    } else {
      const fragments = field.split('.')
      const output = fragments
        .map((fragment) => {
          if (/(?:"(?:.+?)")|(?:'(?:.+?)')|(?:`(?:.+?)`)/.test(fragment)) {
            return fragment
          }
          return '`' + fragment + '`'
        })
        .join('.')
      this.content = output
    }
  }

  getContent(): string {
    return this.content
  }
}
