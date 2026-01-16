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
      // Public file-share access (token-based share surface for private files)
      router.get('/share-file/:shareId', [FilesController, 'getFileShare'])

      // Authenticated routes
      router.group(() => {
        router.get('/my-root', [FilesController, 'listMyRoot'])
        router.get('/breadcrumbs/:folderId', [FilesController, 'getBreadcrumbs'])
        router.post('/mkdir', [FilesController, 'mkdir'])
        router.post('/move', [FilesController, 'moveFile'])
        router.post('/share', [FilesController, 'createShare'])
        router.post('/share-file', [FilesController, 'createFileShare'])
        router.get('/my-file-shares', [FilesController, 'listMyFileShares'])
        router.delete('/share-file/:shareId', [FilesController, 'deleteFileShare'])
        // Dedicated viewer endpoint: returns public direct URLs or private presigned URLs (no "share" semantics)
        router.post('/view-urls', [FilesController, 'getFileViewUrls'])
        router.get('/my-shares', [FilesController, 'listMyShares'])
        router.delete('/share/:shareId', [FilesController, 'deleteShare'])
      }).use(middleware.auth())

      // Move greedy route to the end
      router.get('/:alias', [FilesController, 'resolveFileAlias'])
    })
    .prefix('/file')
}

export { fileRoutes }

