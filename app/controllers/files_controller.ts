import FileService from '#services/FileService'
import FolderShareService from '#services/FolderShareService'
import FileShareTokenService from '#services/FileShareTokenService'
import UUIDService from '#services/UUIDService'
import type { HttpContext } from '@adonisjs/core/http'
import { createFailure, createSuccess } from '../../shared/types/ApiBase.js'
import { NamedError } from '#exceptions/NamedError'
import env from '#start/env'

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

  // List authenticated user's root files
  async listMyRoot({ request, response, auth }: HttpContext) {
    const user = auth.user
    if (!user) {
      return response.unauthorized(createFailure('Authentication required', 'unauthorized'))
    }

    const { page = 1, perPage = 30 } = request.qs()
    const files = await FileService.listRootFiles(user.id, Number(page), Number(perPage))
    return response.ok(createSuccess(files, 'Root files retrieved', 'success'))
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
      if (error instanceof NamedError) {
        if (error.name === 'file-exists') {
          return response.conflict(createFailure(error.message, 'file-exists'))
        }
        if (error.name === 'einval') {
          return response.badRequest(createFailure(error.message, 'einval'))
        }
      }
      return response.internalServerError(createFailure('Failed to move file'))
    }
  }

  // Create folder share
  async createShare({ request, response, auth }: HttpContext) {
    const user = auth.user
    if (!user) {
      return response.unauthorized(createFailure('Authentication required', 'unauthorized'))
    }

    const { folderId, shareType, password, name, expiresAt } = request.body()

    if (!folderId) {
      return response.badRequest(createFailure('Folder ID is required', 'einval'))
    }

    if (!shareType || !['public', 'link-only', 'password-protected'].includes(shareType)) {
      return response.badRequest(createFailure('Valid share type is required', 'einval'))
    }

    if (shareType === 'password-protected' && !password) {
      return response.badRequest(createFailure('Password is required for password-protected shares', 'einval'))
    }

    try {
      const share = await FolderShareService.createShare({
        folderId,
        ownerId: user.id,
        shareType,
        password,
        name,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      })
      return response.created(createSuccess(share, 'Share created successfully', 'success'))
    } catch (error) {
      if (error instanceof NamedError) {
        return response.badRequest(createFailure(error.message, error.name))
      }
      return response.internalServerError(createFailure('Failed to create share'))
    }
  }

  // Get shared folder (public access)
  async getShare({ request, response }: HttpContext) {
    const { shareId } = request.params()
    const { password } = request.qs()

    try {
      const result = await FolderShareService.getShare(shareId, password)
      return response.ok(createSuccess({
        share: {
          id: result.share.id,
          name: result.share.name,
          shareType: result.share.shareType,
          expiresAt: result.share.expiresAt,
        },
        folder: result.folder,
        files: result.files,
        displayMode: result.displayMode,
        imageRatio: result.imageRatio,
      }, 'Share retrieved', 'success'))
    } catch (error) {
      if (error instanceof NamedError) {
        if (error.name === 'password-required') {
          return response.status(401).send(createFailure(error.message, error.name))
        }
        if (error.name === 'invalid-password') {
          return response.status(403).send(createFailure(error.message, error.name))
        }
        if (error.name === 'share-expired') {
          return response.status(410).send(createFailure(error.message, error.name))
        }
        return response.notFound(createFailure(error.message, error.name))
      }
      return response.internalServerError(createFailure('Failed to retrieve share'))
    }
  }

  // Verify share password (for password-protected shares)
  async verifySharePassword({ request, response }: HttpContext) {
    const { shareId } = request.params()
    const { password } = request.body()

    try {
      const result = await FolderShareService.getShare(shareId, password)
      return response.ok(createSuccess({
        share: {
          id: result.share.id,
          name: result.share.name,
          shareType: result.share.shareType,
        },
        folder: result.folder,
        files: result.files,
        displayMode: result.displayMode,
        imageRatio: result.imageRatio,
      }, 'Password verified', 'success'))
    } catch (error) {
      if (error instanceof NamedError) {
        if (error.name === 'invalid-password') {
          return response.status(403).send(createFailure(error.message, error.name))
        }
        return response.notFound(createFailure(error.message, error.name))
      }
      return response.internalServerError(createFailure('Failed to verify password'))
    }
  }

  // List user's shares
  async listMyShares({ response, auth }: HttpContext) {
    const user = auth.user
    if (!user) {
      return response.unauthorized(createFailure('Authentication required', 'unauthorized'))
    }

    try {
      const shares = await FolderShareService.listUserShares(user.id)
      return response.ok(createSuccess(shares, 'Shares retrieved', 'success'))
    } catch (error) {
      return response.internalServerError(createFailure('Failed to retrieve shares'))
    }
  }

  // Delete a share
  async deleteShare({ request, response, auth }: HttpContext) {
    const user = auth.user
    if (!user) {
      return response.unauthorized(createFailure('Authentication required', 'unauthorized'))
    }

    const { shareId } = request.params()

    try {
      await FolderShareService.deleteShare(shareId, user.id)
      return response.ok(createSuccess(null, 'Share deleted', 'success'))
    } catch (error) {
      if (error instanceof NamedError) {
        return response.notFound(createFailure(error.message, error.name))
      }
      return response.internalServerError(createFailure('Failed to delete share'))
    }
  }

  // Get breadcrumbs for a folder
  async getBreadcrumbs({ request, response, auth }: HttpContext) {
    const user = auth.user
    if (!user) {
      return response.unauthorized(createFailure('Authentication required', 'unauthorized'))
    }

    const { folderId } = request.params()

    if (!folderId) {
      return response.badRequest(createFailure('Folder ID is required', 'einval'))
    }

    try {
      const breadcrumbs = await FileService.getBreadcrumbs(folderId, user.id)
      return response.ok(createSuccess(breadcrumbs, 'Breadcrumbs retrieved', 'success'))
    } catch (error) {
      return response.internalServerError(createFailure('Failed to retrieve breadcrumbs'))
    }
  }

  // Create file share (for individual files)
  async createFileShare({ request, response, auth }: HttpContext) {
    const user = auth.user
    if (!user) {
      return response.unauthorized(createFailure('Authentication required', 'unauthorized'))
    }

    const { fileId, expiresIn } = request.body()

    if (!fileId) {
      return response.badRequest(createFailure('File ID is required', 'einval'))
    }

    try {
      const file = await FileService.getFile(fileId, user.id)
      if (!file) {
        return response.notFound(createFailure('File not found', 'not-found'))
      }

      await file.load('serverShard')

      const uiBase = env.get('COORDINATOR_UI') || ''

      // Canonical share surface URL:
      // - Public files: /s/:encodedFileId
      // - Private files: /s/:shareToken (token contains expiry)
      const publicShareId = UUIDService.encode(file.id)

      // For private files, generate a stable share surface + an optional expiring direct URL
      if (file.isPrivate) {
        const expirationSeconds = expiresIn || 3600 * 24 // Default 24 hours
        const shareId = FileShareTokenService.create(file.id, expirationSeconds)
        const shareUrl = uiBase ? `${uiBase.replace(/\/+$/, '')}/s/${shareId}` : `/s/${shareId}`

        const presignedUrl = FileService.generatePresignedUrl(file, expirationSeconds)
        return response.ok(createSuccess({
          // Backwards compat: "url" now means the share surface URL
          url: shareUrl,
          shareUrl,
          directUrl: presignedUrl,
          expiresIn: expirationSeconds,
          fileName: file.originalFileName || file.name,
        }, 'Share URL generated', 'success'))
      } else {
        // For public files, return both share surface + direct URL
        const shareUrl = uiBase ? `${uiBase.replace(/\/+$/, '')}/s/${publicShareId}` : `/s/${publicShareId}`
        const directUrl = file.fileKey
          ? FileService.buildPublicUrl(file.serverShard.domain, file.fileKey)
          : ''
        return response.ok(createSuccess({
          url: shareUrl,
          shareUrl,
          directUrl,
          expiresIn: null,
          fileName: file.originalFileName || file.name,
        }, 'Share URL generated', 'success'))
      }
    } catch (error) {
      if (error instanceof NamedError) {
        return response.notFound(createFailure(error.message, error.name))
      }
      return response.internalServerError(createFailure('Failed to create file share'))
    }
  }

  /**
   * Public, token-based file share resolution.
   * This powers the canonical /s/:id share surface for PRIVATE files without requiring auth.
   */
  async getFileShare({ request, response }: HttpContext) {
    const { shareId } = request.params()
    if (!shareId) {
      return response.badRequest(createFailure('Share ID is required', 'einval'))
    }

    try {
      const payload = FileShareTokenService.verify(shareId)
      const file = await FileService.getFile(payload.fileId)
      if (!file) {
        return response.notFound(createFailure('File not found', 'not-found'))
      }

      // Only intended for files (not folders)
      if (file.isFolder) {
        return response.notFound(createFailure('File not found', 'not-found'))
      }

      await file.load('serverShard')
      await file.load('previews')

      const expirationSeconds = payload.exp ? Math.max(1, Math.floor((payload.exp - Date.now()) / 1000)) : 3600
      const isPrivate = !!file.isPrivate

      // Generate view URLs for anonymous viewing. Private files must be presigned.
      const originalUrl =
        isPrivate && file.fileKey && file.serverShard?.apiKey
          ? FileService.generatePresignedUrlForPath(file.fileKey, file.serverShard.apiKey, file.serverShard.domain, expirationSeconds)
          : file.fileKey && file.serverShard
            ? FileService.buildPublicUrl(file.serverShard.domain, file.fileKey)
            : ''

      const thumbnailUrl =
        file.previewKey && file.serverShard
          ? (isPrivate && file.serverShard.apiKey
            ? FileService.generatePresignedUrlForPath(file.previewKey, file.serverShard.apiKey, file.serverShard.domain, expirationSeconds)
            : FileService.buildPublicUrl(file.serverShard.domain, file.previewKey))
          : ''

      const previews = (file.previews || []).map((p) => ({
        id: p.id,
        quality: p.quality,
        mimeType: p.mimeType,
        url:
          isPrivate && file.serverShard?.apiKey
            ? FileService.generatePresignedUrlForPath(p.previewKey, file.serverShard.apiKey, file.serverShard.domain, expirationSeconds)
            : FileService.buildPublicUrl(file.serverShard.domain, p.previewKey),
      }))

      return response.ok(createSuccess({
        file,
        viewUrls: {
          fileId: file.id,
          isPrivate,
          expiresIn: isPrivate ? expirationSeconds : null,
          originalUrl,
          thumbnailUrl,
          previews,
        },
      }, 'Share retrieved', 'success'))
    } catch (e) {
      return response.notFound(createFailure('Invalid or expired share link', 'not-found'))
    }
  }

  /**
   * Dedicated viewer endpoint for authenticated users.
   * Returns public direct URLs for public files, and presigned URLs for private files.
   *
   * This avoids conflating "viewing" with "sharing" and keeps the frontend clean.
   */
  async getFileViewUrls({ request, response, auth }: HttpContext) {
    const user = auth.user
    if (!user) {
      return response.unauthorized(createFailure('Authentication required', 'unauthorized'))
    }

    const { fileId, expiresIn } = request.body() as { fileId?: string; expiresIn?: number }
    if (!fileId) {
      return response.badRequest(createFailure('File ID is required', 'einval'))
    }

    try {
      const file = await FileService.getFile(fileId, user.id)
      if (!file) {
        return response.notFound(createFailure('File not found', 'not-found'))
      }

      await file.load('serverShard')
      await file.load('previews')

      const expirationSeconds = expiresIn || 3600 // Default 1 hour for private URLs
      const isPrivate = !!file.isPrivate

      const originalUrl =
        isPrivate && file.fileKey && file.serverShard?.apiKey
          ? FileService.generatePresignedUrlForPath(file.fileKey, file.serverShard.apiKey, file.serverShard.domain, expirationSeconds)
          : file.fileKey && file.serverShard
            ? FileService.buildPublicUrl(file.serverShard.domain, file.fileKey)
            : ''

      const thumbnailUrl =
        file.previewKey && file.serverShard
          ? (isPrivate && file.serverShard.apiKey
            ? FileService.generatePresignedUrlForPath(file.previewKey, file.serverShard.apiKey, file.serverShard.domain, expirationSeconds)
            : FileService.buildPublicUrl(file.serverShard.domain, file.previewKey))
          : ''

      const previews = (file.previews || []).map((p) => ({
        id: p.id,
        quality: p.quality,
        mimeType: p.mimeType,
        url:
          isPrivate && file.serverShard?.apiKey
            ? FileService.generatePresignedUrlForPath(p.previewKey, file.serverShard.apiKey, file.serverShard.domain, expirationSeconds)
            : FileService.buildPublicUrl(file.serverShard.domain, p.previewKey),
      }))

      return response.ok(
        createSuccess(
          {
            fileId: file.id,
            isPrivate,
            expiresIn: isPrivate ? expirationSeconds : null,
            originalUrl,
            thumbnailUrl,
            previews,
          },
          'View URLs generated',
          'success'
        )
      )
    } catch (error) {
      if (error instanceof NamedError) {
        return response.notFound(createFailure(error.message, error.name))
      }
      return response.internalServerError(createFailure('Failed to generate view URLs'))
    }
  }
}
