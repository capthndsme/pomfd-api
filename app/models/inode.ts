import { DateTime } from 'luxon'
import { BaseModel, column, hasOne, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasOne } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import FileItem from './file_item.js'

export default class Inode extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare ownerId: string | null

  @column()
  declare type: 'file' | 'folder'

  @column()
  declare isPublic: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User)
  declare owner: BelongsTo<typeof User>

  @hasOne(() => FileItem, {
    foreignKey: 'inodeId',
  })
  declare fileItem: HasOne<typeof FileItem>
}