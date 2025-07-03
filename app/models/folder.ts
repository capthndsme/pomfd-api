import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import Inode from './inode.js'
import { type BelongsTo } from '@adonisjs/lucid/types/relations'
 
export default class Folder extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare inodeId: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column()
  declare description: string | null

  /** relationships */
  @belongsTo(() => Inode, {
    foreignKey: 'inodeId',
  })
  declare inode: BelongsTo<typeof Inode>
  
  

}