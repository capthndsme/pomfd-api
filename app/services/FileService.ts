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
  async listRootFiles(userId: string, page: number = 1, perPage: number = 30): Promise<FileItem[]> {
    return FileItem.query()
      .where('user_id', userId)
      .andWhereNull('parent_folder')
      .orderBy('is_dir', 'desc')
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
      query.where('user_id', userId)
    } else {
      // only view public files.
      query.where('is_private', false).orWhereNull('is_private')
    }

    return query.orderBy('is_dir', 'desc').orderBy('name', 'asc').paginate(page, perPage)
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
    await file.save()
    return file
  }

 
}

export default new FileService()

//
