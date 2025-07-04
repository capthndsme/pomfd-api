import type { HttpContext } from '@adonisjs/core/http'
import { createSuccess } from '../../shared/types/ApiBase.js'
import ServerCommunicationService from '#services/ServerCommunicationService'
import { NamedError } from '#exceptions/NamedError'
import FileItem from '#models/file_item'
import { PingWithInfo } from '../../shared/types/request/PingWithInfo.js'

export default class ServerCommunicationsController {
  async ping({ request, response }: HttpContext) {
    const serverId = Number(request.header('x-server-id'))
    if (!serverId) throw new NamedError('invalid argument', 'einval')
    await ServerCommunicationService.ping(serverId)
    return response.ok(createSuccess(null, 'Ping ok', 'success'))
  }

  async uploadAck({ request, response }: HttpContext) {
    const body = request.body() as FileItem
    const serverId = Number(request.header('x-server-id'))
    if (isNaN(serverId) || !serverId) throw new NamedError('invalid argument', 'einval')
    const data = await ServerCommunicationService.uploadAck(serverId, body)
    return response.ok(createSuccess(data, 'Upload acknowledged', 'success'))
  }

  async pingWithInfo({ request, response }: HttpContext) {
    const serverId = Number(request.header('x-server-id'))
    const body = request.body() as PingWithInfo
    if (!serverId) throw new NamedError('invalid argument', 'einval')
    await ServerCommunicationService.ping(serverId, body)
    return response.ok(createSuccess(null, 'Ping ok', 'success'))
  }
}
