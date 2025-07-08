import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import { randomUUID } from 'crypto'
import FileItem from './file_item.js'
import { type BelongsTo } from '@adonisjs/lucid/types/relations'

export default class FilePreview extends BaseModel {
  @column({ isPrimary: true })
  declare id: string
  /** Uuid generation */
  @beforeCreate()
  static async generateUuid(filePreview: FilePreview) {
    filePreview.id = randomUUID()
  }

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  /** Belongs to what file item (and its Replication Parent) */
  @column()
  declare fileItemId: string

  @column()
  declare previewKey: string

  @column()
  declare mimeType: string

  @column()
  declare quality: '480' | '720' | '1080' 


  // belongs to
  @belongsTo(() => FileItem, {
    foreignKey: 'fileItemId',
    localKey: 'id',
  }) 
  declare fileItem: BelongsTo<typeof FileItem>



 
 

}