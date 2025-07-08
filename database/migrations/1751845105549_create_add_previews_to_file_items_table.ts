import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'file_items'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
 
      table.integer('item_width')
      table.integer('item_height')
      table.string('transcode_status').nullable()
      table.timestamp('transcode_started_at').nullable()

    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
 
      table.dropColumn('item_width')
      table.dropColumn('item_height')
      table.dropColumn('transcode_status')
      table.dropColumn('transcode_started_at')
    })
  }
}
