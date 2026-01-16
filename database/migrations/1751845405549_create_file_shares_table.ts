import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'file_shares'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.uuid('file_id').notNullable().references('id').inTable('file_items').onDelete('CASCADE')
      table.uuid('owner_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.timestamp('expires_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['file_id'])
      table.index(['owner_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

