import { NamedError } from '#exceptions/NamedError'
import FileItem from '#models/file_item'
import FileShare from '#models/file_share'

export interface CreateFileShareOptions {
  fileId: string
  ownerId: string
  expiresAt?: Date | null
}

export interface FileShareAccessResult {
  share: FileShare
  file: FileItem
}

class FileShareService {
  /**
   * Create (or update) a file share for a file owned by the user.
   * We keep a single share per (file, owner) to make revocation/update simple.
   */
  async createShare(options: CreateFileShareOptions): Promise<FileShare> {
    const file = await FileItem.query()
      .where('id', options.fileId)
      .where('owner_id', options.ownerId)
      .where('is_folder', false)
      .first()

    if (!file) {
      throw new NamedError('File not found or access denied', 'file-not-found')
    }

    const existing = await FileShare.query()
      .where('file_id', options.fileId)
      .where('owner_id', options.ownerId)
      .first()

    const expiresAt = options.expiresAt === undefined ? undefined : options.expiresAt

    if (existing) {
      if (expiresAt === undefined) {
        // keep existing expiry if not provided
      } else if (expiresAt === null) {
        existing.expiresAt = null
      } else {
        existing.expiresAt = (await import('luxon')).DateTime.fromJSDate(expiresAt)
      }
      await existing.save()
      return existing
    }

    const share = new FileShare()
    share.fileId = options.fileId
    share.ownerId = options.ownerId
    if (expiresAt === null) {
      share.expiresAt = null
    } else if (expiresAt instanceof Date) {
      share.expiresAt = (await import('luxon')).DateTime.fromJSDate(expiresAt)
    }
    await share.save()
    return share
  }

  /**
   * Get a share by ID and validate that it is not expired.
   */
  async getShare(shareId: string): Promise<FileShareAccessResult> {
    const share = await FileShare.query()
      .where('id', shareId)
      .preload('file')
      .first()

    if (!share) {
      throw new NamedError('Share not found', 'share-not-found')
    }

    if (share.isExpired) {
      throw new NamedError('Share has expired', 'share-expired')
    }

    return { share, file: share.file }
  }

  /**
   * List all shares for a user (for management/revocation UI).
   */
  async listUserShares(userId: string): Promise<FileShare[]> {
    return FileShare.query()
      .where('owner_id', userId)
      .preload('file')
      .orderBy('created_at', 'desc')
  }

  /**
   * Delete (revoke) a share owned by the user.
   */
  async deleteShare(shareId: string, userId: string): Promise<void> {
    const share = await FileShare.query()
      .where('id', shareId)
      .where('owner_id', userId)
      .first()

    if (!share) {
      throw new NamedError('Share not found or access denied', 'share-not-found')
    }

    await share.delete()
  }
}

export default new FileShareService()

