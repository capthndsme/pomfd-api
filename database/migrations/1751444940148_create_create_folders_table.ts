import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'folders'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('folder_uuid').primary()
      table.timestamp('created_at')
      table.timestamp('updated_at')
      table.uuid('owner_id').references('id').inTable('users').onDelete('CASCADE')
      table.uuid('parent_folder').references('folder_uuid').inTable('folders').onDelete('CASCADE')
      table.string('name').notNullable()
      table.text('description').nullable()
      table.boolean('is_private').notNullable().defaultTo(false)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
