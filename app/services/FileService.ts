import { NamedError } from '#exceptions/NamedError'
import FileItem from '#models/file_item'
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
    return file
  }

  /**
   * Lists a particular user's root files.
   */
  async listRootFiles(userId: number, page: number = 1, perPage: number = 30): Promise<FileItem[]> {
    return FileItem.query()
      .where('user_id', userId)
      .andWhereNull('parent_id')
      .orderBy('is_dir', 'desc')
      .orderBy('name', 'asc')
      .paginate(page, perPage)
  }

  async listFileEntries(
    parentId: number,
    userId: string | null = null,
    page: number = 1,
    perPage: number = 30
  ) {
    const query = FileItem.query().where('parent_id', parentId)

    if (userId) {
      query.where('user_id', userId)
    } else {
      // only view public files.
      query.where('is_private', false).orWhereNull('is_private')
    }

    return query.orderBy('is_dir', 'desc').orderBy('name', 'asc').paginate(page, perPage)
  }

  async getFile(
    fileId: number,

    userId: string | null = null
  ) {
    const file = await FileItem.findBy('id', fileId)
    if (!file) throw new NamedError('File not found', 'not-found')

    if (file.isPrivate) {
      if (!userId) throw new NamedError('File is private. Login required', 'not-found')
      if (file.ownerId !== userId) throw new NamedError('File is private. No access', 'not-found')
    }
    return file
  }
}

export default new FileService()

//
