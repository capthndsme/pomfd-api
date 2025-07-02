import { NamedError } from "#exceptions/NamedError";
import FileItem from "#models/file_item";
import ServerShard from "#models/server_shard";
import { DateTime } from "luxon";

class ServerCommunicationService {

  
  async ping(
    serverId: number
  ): Promise<void> { 
    const server = await ServerShard.find(serverId);
    if (!server) throw new NamedError('Server not found', 'server-not-found')

    server.isUp = true;
    server.lastHeartbeat = DateTime.now()
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
  
    dentry.fill({...file});
    dentry.serverShardId = serverId;
    await dentry.save();
    

    
  }

  
}


export default new ServerCommunicationService();
