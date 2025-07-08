import type { HttpContext } from '@adonisjs/core/http'
import { createFailure, createSuccess } from '../../shared/types/ApiBase.js'
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

  async findFileWork({ response }: HttpContext) {
    const files = await ServerCommunicationService.findFileWork()
    return response.ok(createSuccess(files, 'Files found', 'success'))
  }

  async markFile({ request, response }: HttpContext) {
    const { fileId, status } = request.body()
    if (!fileId || !status) throw new NamedError('invalid argument', 'einval')
    const file = await ServerCommunicationService.markFile(fileId, status)
    return response.ok(createSuccess(file, 'File marked', 'success'))
  }

  async addPreviewToFile({ request, response }: HttpContext) {
    const { fileId, previewFilename, quality, mimeType } = request.body()
    if (!fileId || !previewFilename || !quality || !mimeType)
      throw new NamedError('invalid argument', 'einval')
    const preview = await ServerCommunicationService.addPreviewToFile(
      fileId,
      previewFilename,
      quality,
      mimeType
    )
    return response.ok(createSuccess(preview, 'Preview added', 'success'))
  }

  async updateFileMeta({ request, response }: HttpContext) {
    const { fileId, itemWidth, itemHeight, blurHash, fileThumbName } = request.body()
    if (!fileId || !itemWidth || !itemHeight || !blurHash || !fileThumbName)
      throw new NamedError('invalid argument', 'einval')
    const file = await ServerCommunicationService.updateFileMeta(
      fileId,
      itemWidth,
      itemHeight,
      blurHash,
      fileThumbName

    )
    return response.ok(createSuccess(file, 'File meta updated', 'success'))
  }

  // validate other server
  async validateServerToken({ request, response }: HttpContext) {
    const { token, serverId } = request.qs()
    if (!token || !serverId) throw new NamedError('invalid argument', 'einval')
    const isValid = await ServerCommunicationService.validateServerToken(serverId, token)
    if (isValid) {
      return response.ok(createSuccess(null, 'Token is valid', 'success'))
    } else {
      return response.unauthorized(createFailure('Token is invalid', 'token-invalid'))
    }
  }

  /**
   * ACK PREVIEW
   * 
   * on the files backend we have thiss;
    // notify coordinator
    const res = await MainServerAxiosService.post(`/coordinator/v1/ack-preview`, {
      fileKey: fileKey,
      previewKey: `${directory}/${file.clientName}`,
      bucket: bucket,
      quality: quality,
    })
    if (res.status === 200) {
      return createSuccess(null, 'Preview uploaded', 'success')
    }
    throw new NamedError('Coordinator down', 'error')

   */
  async ackPreview({ request, response }: HttpContext) {
    const { fileId, previewId } = request.body()
    if (!fileId || !previewId) throw new NamedError('invalid argument', 'einval')
    // Assuming a service method to acknowledge preview processing
    // await ServerCommunicationService.ackPreview(fileId, previewId)
    return response.ok(createSuccess(null, 'Preview acknowledged', 'success'))
  }
}
