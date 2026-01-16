import server from '@adonisjs/core/services/server'
import { Server } from 'socket.io'
import {
  BaseClientToServer,
  BaseServerToClient,
  BaseSocket,
  BaseSocketData,
  BaseSocketServer,
} from '../../shared/types/wss/WssBase.js'
import FileItem from '#models/file_item'
import ServerShard from '#models/server_shard'
import ServerCommunicationService from './ServerCommunicationService.js'

/**
 * SocketIoService - Real-time communication hub for transcoders
 * 
 * This service replaces the polling mechanism for transcoders.
 * When a new file is uploaded, we push it directly to an available transcoder.
 */
class SocketIoService {
  #booted = false
  #io: BaseSocketServer | null = null

  /** Map of serverId → socket for authenticated transcoders */
  #transcoders: Map<number, BaseSocket> = new Map()

  /** Queue of files waiting for an available transcoder */
  #pendingFiles: FileItem[] = []

  /**
   * Boot the Socket.IO server - called once during app startup
   */
  boot() {
    if (this.#booted) return
    this.#booted = true

    const nodeServer = server.getNodeServer()
    if (!nodeServer) {
      console.error('❌ SocketIoService: Could not get Node server. Socket.IO not started.')
      return
    }

    this.#io = new Server<BaseClientToServer, BaseServerToClient, object, BaseSocketData>(
      nodeServer,
      {
        cors: {
          origin: '*', // In production, restrict this
        },
        // Require auth before connection is established
        allowRequest: (_req, callback) => {
          // Basic check - detailed auth happens in middleware
          callback(null, true)
        },
      }
    )

    // Authentication middleware
    this.#io.use(this.#authMiddleware.bind(this))

    // Connection handler
    this.#io.on('connection', this.#handleConnection.bind(this))

    console.log('✅ SocketIoService: Socket.IO server started')
  }

