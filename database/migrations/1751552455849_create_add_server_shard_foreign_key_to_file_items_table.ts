import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'file_items'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.foreign('server_shard_id').references('id').inTable('server_shards').onDelete('SET NULL')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign('server_shard_id')
    })
  }
}