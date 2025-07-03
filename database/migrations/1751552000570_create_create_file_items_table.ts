import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'file_items'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()

      table.string('owner_id').nullable()
      table.uuid('parent_folder').nullable()

      table.string('name').notNullable()
      table.text('description').nullable()
      table.boolean('is_private').nullable()
      table.boolean('is_folder').notNullable()

      table.string('original_file_name').nullable()
      table.string('mime_type').nullable()
      table.string('file_type').nullable()
      table.string('file_key').nullable()
      table.string('preview_key').nullable()
      table.string('preview_blur_hash').nullable()
      table.integer('server_shard_id').unsigned().nullable()
      table.bigInteger('file_size').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}