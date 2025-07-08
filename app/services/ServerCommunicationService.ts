import { NamedError } from "#exceptions/NamedError";
import FileItem from "#models/file_item";
import ServerShard from "#models/server_shard";
import { DateTime } from "luxon";
import { PingWithInfo } from "../../shared/types/request/PingWithInfo.js";
import FileService from "./FileService.js";


class ServerCommunicationService {


  async ping(
    serverId: number,
    info?: PingWithInfo
  ): Promise<void> {
    const server = await ServerShard.find(serverId);
    if (!server) throw new NamedError('Server not found', 'server-not-found')

    server.isUp = true;
    server.lastHeartbeat = DateTime.now()
    if (info?.freeKIB) server.spaceFree = info.freeKIB
    if (info?.totalKiB) server.spaceTotal = info.totalKiB
    if (info?.bwIn) server.bwIn = info.bwIn
    if (info?.bwOut) server.bwOut = info.bwOut
    if (info?.cpuUse) server.cpuUse = info.cpuUse
    if (info?.ramFreeBytes) server.memoryFree = info.ramFreeBytes
    if (info?.ramTotalBytes) server.memoryTotal = info.ramTotalBytes

    console.log(`received ping from ${server.domain}`)
    await server.save();
  }

  async uploadAck(
    serverId: number,
    /** The FileItem as received by server, returning to the central repository */
    file: FileItem
  ) {
    const server = await ServerShard.find(serverId);

    if (!server) throw new NamedError('Server not found', 'server-not-found')

    const dentry = new FileItem();

    dentry.fill({ ...file });
    dentry.serverShardId = serverId;
    await dentry.save();
    await dentry.load('serverShard')
    if (dentry.ownerId) await dentry.load('user')
    return dentry
  }

  /**
   * finds no-metadata files.
   */
  async findFileWork() {
    const files = await FileItem.query()
      // only previewable types
      .whereIn('file_type', ['IMAGE', 'VIDEO'])
      .andWhereNull('transcode_status')
      .limit(5)

    try {
      for  (const file of files) {
     FileService.generatePresignedUrl(file, 3600)
      } 
    
    } catch (e) {
      console.warn(`presign fail`, e)
    }
    return files;
  }

  async markFile(fileId: string, status: FileItem['transcodeStatus']) {
    const file = await FileItem.findOrFail(fileId)
    file.transcodeStartedAt = DateTime.now()
    file.transcodeStatus = status
    await file.save()
    return file
  }

  async addPreviewToFile(
    fileId: string,
    previewFilename: string,
    quality: '480' | '720' | '1080',
    mimeType: string
  ) {
    const file = await FileItem.findOrFail(fileId)
    const preview = await file.related('previews').create({
      previewKey: previewFilename,
      quality,
      mimeType
    })
    await preview.save()
    return preview
  }

  async updateFileMeta(
    fileId: string,
    itemWidth: number,
    itemHeight: number,
    blurHash: string,
    fileThumbName: string,
  ) {
    const file = await FileItem.findOrFail(fileId)
    file.itemWidth = itemWidth
    file.itemHeight = itemHeight
    file.previewBlurHash = blurHash
    file.previewKey = fileThumbName
    
    await file.save()
    return file
    
  }

  async validateServerToken(
    serverId: number,
    token: string
  ) {
    const server = await ServerShard.find(serverId)
    if (!server) {
      throw new NamedError('Server not found', 'server-not-found')
    }

    if (server.apiKey !== token) {
      throw new NamedError('Invalid server token', 'invalid-credentials')
    }

    return true
  }



}


export default new ServerCommunicationService();
