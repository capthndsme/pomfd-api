import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'file_permissions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.uuid('inode_id').references('inodes.id').onDelete('CASCADE')
      table.uuid('user_id').references('users.id').onDelete('CASCADE')
      table.enum('permission_level', ['read', 'write', 'owner']).notNullable()
      table.unique(['inode_id', 'user_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
