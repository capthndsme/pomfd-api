 
import { HttpRouterService } from "@adonisjs/core/types";

const ServerCommunicationsController = () => import('#controllers/server_communications_controller')

function serverCommunicationRoutes(
  router: HttpRouterService
) {
  /** Upload acknowledgement */
  router.group(() => {
  router.post('/ack', [ServerCommunicationsController, 'uploadAck'])
  router.get('/ping', [ServerCommunicationsController, 'ping'])
  router.post('/ping-info', [ServerCommunicationsController, 'pingWithInfo'])

  router.get('/find-file-work', [ServerCommunicationsController, 'findFileWork'])
  router.post('/mark-file', [ServerCommunicationsController, 'markFile'])
  router.post('/ack-preview', [ServerCommunicationsController, 'addPreviewToFile'])
  router.post('/ack-meta', [ServerCommunicationsController, 'updateFileMeta'])
  router.get('/validate-server-token', [ServerCommunicationsController, 'validateServerToken'])

  
  })
  .prefix('/coordinator/v1')
  //.use(middleware.serverAuth())
  
}


export {
  serverCommunicationRoutes
}