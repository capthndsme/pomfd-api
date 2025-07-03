import { HttpRouterService } from '@adonisjs/core/types'

const FilesController = () => import('#controllers/files_controller')

export function fileRoutes(router: HttpRouterService) {
  router.get('/files/:inodeId', [FilesController, 'show'])
}
