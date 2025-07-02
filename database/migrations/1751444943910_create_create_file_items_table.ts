import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'file_items'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.timestamp('created_at')
      table.timestamp('updated_at')

      table.string('original_file_name').notNullable()
      table.string('mime_type').notNullable()
      table.string('file_type').notNullable()
      table.string('file_key').notNullable().unique()
      table.string('preview_key').nullable()
      table.string('preview_blur_hash').nullable()
      table.bigInteger('file_size').nullable()

      // Sharding and Ownership
      table.uuid('owner_id').references('id').inTable('users').onDelete('CASCADE')
      table.integer('server_shard_id').unsigned().references('id').inTable('server_shards').onDelete('CASCADE')
      table.boolean('is_private').notNullable().defaultTo(false)

      // Filesystem
      table.uuid('parent_folder').references('folder_uuid').inTable('folders').onDelete('CASCADE')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
