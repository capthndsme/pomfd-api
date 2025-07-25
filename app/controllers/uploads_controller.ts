import UploadCoordinatorService from '#services/UploadCoordinatorService'
import type { HttpContext } from '@adonisjs/core/http'
import { createSuccess } from '../../shared/types/ApiBase.js'

export default class UploadsController {
  async getAvailableServers({ response }: HttpContext) {
    const servers = await UploadCoordinatorService.findAvailableServers()
    return response.ok(createSuccess(servers, 'Servers found', 'success'))
  }

  async findAnonymousUrl({ response }: HttpContext) {
    try {
          const { uploadUrl, rest } = await UploadCoordinatorService.getAnonymousUpload()
    return response.ok(
`Upload to URL: ${uploadUrl}
Example: curl -F file=@{file} ${uploadUrl}

Other Endpoints:
${rest ? rest.map((r) => r).join('\n') : 'No other servers available.'}


`


    ) 
    } catch (e) {
      return response.serviceUnavailable(
        `There are no healthy servers available for upload.
Please try again later.`
      )
    }

  }


}
