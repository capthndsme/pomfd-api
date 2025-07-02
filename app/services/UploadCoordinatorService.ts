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
    /**
     * As per Claude, we can do something like this:
     * # User hits the main endpoint
     * curl -F file=@screenshot.png https://pomf/upload
     * # Gets redirected to optimal storage server
     * -> 302 Redirect to https://bnnlag01.infra.pomf/anon-upload
     * # Direct upload to storage server
     * -> Returns: https://files.pomf.com/abc123/screenshot.png
     *
     * But, Gemini told me,
     * The initial server (pomf/upload) would have to receive the entire
     * file upload before it could issue the 302 redirect.
     * This defeats the primary benefit of redirecting, which is to offload
     * the bandwidth and processing from the coordinator to a
     * dedicated storage server
     */

    const server = await this.selectOneHealthy()
    if (!server) {
      throw new NamedError('No healthy servers available for upload', 'server-unhealthy')
    }

    return {
      uploadUrl: `https://${server.domain}/anon-upload`,
      freeSpace: server.spaceFree,
      totalSpace: server.spaceTotal
    }
  }
}

export default new UploadCoordinatorService()
