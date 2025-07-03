import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import ServerShard from './server_shard.js'
import Inode from './inode.js'

export default class FileItem extends BaseModel {
  @column({ isPrimary: true })
  declare inodeId: string

  @column()
  declare serverShardId: number | null

  @column()
  declare name: string

  @column()
  declare mimeType: string

  @column()
  declare size: number

  @column()
  declare status: 'pending' | 'completed' | 'error'

  /** Relations */
  @belongsTo(() => Inode, {
    foreignKey: 'inodeId',
  })
  declare inode: BelongsTo<typeof Inode>

  @belongsTo(() => ServerShard, {
    foreignKey: 'serverShardId',
  })
  declare serverShard: BelongsTo<typeof ServerShard>
}
