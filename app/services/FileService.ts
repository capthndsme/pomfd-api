import { NamedError } from '#exceptions/NamedError'
import FileItem from '#models/file_item'
import { createHmac } from 'crypto'
import UUIDService from './UUIDService.js'

class FileService {
  /**
   * This resolves FileShort to File
   * Authentication optional.
   */
  async resolveFileAlias(alias: string, userId: string | null = null): Promise<FileItem> {
    const uuid = UUIDService.decode(alias)
    const file = await FileItem.findBy('id', uuid)
    if (!file) throw new NamedError('File not found', 'not-found')

    if (file.isPrivate) {
      if (!userId) throw new NamedError('File is private. Login required', 'not-found')
      if (file.ownerId !== userId) throw new NamedError('File is private. No access', 'not-found')
    }
    await file.load('serverShard')
    if (file.ownerId) await file.load('user')

    await file.load('replicas')
    await file.load('previews')
    return file
  }

  /**
   * Lists a particular user's root files.
   */
  async listRootFiles(userId: string, page: number = 1, perPage: number = 30): Promise<FileItem[]> {
    return FileItem.query()
      .where('owner_id', userId)
      .andWhereNull('parent_folder')
      .orderBy('is_folder', 'desc')
      .orderBy('name', 'asc')
      .paginate(page, perPage)
  }

  async listFileEntries(
    parentId: string,
    userId: string | null = null,
    page: number = 1,
    perPage: number = 30
  ) {
    const query = FileItem.query().where('parent_folder', parentId)

    if (userId) {
      query.where('owner_id', userId)
    } else {
      // only view public files - properly group the OR condition
      query.andWhere((q) => {
        q.where('is_private', false).orWhereNull('is_private')
      })
    }

    return query.orderBy('is_folder', 'desc').orderBy('name', 'asc').paginate(page, perPage)
  }

  async getFile(
    fileId: string,

    userId: string | null = null
  ) {
    const file = await FileItem.findBy('id', fileId)
    if (!file) throw new NamedError('File not found', 'not-found')

    if (file.isPrivate) {
      if (!userId) throw new NamedError('File is private. Login required', 'not-found')
      if (file.ownerId !== userId) throw new NamedError('File is private. No access', 'not-found')
    }
    await file.load('replicas')
    await file.load('previews')
    return file
  }


  async mkdir(
    name: string,
    parentId: string,
    ownerId: string
  ): Promise<FileItem> {
    const existing = await FileItem.query()
      .where('name', name)
      .andWhere('ownerId', ownerId)
      .andWhere('parentFolder', parentId)
      .first()

    if (existing) {
      throw new NamedError('Folder with the same name already exists', 'folder-exists')
    }

    const folder = new FileItem()
    folder.name = name
    folder.parentFolder = parentId
    folder.ownerId = ownerId
    folder.isFolder = true
    await folder.save()
    return folder
  }

  async move(
    fileId: string,
    parentId: string,
    ownerId: string
  ) {
    const file = await FileItem.query()
      .where('id', fileId)
      .andWhere('ownerId', ownerId)
      .firstOrFail()

    const existing = await FileItem.query()
      .where('name', file.name)
      .andWhere('ownerId', ownerId)
      .andWhere('parentFolder', parentId)
      .first()

    if (existing) {
      throw new NamedError('A file or folder with the same name already exists in the destination', 'file-exists')
    }

    file.parentFolder = parentId

    // Cycle check
    if (await this.hasCycle(fileId, parentId)) {
      throw new NamedError('Cannot move folder into itself or its own subfolder', 'einval')
    }

    await file.save()
    return file
  }

  private async hasCycle(fileId: string, targetParentId: string): Promise<boolean> {
    if (fileId === targetParentId) return true

    let currentId: string | null = targetParentId
    let depth = 0

    while (currentId && depth < 50) {
      if (currentId === fileId) return true
      const ancestor: FileItem | null = await FileItem.find(currentId)
      if (!ancestor) return false
      currentId = ancestor.parentFolder
      depth++
    }

    return false
  }


