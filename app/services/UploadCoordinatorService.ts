import { inject } from '@adonisjs/core'
import { NamedError } from '#exceptions/NamedError'
import ServerShard from '#models/server_shard'
import Inode from '#models/inode'
import FileItem from '#models/file_item'
import { randomUUID } from 'crypto'
 

@inject()
export default class UploadCoordinatorService {
  constructor() {}

  async findAvailableServers() {
    return await ServerShard.query().where('is_up', true).orderBy('updated_at', 'asc').limit(5)
  }

  async selectOneHealthy() {
    const servers = await this.findAvailableServers()
    if (servers.length === 0) {
      return null // No healthy servers available
    }
    // For now, just pick the first one. More sophisticated logic can be added later.
    const random = servers[Math.floor(Math.random() * servers.length)]

    return random
  }

  async prepareAnonymousUpload() {
    const server = await this.selectOneHealthy()
    if (!server) {
      throw new NamedError('No healthy servers available for upload', 'server-unhealthy')
    }

    const inode = new Inode()
    inode.id = randomUUID()
    inode.ownerId = null
    inode.isPublic = true
    inode.type = 'file'
    await inode.save()

    const fileItem = new FileItem()
    fileItem.inodeId = inode.id
    fileItem.status = 'pending'
    // These will be updated by the ACK
    fileItem.name = 'pending' 
    fileItem.mimeType = 'pending'
    fileItem.size = 0
    await fileItem.save()

    return {
      uploadUrl: `https://${server.domain}/upload/${inode.id}`,
      shareLink: `/files/${inode.id}`,
      directLink: `https://${server.domain}/files/${inode.id}`,
    }
  }
}
