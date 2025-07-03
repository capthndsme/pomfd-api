import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'file_items'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.foreign('parent_folder').references('id').inTable('file_items').onDelete('CASCADE')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign('parent_folder')
    })
  }
}