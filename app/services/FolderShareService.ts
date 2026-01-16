import { NamedError } from '#exceptions/NamedError'
import FileItem from '#models/file_item'
import FolderShare, { type ShareType } from '#models/folder_share'
import hash from '@adonisjs/core/services/hash'

export interface CreateShareOptions {
    folderId: string
    ownerId: string
    shareType: ShareType
    password?: string
    name?: string
    expiresAt?: Date
}

export interface ShareAccessResult {
    share: FolderShare
    folder: FileItem
    files: FileItem[]
    displayMode: 'album' | 'list'
    imageRatio: number
}

class FolderShareService {
    /**
     * Create a new folder share
     */
    async createShare(options: CreateShareOptions): Promise<FolderShare> {
        // Verify the folder exists and belongs to the user
        const folder = await FileItem.query()
            .where('id', options.folderId)
            .where('owner_id', options.ownerId)
            .where('is_folder', true)
            .first()

        if (!folder) {
            throw new NamedError('Folder not found or access denied', 'folder-not-found')
        }

        // Check if share already exists for this folder
        const existingShare = await FolderShare.query()
            .where('folder_id', options.folderId)
            .where('owner_id', options.ownerId)
            .first()

        if (existingShare) {
            // Update existing share instead of creating new
            existingShare.shareType = options.shareType
            if (options.password && options.shareType === 'password-protected') {
                existingShare.password = await hash.make(options.password)
            } else {
                existingShare.password = null
            }
            existingShare.name = options.name ?? null
            existingShare.expiresAt = options.expiresAt ?
                (await import('luxon')).DateTime.fromJSDate(options.expiresAt) : null
            await existingShare.save()
            return existingShare
        }

        // Create new share
        const share = new FolderShare()
        share.folderId = options.folderId
        share.ownerId = options.ownerId
        share.shareType = options.shareType
        share.name = options.name ?? null

        if (options.password && options.shareType === 'password-protected') {
            share.password = await hash.make(options.password)
        }

        if (options.expiresAt) {
            share.expiresAt = (await import('luxon')).DateTime.fromJSDate(options.expiresAt)
        }

        await share.save()
        return share
    }

    /**
     * Get share by ID and validate access
     */
    async getShare(shareId: string, password?: string): Promise<ShareAccessResult> {
        const share = await FolderShare.query()
            .where('id', shareId)
            .preload('folder')
            .preload('owner')
            .first()

        if (!share) {
            throw new NamedError('Share not found', 'share-not-found')
        }

        // Check expiration
        if (share.isExpired) {
            throw new NamedError('Share has expired', 'share-expired')
        }

        // Check password if required
        if (share.shareType === 'password-protected') {
            if (!password) {
                throw new NamedError('Password required', 'password-required')
            }
            if (!share.password || !(await hash.verify(share.password, password))) {
                throw new NamedError('Invalid password', 'invalid-password')
            }
        }

        // Get folder contents
        const files = await FileItem.query()
            .where('parent_folder', share.folderId)
            .where((query) => {
                query.where('is_private', false).orWhereNull('is_private')
            })
            .preload('serverShard')
            .orderBy('is_folder', 'desc')
            .orderBy('name', 'asc')

        // Calculate image ratio for album detection
        const imageRatio = this.calculateImageRatio(files)
        const displayMode = imageRatio >= 0.6 ? 'album' : 'list'

        return {
            share,
            folder: share.folder,
            files,
            displayMode,
            imageRatio,
        }
    }

    /**
     * List all shares for a user
     */
    async listUserShares(userId: string): Promise<FolderShare[]> {
        return FolderShare.query()
            .where('owner_id', userId)
            .preload('folder')
            .orderBy('created_at', 'desc')
    }

    /**
     * Delete a share
     */
    async deleteShare(shareId: string, userId: string): Promise<void> {
        const share = await FolderShare.query()
            .where('id', shareId)
            .where('owner_id', userId)
            .first()

        if (!share) {
            throw new NamedError('Share not found or access denied', 'share-not-found')
        }

        await share.delete()
    }

    /**
     * Calculate the ratio of image files in a collection
     */
    private calculateImageRatio(files: FileItem[]): number {
        if (files.length === 0) return 0

        // Filter out folders
        const nonFolderFiles = files.filter(f => !f.isFolder)
        if (nonFolderFiles.length === 0) return 0

        const imageCount = nonFolderFiles.filter(f =>
            f.fileType === 'IMAGE' ||
            (f.mimeType && f.mimeType.toLowerCase().startsWith('image/'))
        ).length

        return imageCount / nonFolderFiles.length
    }
}

export default new FolderShareService()
