import { HttpRouterService } from '@adonisjs/core/types'
const FilesController = () => import('#controllers/files_controller')

function fileRoutes(router: HttpRouterService) {
  router
    .group(() => {
      router.get('/:alias', [FilesController, 'resolveFileAlias'])
      router.get('/list/:parentId', [FilesController, 'listFileEntries'])
      router.get('/get/:fileId', [FilesController, 'getFile'])
    })
    .prefix('/file')
}

export { fileRoutes }
