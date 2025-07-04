import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'server_shards'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.bigInteger('memory_free').nullable().defaultTo(0)
      table.bigInteger('memory_total').nullable().defaultTo(0)
      table.integer('cpu_use').nullable().defaultTo(0)
      table.bigInteger('bw_in').nullable().defaultTo(0)
      table.bigInteger('bw_out').nullable().defaultTo(0)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('memory_free')
      table.dropColumn('memory_total')
      table.dropColumn('cpu_use')
      table.dropColumn('bw_in')
      table.dropColumn('bw_out')
    })
  }
}
