import { middleware } from '#start/kernel'
import { HttpRouterService } from '@adonisjs/core/types'
const FilesController = () => import('#controllers/files_controller')

function fileRoutes(router: HttpRouterService) {
  router
    .group(() => {
      // Public routes (auth optional)
      router.get('/list/:parentId', [FilesController, 'listFileEntries'])
      router.get('/get/:fileId', [FilesController, 'getFile'])

      // Public share access
      router.get('/share/:shareId', [FilesController, 'getShare'])
      router.post('/share/:shareId/verify', [FilesController, 'verifySharePassword'])

      // Authenticated routes
      router.group(() => {
        router.get('/my-root', [FilesController, 'listMyRoot'])
        router.post('/mkdir', [FilesController, 'mkdir'])
        router.post('/move', [FilesController, 'moveFile'])
        router.post('/share', [FilesController, 'createShare'])
        router.get('/my-shares', [FilesController, 'listMyShares'])
        router.delete('/share/:shareId', [FilesController, 'deleteShare'])
      }).use(middleware.auth())

      // Move greedy route to the end
      router.get('/:alias', [FilesController, 'resolveFileAlias'])
    })
    .prefix('/file')
}

export { fileRoutes }

