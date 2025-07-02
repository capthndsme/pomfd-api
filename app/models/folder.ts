import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import FileItem from './file_item.js'

export default class Folder extends BaseModel {
  @column({ isPrimary: true })
  /** Our primary uuid  */
  declare folderUuid: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column()
  declare ownerId: string

  @column()
  /**
   * Nestings?
   */
  declare parentFolder: string | null

  @column()
  declare name: string

  @column()
  declare description: string | null

  @column()
  declare isPrivate: boolean | null

  /** relationships */
  @hasMany(() => Folder, {
    foreignKey: 'parentFolder',
    localKey: 'folderUuid',
  })
  declare childFolders: HasMany<typeof Folder>

  @hasMany(() => FileItem, {
    foreignKey: 'parentFolder',
    localKey: 'folderUuid',
  })
  declare files: HasMany<typeof FileItem>
  
  

}