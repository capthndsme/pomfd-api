import { NamedError } from '#exceptions/NamedError'
import ServerShard from '#models/server_shard'

class ServerAuthService {
  async authenticate(serverId: number, apiKey: string) {
    try {
      const api = await ServerShard
        .query()
        .where('id', serverId)
        .andWhere('apiKey', apiKey)
        .firstOrFail()

      return api
    } catch (error) {
      throw new NamedError('Invalid API Key', 'server-key-not-found')
    }
  }
}

export default new ServerAuthService()
