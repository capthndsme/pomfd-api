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
import { fileRoutes } from '#models/fileRoutes';

router.get('/', async () => {
  return {
    hello: 'world',
  }
})

authRoutes(router);
uploaderRoutes(router);
serverCommunicationRoutes(router)
fileRoutes(router)