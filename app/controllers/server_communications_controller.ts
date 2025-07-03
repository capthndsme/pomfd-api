import type { HttpContext } from '@adonisjs/core/http'
import { createSuccess } from '../../shared/types/ApiBase.js'
import ServerCommunicationService from '#services/ServerCommunicationService'
import { NamedError } from '#exceptions/NamedError'

export default class ServerCommunicationsController {
  async ping({ request, response }: HttpContext) {
    const serverId = Number(request.header('x-server-id'))
    if (!serverId) throw new NamedError('invalid argument', 'einval')
    await ServerCommunicationService.ping(serverId)
    return response.ok(createSuccess(null, 'Ping ok', 'success'))
  }

  async uploadAck({ request, response }: HttpContext) {
    const { inodeId, metadata } = request.body() as { inodeId: string, metadata: { name: string; mimeType: string; size: number } }
    const serverId = Number(request.header('x-server-id'))
    if (isNaN(serverId) || !serverId) throw new NamedError('invalid argument', 'einval')
    const data = await ServerCommunicationService.uploadAck(serverId, inodeId, metadata)
    return response.ok(createSuccess(data, 'Upload acknowledged', 'success'))
  }
  
  async validateKey({ request, response }: HttpContext) {
    const serverId = Number(request.header('x-server-id'))
    const apiKey = request.header('x-api-key')

    if (!serverId || !apiKey) {
      throw new NamedError('Invalid API Key', 'server-key-not-found')
    }

    return response.ok(createSuccess(null, 'API Key is valid', 'success'))
  }

  async validateUser({ request, response }: HttpContext) {
    const userId = request.param('userId')
    const userToken = request.header('x-user-token')

    if (!userId || !userToken) {
      throw new NamedError('Invalid arguments', 'einval')
    }

    const isValid = await ServerCommunicationService.validateUserToken(userId, userToken)

    if (isValid) {
      return response.ok(createSuccess(null, 'User token is valid', 'success'))
    } else {
      return response.unauthorized(createSuccess(null, 'User token is invalid', 'token-invalid'))
    }
  }
  
}