  /**
   * Authentication middleware - validates transcoder credentials
   */
  async #authMiddleware(socket: BaseSocket, next: (err?: Error) => void) {
    try {
      const { serverId, apiKey, clientType } = socket.handshake.auth as {
        serverId?: number
        apiKey?: string
        clientType?: 'transcoder' | 'storage'
      }

      if (!serverId || !apiKey) {
        return next(new Error('Authentication required: serverId and apiKey must be provided'))
      }

      // Validate against server_shards table
      const serverShard = await ServerShard.find(serverId)
      if (!serverShard) {
        return next(new Error(`Server with ID ${serverId} not found`))
      }

      if (serverShard.apiKey !== apiKey) {
        return next(new Error('Invalid API key'))
      }

      // Attach data to socket
      socket.data.serverId = serverId
      socket.data.serverName = serverShard.domain
      socket.data.authenticated = true
      socket.data.isBusy = false
      socket.data.clientType = clientType || 'transcoder'
      socket.data.lastUpdate = Date.now()

      console.log(`🔐 Socket authenticated: ${serverShard.domain} (ID: ${serverId})`)
      next()
    } catch (error) {
      console.error('❌ Socket auth error:', error)
      next(new Error('Authentication failed'))
    }
  }

  /**
   * Handle new socket connections
   */
  #handleConnection(socket: BaseSocket) {
    const { serverId, serverName, clientType } = socket.data

    console.log(`🔌 ${clientType} connected: ${serverName} (ID: ${serverId})`)

    // Register this transcoder
    if (clientType === 'transcoder') {
      this.#transcoders.set(serverId, socket)

      // Try to dispatch any pending files to this new transcoder
      this.#tryDispatchPending()
    }

    // ========================================
    // Event Handlers: Transcoder → Coordinator
    // ========================================

    /**
     * mark-file: Transcoder reports file processing status
     */
    socket.on('mark-file', async (payload, ack) => {
      try {
        const { fileId, status } = payload
        console.log(`📝 mark-file from ${serverName}: ${fileId} → ${status}`)

        await ServerCommunicationService.markFile(fileId, status)

        // If finished, mark transcoder as available
        if (status === 'finished' || status === 'invalid-file' || status === null) {
          socket.data.isBusy = false
          this.#tryDispatchPending()
        }

        ack({ success: true })
      } catch (error) {
        console.error('❌ mark-file error:', error)
        ack({ success: false, error: String(error) })
      }
    })

    /**
     * status-update: Transcoder reports its current load
     */
    socket.on('status-update', (payload) => {
      socket.data.isBusy = payload.isBusy
      socket.data.lastUpdate = Date.now()
      console.log(`📊 status-update from ${serverName}: busy=${payload.isBusy}, queue=${payload.queueSize}`)

      // If transcoder became available, try to dispatch pending work
      if (!payload.isBusy) {
        this.#tryDispatchPending()
      }
    })

    /**
     * claim-work: Transcoder explicitly claims a file
     */
    socket.on('claim-work', async (payload, ack) => {
      try {
        const file = await FileItem.query()
          .where('id', payload.fileId)
          .whereNull('transcode_status')
          .preload('serverShard')
          .first()

        if (!file) {
          ack({ success: false, error: 'File not found or already claimed' })
          return
        }

        // Mark as pending
        await ServerCommunicationService.markFile(file.id, 'pending')
        socket.data.isBusy = true

        ack({ success: true, file })
      } catch (error) {
        console.error('❌ claim-work error:', error)
        ack({ success: false, error: String(error) })
      }
    })

    /**
     * request-work: Transcoder requests available work (fallback mechanism)
     */
    socket.on('request-work', async (_, ack) => {
      try {
        const files = await ServerCommunicationService.findFileWork()
        ack({ files })
      } catch (error) {
        console.error('❌ request-work error:', error)
        ack({ files: [] })
      }
    })

    /**
     * Handle disconnection
     */
    socket.on('disconnect', (reason) => {
      console.log(`🔌 ${clientType} disconnected: ${serverName} (${reason})`)

      if (clientType === 'transcoder') {
        this.#transcoders.delete(serverId)
      }
    })
  }

  // ========================================
  // Public API: Dispatch work to transcoders
  // ========================================

  /**
   * Dispatch a new file to an available transcoder
   * Called when Storage Node ACKs a new upload
   */
  async dispatchNewFile(file: FileItem): Promise<boolean> {
    // Make sure we have the serverShard loaded for the transcoder to download
    if (!file.serverShard) {
      await file.load('serverShard')
    }

    // Find an idle transcoder
    const transcoder = this.#findIdleTranscoder()

    if (!transcoder) {
      console.log(`📥 No idle transcoder, queuing file: ${file.fileKey}`)
      this.#pendingFiles.push(file)
      return false
    }

    return this.#sendFileToTranscoder(transcoder, file)
  }

  /**
   * Send a file to a specific transcoder
   */
  async #sendFileToTranscoder(transcoder: BaseSocket, file: FileItem): Promise<boolean> {
    const serverName = transcoder.data.serverName

    try {
      console.log(`📤 Dispatching ${file.fileKey} to ${serverName}`)

      // Mark transcoder as busy optimistically
      transcoder.data.isBusy = true

      // Send with acknowledgment - wait for transcoder to accept/reject
      const response = await transcoder.emitWithAck('new-file', file)

      if (response.accepted) {
        console.log(`✅ ${serverName} accepted ${file.fileKey}`)
        return true
      } else {
        console.log(`⚠️ ${serverName} rejected ${file.fileKey}: ${response.reason}`)
        transcoder.data.isBusy = false

        // Re-queue the file
        this.#pendingFiles.push(file)
        return false
      }
    } catch (error) {
      console.error(`❌ Failed to dispatch to ${serverName}:`, error)
      transcoder.data.isBusy = false

      // Re-queue the file
      this.#pendingFiles.push(file)
      return false
    }
  }

  /**
   * Find an idle transcoder (round-robin among available ones)
   */
  #findIdleTranscoder(): BaseSocket | null {
    for (const [, socket] of this.#transcoders) {
      if (!socket.data.isBusy && socket.connected) {
        return socket
      }
    }
    return null
  }

  /**
   * Try to dispatch pending files to available transcoders
   */
  #tryDispatchPending() {
    while (this.#pendingFiles.length > 0) {
      const transcoder = this.#findIdleTranscoder()
      if (!transcoder) break

      const file = this.#pendingFiles.shift()!
      this.#sendFileToTranscoder(transcoder, file)
    }
  }

  /**
   * Notify a transcoder that work was cancelled
   */
  notifyWorkCancelled(fileId: string) {
    for (const [, socket] of this.#transcoders) {
      socket.emit('work-cancelled', { fileId })
    }
  }

  // ========================================
  // Status & Debugging
  // ========================================

  /**
   * Get current status of all connected transcoders
   */
  getStatus() {
    const transcoders: Array<{
      serverId: number
      serverName?: string
      isBusy: boolean
      connected: boolean
    }> = []

    for (const [serverId, socket] of this.#transcoders) {
      transcoders.push({
        serverId,
        serverName: socket.data.serverName,
        isBusy: socket.data.isBusy,
        connected: socket.connected,
      })
    }

    return {
      booted: this.#booted,
      connectedTranscoders: this.#transcoders.size,
      pendingFiles: this.#pendingFiles.length,
      transcoders,
    }
  }

  /**
   * Check if the service is booted
   */
  isBooted() {
    return this.#booted
  }
}

export default new SocketIoService()