import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import { type BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import FileItem from './file_item.js'
import { randomUUID } from 'crypto'

export type ShareType = 'public' | 'link-only' | 'password-protected'

export default class FolderShare extends BaseModel {
    @column({ isPrimary: true })
    declare id: string

    @beforeCreate()
    static async generateUuid(share: FolderShare) {
        share.id = randomUUID()
    }

    @column()
    declare folderId: string

    @column()
    declare ownerId: string

    @column()
    declare shareType: ShareType

    @column({ serializeAs: null })
    declare password: string | null

    @column()
    declare name: string | null

    @column.dateTime()
    declare expiresAt: DateTime | null

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime

    /** Relations */
    @belongsTo(() => FileItem, {
        foreignKey: 'folderId',
        localKey: 'id',
    })
    declare folder: BelongsTo<typeof FileItem>

    @belongsTo(() => User, {
        foreignKey: 'ownerId',
        localKey: 'id',
    })
    declare owner: BelongsTo<typeof User>

    /** Helper to check if share is expired */
    get isExpired(): boolean {
        if (!this.expiresAt) return false
        return this.expiresAt < DateTime.now()
    }
}
