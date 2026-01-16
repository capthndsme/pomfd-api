/**
 * Socket.IO Preload
 * 
 * This file boots the SocketIoService when the HTTP server starts.
 * It's loaded via the preloads array in adonisrc.ts
 */
import SocketIoService from '#services/SocketIoService'
import app from '@adonisjs/core/services/app'

// Boot Socket.IO when the application is ready
app.ready(() => {
    console.log('🚀 Application ready - initializing Socket.IO...')
    SocketIoService.boot()
})
