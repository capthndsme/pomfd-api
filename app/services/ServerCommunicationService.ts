import { NamedError } from "#exceptions/NamedError";
import FileItem from "#models/file_item";
import ServerShard from "#models/server_shard";
import User from "#models/user";
import { DateTime } from "luxon";

class ServerCommunicationService {

  
  async ping(
    serverId: number
  ): Promise<void> { 
    const server = await ServerShard.find(serverId);
    if (!server) throw new NamedError('Server not found', 'server-not-found')

    server.isUp = true;
    server.lastHeartbeat = DateTime.now()
    console.log(`received ping from ${server.domain}`)
    await server.save();
  }

  async uploadAck(
    serverId: number,
    inodeId: string,
    metadata: { name: string; mimeType: string; size: number }
  ) {
    const server = await ServerShard.find(serverId)
    if (!server) throw new NamedError('Server not found', 'server-not-found')

    const fileItem = await FileItem.find(inodeId)
    if (!fileItem) throw new NamedError('FileItem not found', 'file-not-found')

    if (fileItem.status !== 'pending') {
      throw new NamedError('File is not pending upload', 'file-not-pending')
    }

    fileItem.merge({
      serverShardId: serverId,
      name: metadata.name,
      mimeType: metadata.mimeType,
      size: metadata.size,
      status: 'completed',
    })

    await fileItem.save()

    return fileItem
  }

  /** Validates a particular user's auth */
  async validateUserToken(
    userId: string,
    userToken: string
  ) {
    const findUser = await User.find(userId);
    if (!findUser) throw new NamedError('User not found', 'user-not-found')
 
    const token = await User.accessTokens.find(
      findUser,
      userToken
    )
    
    return !!token;
  }

  
}


export default new ServerCommunicationService();
