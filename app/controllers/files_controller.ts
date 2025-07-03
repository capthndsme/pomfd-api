import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import FileService from '#services/FileService'
import Inode from '#models/inode'
import { NamedError } from '#exceptions/NamedError'

@inject()
export default class FilesController {
  constructor(protected fileService: FileService) {}

  async show({ request, auth, response }: HttpContext) {
    const inodeId = request.param('inodeId')
    await auth.check()
    const user = auth.user

    const hasAccess = await this.fileService.checkAccess(inodeId, user?.id)

    if (!hasAccess) {
      throw new NamedError('You do not have permission to access this file', 'unauthorized')
    }

    const inode = await Inode.query().where('id', inodeId).preload('fileItem').first()

    if (!inode) {
      throw new NamedError('File not found', 'not-found')
    }

    return response.ok(inode)
  }
}