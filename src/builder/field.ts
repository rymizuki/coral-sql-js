import { FieldPort } from '../types'
import { escape } from '../utils/escape'

export class Field implements FieldPort {
  private content: string
  private unescape: boolean

  constructor(field: string, unescape?: boolean) {
    this.unescape = !!unescape

    if (this.unescape) {
      this.content = field
    } else {
      this.content = escape(field)
    }
  }

  getContent(): string {
    return this.content
  }
}
