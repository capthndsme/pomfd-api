import type { HttpContext } from '@adonisjs/core/http'
import { createFailure, createSuccess } from '../../shared/types/ApiBase.js'
import { LoginRequest, CreateAccountRequest } from '../../shared/types/request/AuthRequest.js'
import User from '#models/user'
import hash from '@adonisjs/core/services/hash'
import db from '@adonisjs/lucid/services/db'
import { createHash } from 'crypto'
import { DateTime } from 'luxon'

export default class AuthController {
  async login({ request, response }: HttpContext) {
    const { email, username, password } = request.body() as LoginRequest

    if ((!email && !username) || !password) {
      return response.status(400).send(createFailure('Email/Username and password are required'))
    }

    try {
      const user = await User.findBy(email ? 'email' : 'username', email ?? username)

      if (!user) {
        return response.status(404).send(createFailure('User not found', 'user-not-found'))
      }

      if (!(await hash.verify(user.password, password))) {
        return response.status(401).send(createFailure('Invalid credentials', 'invalid-credentials'))
      }

      const token = await User.accessTokens.create(user)

      return response
        .status(200)
        .send(createSuccess({ user, token: token.value!.release() }, 'Login successful'))
    } catch (error) {
      return response.status(500).send(createFailure('Internal server error'))
    }
  }

  async logout({ auth, response }: HttpContext) {
    try {
      const user = auth.getUserOrFail()
      const token = auth.user?.currentAccessToken
      if (token) {
        await User.accessTokens.delete(user, token.identifier)
        return response.status(200).send(createSuccess(null, 'Logout successful'))
      }
      return response.status(400).send(createFailure('No active token found to invalidate'))
    } catch (error) {
      return response.status(500).send(createFailure('An error occurred during logout.'))
    }
  }

  async verifyToken({ auth, response }: HttpContext) {
    try {
      await auth.check()
      if (auth.isAuthenticated) {
        return response
          .status(200)
          .send(createSuccess({ user: auth.user }, 'Token is valid', 'success'))
      } else {
        return response.status(401).send(createFailure('Token is invalid', 'token-invalid'))
      }
    } catch (error) {
      return response.status(500).send(createFailure('Internal server error'))
    }
  }

  async createAccount({ request, response }: HttpContext) {
    const { email, password, username, fullName } = request.body() as CreateAccountRequest

    if (!email || !password || !username) {
      return response.status(400).send(createFailure('Email, password, and username are required'))
    }

    try {
      const existingUser = await User.query().where('email', email).orWhere('username', username).first()

      if (existingUser) {
        return response
          .status(409)
          .send(createFailure('User with that email or username already exists', 'user-already-exists'))
      }

      const user = new User()
      user.email = email
      user.password = password
      user.username = username
      user.fullName = fullName ?? ''

      await user.save()

      const token = await User.accessTokens.create(user)

      return response
        .status(201)
        .send(createSuccess({ user, token: token.value!.release() }, 'Account created successfully'))
    } catch (error) {
      return response.status(500).send(createFailure('Internal server error'))
    }
  }

  /** Verify a particular user to token, for backend to backend usage */
  async verifyUserToken({ request, response }: HttpContext) {
    const { userId, token } = request.body()

    if (!userId || !token) {
      return response.badRequest(createFailure('User ID and token are required', 'einval'))
    }

    try {
      // Manual Verification Logic - Ported from Java Service
      // Format: oat_{base64_id}.{base64_secret}

      const TOKEN_PREFIX = 'oat_'
      if (!token.startsWith(TOKEN_PREFIX)) {
        return response.unauthorized(createFailure('Invalid token format', 'token-invalid'))
      }

      const withoutPrefix = token.substring(TOKEN_PREFIX.length)
      const dotIndex = withoutPrefix.indexOf('.')

      if (dotIndex === -1) {
        return response.unauthorized(createFailure('Invalid token format', 'token-invalid'))
      }

      const base64Id = withoutPrefix.substring(0, dotIndex)
      const base64Secret = withoutPrefix.substring(dotIndex + 1)

      let tokenId: string
      let secret: string

      try {
        tokenId = Buffer.from(base64Id, 'base64').toString('utf-8')
        secret = Buffer.from(base64Secret, 'base64').toString('utf-8')
      } catch (e) {
        return response.unauthorized(createFailure('Invalid token encoding', 'token-invalid'))
      }

      // Hash the secret
      const hash = createHash('sha256').update(secret).digest('hex')

      // DB Lookup
      const tokenRow = await db
        .from('auth_access_tokens')
        .where('id', tokenId)
        .first()

      if (!tokenRow) {
        return response.unauthorized(createFailure('Token not found', 'token-invalid'))
      }

      // Verify hash
      if (tokenRow.hash !== hash) {
        return response.unauthorized(createFailure('Token hash mismatch', 'token-invalid'))
      }

      // Verify Owner
      if (String(tokenRow.tokenable_id) !== String(userId)) {
        return response.unauthorized(createFailure('Token does not belong to this user', 'token-invalid'))
      }

      // Verify Expiry
      if (tokenRow.expires_at) {
        const expiresAt = typeof tokenRow.expires_at === 'string'
          ? DateTime.fromSQL(tokenRow.expires_at)
          : DateTime.fromJSDate(tokenRow.expires_at)

        if (expiresAt < DateTime.now()) {
          return response.unauthorized(createFailure('Token expired', 'token-invalid'))
        }
      }

      return response.ok(createSuccess(null, 'Token is valid', 'success'))

    } catch (error) {
      console.error('Error verifying user token:', error)
      return response.internalServerError(createFailure('Internal server error'))
    }
  }

  async getMyProfile({ auth, response }: HttpContext) {
    try {
      const user = auth.getUserOrFail()
      return response.ok(createSuccess(user, 'User profile retrieved successfully', 'success'))
    } catch (error) {
      return response.unauthorized(createFailure('Authentication required', 'unauthorized'))
    }
  }


}
