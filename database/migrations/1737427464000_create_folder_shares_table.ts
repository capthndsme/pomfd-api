import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'folder_shares'

    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.uuid('id').primary()
            table.uuid('folder_id').notNullable().references('id').inTable('file_items').onDelete('CASCADE')
            table.uuid('owner_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
            table.enum('share_type', ['public', 'link-only', 'password-protected']).notNullable().defaultTo('link-only')
            table.string('password').nullable()
            table.string('name').nullable()
            table.timestamp('expires_at').nullable()
            table.timestamp('created_at').notNullable()
            table.timestamp('updated_at').notNullable()

            // Index for quick lookup by folder
            table.index(['folder_id'])
            // Index for listing user's shares
            table.index(['owner_id'])
        })
    }

    async down() {
        this.schema.dropTable(this.tableName)
    }
}
