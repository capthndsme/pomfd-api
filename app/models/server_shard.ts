import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class ServerShard extends BaseModel {
@column({ isPrimary: true })
declare id: number

@column.dateTime({ autoCreate: true })
declare createdAt: DateTime

@column.dateTime({ autoCreate: true, autoUpdate: true })
declare updatedAt: DateTime

@column()
declare domain: string

@column()
declare type: 'store-local' | 'store-remote' | 'file-processing' | 's3-compatible'

@column()
/**
 * Is the server paired, as in paired?
 */
declare paired: boolean

@column({
  serializeAs: null
})
declare apiKey: string

@column()
declare isUp: boolean

@column()
declare spaceTotal: number

@column()
declare spaceFree: number

@column()
declare memoryFree: number | null

@column()
declare memoryTotal: number| null

@column()
declare cpuUse: number| null

@column()
declare bwIn: number| null

@column()
declare bwOut: number| null

@column()
declare nodeName: string | null

/** Advanced server select algorithms */
@column()
declare lat: number | null

@column()
declare lng: number | null





@column.dateTime()
declare lastHeartbeat: DateTime


}