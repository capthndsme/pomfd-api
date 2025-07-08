import { NamedError } from '#exceptions/NamedError'
import ServerShard from '#models/server_shard'

class UploadCoordinatorService {
  async findAvailableServers() {
    return await ServerShard.query()
    .where('is_up', true)
    .andWhere(whereType => {
      // current compatible drivers
      whereType.where('type', 'store-local')
      whereType.orWhere('type', 'store-remote')
      whereType.orWhere('type', 's3-compatible')
    })
    // should be at least 1gb free. space free is in KiB.
    .andWhere('space_free', '>', 1 * 1024 * 1024)
 
    .orderBy('updated_at', 'asc')
    // order by free space
    .orderBy('space_free', 'desc')
    
    .limit(6)
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

  async getAnonymousUpload() {
    const server = await this.selectOneHealthy()
    if (!server) {
      throw new NamedError('No healthy servers available for upload', 'server-unhealthy')
    }
    const restOfServers = await this.findAvailableServers()

    return {
      uploadUrl: `https://${server.domain}/anon-upload`,
      // return rest of servers, filtering the selected one helath.
      rest: restOfServers
        .filter((s) => s.id !== server.id)
        .map((s) => `https://${s.domain}/anon-upload`),

      freeSpace: server.spaceFree,
      totalSpace: server.spaceTotal,
    }
  }
}

export default new UploadCoordinatorService()
