import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'server_shards'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.timestamp('created_at')
      table.timestamp('updated_at')
      table.string('domain').notNullable()
      table.boolean('paired').notNullable().defaultTo(false)
      table.string('api_key').notNullable()
      table.boolean('is_up').notNullable().defaultTo(false)
      table.bigInteger('space_total').notNullable().defaultTo(0)
      table.bigInteger('space_free').notNullable().defaultTo(0)
      table.timestamp('last_heartbeat').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
