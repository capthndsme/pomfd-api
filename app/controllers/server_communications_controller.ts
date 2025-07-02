import type { HttpContext } from '@adonisjs/core/http'
import { createSuccess } from '../../shared/types/ApiBase.js'
import ServerCommunicationService from '#services/ServerCommunicationService'
import { NamedError } from '#exceptions/NamedError'
import FileItem from '#models/file_item'

export default class ServerCommunicationsController {
  async ping({ request, response }: HttpContext) {
    const { serverId } = request.params()
    if (!serverId) throw new NamedError('invalid argument', 'einval')
    await ServerCommunicationService.ping(serverId);
    return response.ok(
      createSuccess(
        null,
        "Ping ok",
        "success"
      )
    )
  }

  async uploadAck({ request, response }: HttpContext) {
    const { serverId } = request.params()
    const file = request.body() as FileItem
    if (!serverId) throw new NamedError('invalid argument', 'einval')
    await ServerCommunicationService.uploadAck(serverId, file);
    return response.ok(
      createSuccess(
        null,
        "Upload acknowledged",
        "success"
      )
    )
  }

}