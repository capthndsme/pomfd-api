import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import { type BelongsTo } from '@adonisjs/lucid/types/relations'
import { randomUUID } from 'crypto'
import User from './user.js'
import FileItem from './file_item.js'

export default class FileShare extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @beforeCreate()
  static async generateUuid(share: FileShare) {
    share.id = randomUUID()
  }

  @column()
  declare fileId: string

  @column()
  declare ownerId: string

  @column.dateTime()
  declare expiresAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  /** Relations */
  @belongsTo(() => FileItem, {
    foreignKey: 'fileId',
    localKey: 'id',
  })
  declare file: BelongsTo<typeof FileItem>

  @belongsTo(() => User, {
    foreignKey: 'ownerId',
    localKey: 'id',
  })
  declare owner: BelongsTo<typeof User>

  get isExpired(): boolean {
    if (!this.expiresAt) return false
    return this.expiresAt < DateTime.now()
  }
}

