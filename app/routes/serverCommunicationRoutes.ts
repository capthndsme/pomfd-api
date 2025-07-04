import { middleware } from "#start/kernel";
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
  })
  .prefix('/coordinator/v1')
  .use(middleware.serverAuth())
  
}


export {
  serverCommunicationRoutes
}