export class Table {
  private name: string
  private as?: string

  constructor(name: string, as?: string) {
    this.name = name
    this.as = as
  }

  toSQL(): string {
    return `\`${this.name}\`${this.as ? ' AS `' + this.as + '`' : ''}`
  }
}
