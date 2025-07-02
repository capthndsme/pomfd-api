import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import { type FileType } from '../../shared/types/FileType.js'
import { type BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import ServerShard from './server_shard.js'
import Folder from './folder.js'

export default class FileItem extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column()
  declare originalFileName: string

  @column()
  /**
   * File-determined file-type
   */
  declare mimeType: string

  @column()
  /**
   * Server-determined file-type
   */
  declare fileType: FileType

  @column()
  /**
   * AWS S3-esque "file keys"
   * which are just ${RANDOM_HASH(32)}/${original}.${ext}
   */
  declare fileKey: string

  @column()
  declare previewKey: string | null

  @column()
  declare previewBlurHash: string | null

  /** Sharding and Ownership */

  @column()
  declare ownerId: string | null

  @column()
  declare serverShardId: number

  @column()
  declare isPrivate: boolean | null

  @column()
  declare fileSize: number 

  /** Filesystem */
  @column()
  declare parentFolder: string | null

  /** Relations */
  @belongsTo(() => User, {
    foreignKey: 'ownerId',
    localKey: 'id',
  })
  declare user: BelongsTo<typeof User>

  @belongsTo(() => ServerShard, {
    foreignKey: 'serverShardId',
    localKey: 'id',
  })
  declare serverShard: BelongsTo<typeof ServerShard>

  @belongsTo(() => Folder, {
    foreignKey: 'parentFolder',
    localKey: 'folderUuid',
  })
  declare parent: BelongsTo<typeof Folder>
}
