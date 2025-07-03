import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Inode from './inode.js'
import User from './user.js'

export default class FilePermission extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare inodeId: string

  @column()
  declare userId: string

  @column()
  declare permissionLevel: 'read' | 'write' | 'owner'

  @belongsTo(() => Inode)
  declare inode: BelongsTo<typeof Inode>

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