  /**
 * Generates a presigned URL for a given file path for private files.
 * @param filePath The path to the file relative to the 'private' directory (e.g., 'user-uploads/document.pdf').
 * @param expiresIn Seconds until the URL expires.
 * @returns The full, shareable presigned URL.
 */
  generatePresignedUrl(file: FileItem, expiresIn: number): string {
    const expires = Date.now() + expiresIn * 1000 // expires timestamp in milliseconds

    // Ensure serverShard is loaded and has the necessary data
    if (!file.serverShard) {
      console.warn(`Cannot generate presigned URL: serverShard not loaded for file ${file.id}`)
      return ''
    }

    if (!file.fileKey || !file.serverShard.apiKey) return ''

    const signature = this.#createSignature(file.fileKey, file.serverShard.apiKey, expires)

    // Construct the URL safely. The base URL should not have a trailing slash.
    return `${file.serverShard.domain}/p/${file.fileKey}?signature=${signature}&expires=${expires}`
  }

  presignPreviews(file: FileItem) {
    const previews = file.previews
    if (!previews) return []
    return previews.map((preview) => {
      const expires = Date.now() + 3600 * 1000 // 1 hour expiration
      const signature = this.#createSignature(preview.previewKey, file.serverShard.apiKey, expires)
      return `${file.serverShard.domain}/p/${preview.previewKey}?signature=${signature}&expires=${expires}`
    })
  }

  presignPreviewsAndReturn(file: FileItem): FileItem {
    const previews = file.previews
    if (!previews) return file
    file.previews = previews.map((preview) => {
      const expires = Date.now() + 3600 * 1000 // 1 hour expiration
      const signature = this.#createSignature(preview.previewKey, file.serverShard.apiKey, expires)
      preview.previewKey = `${file.serverShard.domain}/p/${preview.previewKey}?signature=${signature}&expires=${expires}`
      return preview
    }) as typeof file.previews
    return file

  }

  /**
 * Creates an HMAC signature for the file path and expiration.
 */
  #createSignature(filePath: string, serverKey: string, expires: number): string {
    const data = `${filePath}|${expires}` // Use a separator that's not allowed in file paths
    return createHmac('sha256', serverKey).update(data).digest('hex')
  }

  /**
   * Presigns the actual file entity.
   * Do not save.
   */
  presignFile(file: FileItem) {
    if (!file.isPrivate) return file;
    file.fileKey = this.generatePresignedUrl(file, 3600)
    // presign thumbnailkey
    if (file.previewKey) {
      file.previewKey = this.generatePresignedUrl(file, 3600)
    }
    // presign previews
    if (file.previews) {
      const merge = this.presignPreviewsAndReturn(file)
      file.previews = merge.previews
    }
    file.save = async () => { throw new Error('Thou shalt not save!') };
    return file

  }

  /**
   * Gets the breadcrumb trail for a folder.
   * Returns an array from root to the current folder.
   */
  async getBreadcrumbs(
    folderId: string,
    userId: string
  ): Promise<{ id: string | null; name: string }[]> {
    const breadcrumbs: { id: string | null; name: string }[] = []
    let currentId: string | null = folderId
    let depth = 0

    while (currentId && depth < 50) {
      const folder = await FileItem.query()
        .where('id', currentId)
        .andWhere('owner_id', userId)
        .first()

      if (!folder) break

      breadcrumbs.unshift({ id: folder.id, name: folder.name })
      currentId = folder.parentFolder
      depth++
    }

    // Add root at the beginning
    breadcrumbs.unshift({ id: null, name: 'My Files' })

    return breadcrumbs
  }

  /**
   * Gets a folder by ID and verifies ownership.
   */
  async getFolder(folderId: string, userId: string): Promise<FileItem | null> {
    return FileItem.query()
      .where('id', folderId)
      .andWhere('owner_id', userId)
      .andWhere('is_folder', true)
      .first()
  }
}

export default new FileService()

//
