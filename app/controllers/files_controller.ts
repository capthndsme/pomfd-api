import FileService from '#services/FileService'
import type { HttpContext } from '@adonisjs/core/http'
import { createFailure, createSuccess } from '../../shared/types/ApiBase.js'
import { NamedError } from '#exceptions/NamedError'

export default class FilesController {
  // 1. anonymous resolvation

  async resolveFileAlias({ request, response, auth }: HttpContext) {
    const { alias } = request.params()
    // if user is not authed, pass in null.
    const user = auth.user
    if (user) {
      // authenticate our user first
      await auth.check()
      if (!auth.isAuthenticated) {
        return response.unauthorized(createFailure('Authentication required', 'unauthorized'))
      } else {
        const file = await FileService.resolveFileAlias(alias, user.id)
        return response.ok(createSuccess(file, 'File found', 'success'))
      }
    } else {
      // anonymous passthrough
      const file = await FileService.resolveFileAlias(alias)
      return response.ok(createSuccess(file, 'File found', 'success'))
    }
  }

  // 2. list files in a dir
  // auth optional
  async listFileEntries({ request, response, auth }: HttpContext) {
    const { parentId } = request.params()
    const { page = 1, perPage = 30 } = request.qs()

    if (!parentId) {
      return response.badRequest(createFailure('Parent ID is required', 'einval'))
    }

    let userId: string | null = null
    if (auth.isAuthenticated) {
      userId = auth.user!.id
    }

    const files = await FileService.listFileEntries(
      parentId,
      userId,
      Number(page),
      Number(perPage)
    )
    return response.ok(createSuccess(files, 'File entries found', 'success'))
  }

  async getFile({ request, response, auth }: HttpContext) {
    const { fileId } = request.params()

    if (!fileId) {
      return response.badRequest(createFailure('File ID is required', 'einval'))
    }

    let userId: string | null = null
    if (auth.isAuthenticated) {
      userId = auth.user!.id
    }

    const file = await FileService.getFile(fileId, userId)
    return response.ok(createSuccess(file, 'File found', 'success'))
  }

  // mkdir 
  async mkdir({ request, response, auth }: HttpContext) {
    const { name, parentId } = request.body()
    const user = auth.user

    if (!user) {
      return response.unauthorized(createFailure('Authentication required', 'unauthorized'))
    }

    if (!name) {
      return response.badRequest(createFailure('Folder name is required', 'einval'))
    }

    try {
      const folder = await FileService.mkdir(name, parentId, user.id)
      return response.created(createSuccess(folder, 'Folder created successfully', 'success'))
    } catch (error) {
      if (error instanceof NamedError && error.name === 'folder-exists') {
        return response.conflict(createFailure(error.message, 'folder-exists'))
      }
      return response.internalServerError(createFailure('Failed to create folder'))
    }
  }

  async moveFile({ request, response, auth }: HttpContext) {
    const { fileId, parentId } = request.body()
    const user = auth.user

    if (!user) {
      return response.unauthorized(createFailure('Authentication required', 'unauthorized'))
    }

    if (!fileId || !parentId) {
      return response.badRequest(createFailure('File ID and parent ID are required', 'einval'))
    }

    try {
      const file = await FileService.move(fileId, parentId, user.id)
      return response.ok(createSuccess(file, 'File moved successfully', 'success'))
    } catch (error) {
      if (error instanceof NamedError && error.name === 'file-exists') {
        return response.conflict(createFailure(error.message, 'file-exists'))
      }
      return response.internalServerError(createFailure('Failed to move file'))
    }
  }
  
 
}

