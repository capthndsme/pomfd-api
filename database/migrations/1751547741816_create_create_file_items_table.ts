import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'file_items'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('inode_id').primary().references('inodes.id').onDelete('CASCADE')
      table.integer('server_shard_id').unsigned().references('server_shards.id').onDelete('SET NULL').nullable()
      table.string('name').notNullable()
      table.string('mime_type').notNullable()
      table.bigInteger('size').unsigned().notNullable()
      table.enum('status', ['pending', 'completed', 'error']).defaultTo('pending')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
