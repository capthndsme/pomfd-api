import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'file_items'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      // replication parent file
      table
        .uuid('replication_parent')
        .nullable()
        .references('id')
        .inTable('file_items')
        .onDelete('SET NULL')

      // indices
      table.index(['owner_id'], 'owner_id_index')
      table.index(['parent_folder'], 'parent_folder_index')
      table.index(['replication_parent'], 'replication_parent_index')
      table.index(['server_shard_id'], 'server_shard_id_index')

      // composite indices
      // Primary access patterns
      table.index(['owner_id'], 'owner_id_index')
      table.index(['parent_folder'], 'parent_folder_index')
      table.index(['replication_parent'], 'replication_parent_index')
      table.index(['server_shard_id'], 'server_shard_id_index')

      // Composite indices for service queries
      table.index(['owner_id', 'parent_folder', 'is_folder', 'name'], 'owner_root_files_index')
      table.index(['parent_folder', 'is_private', 'is_folder', 'name'], 'folder_contents_index')
      table.index(['owner_id', 'is_private'], 'owner_privacy_index')

      // Replication indices
      table.index(['replication_parent', 'server_shard_id'], 'replica_location_index')
      table.index(['server_shard_id', 'replication_parent'], 'shard_replication_index')

      // File operations
      table.index(['parent_folder', 'name'], 'folder_name_index')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
