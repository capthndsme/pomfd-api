import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.string('full_name').nullable()
      table.string('email', 254).notNullable().unique()
      table.string('password').notNullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()


      table.string('profile_photo').nullable()
      table.string('profile_photo_blur_hash').nullable()
      table.text('bio').nullable()
      table.string('username').notNullable().unique()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
