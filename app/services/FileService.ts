import { inject } from '@adonisjs/core'
 
import Inode from '#models/inode'
import User from '#models/user'
import { NamedError } from '#exceptions/NamedError'
import FilePermission from '#models/file_permission'

@inject()
export default class FileService {
  constructor(protected user: User | null) {}

  async createShare(inodeId: string, targetUserId: string, permissionLevel: 'read' | 'write' | 'owner') {
    const inode = await Inode.find(inodeId)
    if (!inode) throw new NamedError('File not found', 'not-found')

    if (inode.ownerId !== this.user?.id) {
      throw new NamedError('You do not have permission to share this file', 'unauthorized')
    }

    const existingPermission = await FilePermission.query()
      .where('inodeId', inodeId)
      .andWhere('userId', targetUserId)
      .first()

    if (existingPermission) {
      existingPermission.permissionLevel = permissionLevel
      await existingPermission.save()
      return existingPermission
    }

    const permission = await FilePermission.create({
      inodeId,
      userId: targetUserId,
      permissionLevel,
    })

    return permission
  }

  async getPublicLink(inodeId: string) {
    const inode = await Inode.find(inodeId)
    if (!inode) throw new NamedError('File not found', 'not-found')

    if (inode.ownerId !== this.user?.id) {
      throw new NamedError('You do not have permission to modify this file', 'unauthorized')
    }

    inode.isPublic = true
    await inode.save()

    return `/files/${inode.id}`
  }

  async checkAccess(inodeId: string, userId?: string): Promise<boolean> {
    const inode = await Inode.find(inodeId)
    if (!inode) return false

    if (inode.isPublic) return true

    if (!userId) return false

    if (inode.ownerId === userId) return true

    const permission = await FilePermission.query()
      .where('inodeId', inodeId)
      .andWhere('userId', userId)
      .first()

    return !!permission
  }
}
