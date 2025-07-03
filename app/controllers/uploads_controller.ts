import UploadCoordinatorService from '#services/UploadCoordinatorService'
import type { HttpContext } from '@adonisjs/core/http'
import { createSuccess } from '../../shared/types/ApiBase.js'
import { inject } from '@adonisjs/core'

@inject()
export default class UploadsController {
  constructor(protected uploadCoordinatorService: UploadCoordinatorService) {}

  async getAvailableServers({ response }: HttpContext) {
    const servers = await this.uploadCoordinatorService.findAvailableServers()
    return response.ok(createSuccess(servers, 'Servers found', 'success'))
  }

  async findAnonymousUrl({ response }: HttpContext) {
    try {
      const data = await this.uploadCoordinatorService.prepareAnonymousUpload()
      return response.ok(createSuccess(data, 'Anonymous upload prepared', 'success'))
    } catch (e) {
      return response.serviceUnavailable(
        `There are no healthy servers available for upload.
Please try again later.`
      )
    }
  }
}
