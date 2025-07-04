import { NamedError } from "#exceptions/NamedError";
import FileItem from "#models/file_item";
import ServerShard from "#models/server_shard";
import { DateTime } from "luxon";
import { PingWithInfo } from "../../shared/types/request/PingWithInfo.js";

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
  
    dentry.fill({...file});
    dentry.serverShardId = serverId;
    await dentry.save();
    await dentry.load('serverShard')
    return dentry 

    
  }

  
}


export default new ServerCommunicationService();
