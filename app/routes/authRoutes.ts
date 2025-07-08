import { middleware } from "#start/kernel";
import { HttpRouterService } from "@adonisjs/core/types";

/** Imports */
const AuthController = () => import('#controllers/auth_controller')

function authRoutes(router: HttpRouterService) {
  router.group(() => {
    router.post('/login', [AuthController, 'login'])
    router.post('/register', [AuthController, 'createAccount'])

    router.group(() => {
      router.post('/logout', [AuthController, 'logout'])
      router.get('/verify-token', [AuthController, 'verifyToken'])
      router.get('/profile', [AuthController, 'getMyProfile'])
    }).use(middleware.auth())

    // verification for backend
    router.post('/verify-user-token', [AuthController, 'verifyUserToken'])
    .use(middleware.serverAuth()) // only 
    
  }).prefix('auth')
  
}

export {
  authRoutes
}

