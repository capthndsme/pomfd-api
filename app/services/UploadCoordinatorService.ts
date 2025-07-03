import { NamedError } from '#exceptions/NamedError'
import ServerShard from '#models/server_shard'

class UploadCoordinatorService {
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

  async getAnonymousUpload() {

    const server = await this.selectOneHealthy()
    if (!server) {
      throw new NamedError('No healthy servers available for upload', 'server-unhealthy')
    }
    const restOfServers = await this.findAvailableServers()


    return {
      uploadUrl: `https://${server.domain}/anon-upload`,
      // return rest of servers, filtering the selected one helath.
      rest: restOfServers.filter(s => s.id !== server.id).map(s => `https://${s.domain}/anon-upload`),
      
      freeSpace: server.spaceFree,
      totalSpace: server.spaceTotal
    }
  }
}

export default new UploadCoordinatorService()
