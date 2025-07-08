import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import { type FileType } from '../../shared/types/FileType.js'
import { type BelongsTo, type HasMany } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import ServerShard from './server_shard.js'
import { randomUUID } from 'crypto'
import FilePreview from './file_preview.js'

export default class FileItem extends BaseModel {
  @column({ isPrimary: true })
  declare id: string
  /** Uuid generation */
  @beforeCreate()
  static async generateUuid(fileItem: FileItem) {
    fileItem.id = randomUUID()
  }

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column()
  declare ownerId: string

  @column()
  declare parentFolder: string | null

  @column()
  declare name: string

  @column()
  declare description: string | null

  @column()
  declare isPrivate: boolean | null

  @column()
  declare isFolder: boolean

  @column()
  declare originalFileName: string | null

  @column()
  declare mimeType: string | null

  @column()
  declare fileType: FileType | null

  @column()
  declare fileKey: string | null

  @column()
  /** Thumbnail preview, vs FilePreviews more-specific ones. */
  declare previewKey: string | null

  @column()
  declare previewBlurHash: string | null


  @column()
  declare itemWidth: number | null

  @column()
  declare itemHeight: number | null

  @column()
  declare transcodeStatus: 'pending' | 'finished' | 'invalid-file' | null

  @column.dateTime()
  declare transcodeStartedAt: DateTime | null



  @column()
  declare serverShardId: number | null

  @column()
  declare fileSize: number | null

  // Original file: replicationParent = null
  // Replica: points to original's UUID

  @column()
  declare replicationParent: string | null

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

  @belongsTo(() => FileItem, {
    foreignKey: 'parentFolder',
    localKey: 'id',
  })
  declare parent: BelongsTo<typeof FileItem>

  @hasMany(() => FileItem, {
    foreignKey: 'parentFolder',
    localKey: 'id',
  })
  declare children: HasMany<typeof FileItem>

  // replicas
  @hasMany(() => FileItem, {
    foreignKey: 'replicationParent',
    localKey: 'id',
  })
  declare replicas: HasMany<typeof FileItem>

  // previews if any 
  @hasMany(() => FilePreview, {
    foreignKey: 'fileItemId',
    localKey: 'id',
  })
  declare previews: HasMany<typeof FilePreview>
  
}
