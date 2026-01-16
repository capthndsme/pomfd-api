import { Socket, Server } from 'socket.io'
import { ValidApiMessages } from '../ApiMessages.js'
import FileItem from '#models/file_item'

// ============================================
// Socket Type Definitions for Cap-Cloud
// ============================================

/**
 * Data attached to each socket connection (set during authentication)
 */
type BaseSocketData = {
  serverId: number
  serverName?: string
  authenticated: boolean
  lastUpdate: number
  isBusy: boolean  // Track if transcoder is currently processing
  clientType: 'transcoder' | 'storage' | 'unknown'
}

/**
 * Generic payload wrapper for socket messages
 */
type BaseSocketPayload<T> = {
  data: T
  status: ValidApiMessages
  type: BaseMessageTypes
}

// ============================================
// Callback type helpers
// ============================================

type Callable<T> = (value: T) => void
type CallableCallback<T, C> = (value: T, callback: (value: C) => void) => void

// ============================================
// Event Definitions: Coordinator → Transcoder
// ============================================

type NewFileAckResponse = {
  accepted: boolean
  reason?: string
}

type WorkCancelledPayload = {
  fileId: string
}

type BaseServerToClient = {
  /** Push a new file to a transcoder for processing */
  'new-file': CallableCallback<FileItem, NewFileAckResponse>

  /** Notify transcoder that work was cancelled (e.g., file deleted) */
  'work-cancelled': Callable<WorkCancelledPayload>

  /** Ping to check if transcoder is alive */
  'ping': CallableCallback<{ timestamp: number }, { pong: true; timestamp: number }>
}

// ============================================
// Event Definitions: Transcoder → Coordinator
// ============================================

type MarkFilePayload = {
  fileId: string
  status: 'pending' | 'finished' | 'invalid-file' | null
}

type MarkFileResponse = {
  success: boolean
  error?: string
}

type StatusUpdatePayload = {
  isBusy: boolean
  queueSize: number
  currentFileId?: string
}

type ClaimWorkPayload = {
  fileId: string
}

type ClaimWorkResponse = {
  success: boolean
  file?: FileItem
  error?: string
}

type BaseClientToServer = {
  /** Transcoder reports file processing status */
  'mark-file': CallableCallback<MarkFilePayload, MarkFileResponse>

  /** Transcoder reports its current status/load */
  'status-update': Callable<StatusUpdatePayload>

  /** Transcoder explicitly claims a file for processing */
  'claim-work': CallableCallback<ClaimWorkPayload, ClaimWorkResponse>

  /** Request work from coordinator (fallback/initial load) */
  'request-work': CallableCallback<void, { files: FileItem[] }>
}

// ============================================
// Socket Type Aliases
// ============================================

/** Server-side socket (Coordinator's view of a connected transcoder) */
type BaseSocket = Socket<BaseClientToServer, BaseServerToClient, object, BaseSocketData>

/** Client-side socket (Transcoder's view of the coordinator) - types are reversed */
type BaseSocketReverse = Socket<BaseServerToClient, BaseClientToServer, object, BaseSocketData>

/** Server instance type */
type BaseSocketServer = Server<BaseClientToServer, BaseServerToClient, object, BaseSocketData>

type BaseMessageTypes = keyof BaseClientToServer | keyof BaseServerToClient

// ============================================
// Exports
// ============================================

export type {
  BaseSocket,
  BaseSocketReverse,
  BaseSocketServer,
  BaseSocketData,
  BaseSocketPayload,
  Callable,
  CallableCallback,
  BaseClientToServer,
  BaseServerToClient,
  BaseMessageTypes,
  // Payload types for external use
  NewFileAckResponse,
  WorkCancelledPayload,
  MarkFilePayload,
  MarkFileResponse,
  StatusUpdatePayload,
  ClaimWorkPayload,
  ClaimWorkResponse,
}
