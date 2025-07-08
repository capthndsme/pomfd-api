import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'server_shards'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // @type in servershard

      table.string('type').notNullable().defaultTo('store-remote')
      table.string('node_name').nullable()
      table.float('lat').nullable()
      table.float('lng').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('type')
      table.dropColumn('node_name')
      table.dropColumn('lat')
      table.dropColumn('lng')
    })
  }
}
