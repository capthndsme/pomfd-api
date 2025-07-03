/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { authRoutes } from '../app/routes/authRoutes.js'
import { uploaderRoutes } from '../app/routes/uploaderRoutes.js';
import { serverCommunicationRoutes } from '../app/routes/serverCommunicationRoutes.js';
import { fileRoutes } from '../app/routes/fileRoutes.js';

router.get('/', async () => {
  return {
    hello: 'world',
  }
})


router.get('/.env', async ({ response }) => {
  response.ok(
    // generate fake env
    `# deployed by github-actions
_APP_NAME=CapCloud
_APP_ENV=production
_APP_URL=https://capcloud.com
_DB_HOST=capcloud_db
_DB_PORT=5432
_DB_USER=capcloud
NODE_ENV=production
PORT=3000
BANKING_TOKEN=${Math.random().toString(36).substring(2, 15)}
_DB_PASSWORD=${Math.random().toString(36).substring(2, 15)}
_DB_DATABASE=capcloud
ADONIS_APP_KEY=${Math.random().toString(36).substring(2, 15)}
GEMINI_API_KEY=${Math.random().toString(36).substring(2, 15)}
GEMINI_API_SECRET=${Math.random().toString(36).substring(2, 15)}
    `
  )
})

router.get('/.wp-config.php', async ({ response }) => {
  response.badRequest(`I refuse to identify as WordPress.`)
})



authRoutes(router);
uploaderRoutes(router);
serverCommunicationRoutes(router)
fileRoutes(router);

export default router