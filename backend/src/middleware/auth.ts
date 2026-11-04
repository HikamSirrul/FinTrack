
import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

declare global {
  namespace Express {
    interface Request {
      userId?: string
    }
  }
}

export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authorization = req.headers.authorization

  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice(7)
    : null

  if (!token) {
    res.status(401).json({
      message: 'Token autentikasi diperlukan.',
    })
    return
  }

  const secret = process.env.JWT_SECRET

  if (!secret) {
    res.status(500).json({
      message: 'Konfigurasi autentikasi bermasalah.',
    })
    return
  }

  try {
    const payload = jwt.verify(token, secret)

    if (
      typeof payload === 'string' ||
      typeof payload.userId !== 'string'
    ) {
      res.status(401).json({
        message: 'Token tidak valid.',
      })
      return
    }

    req.userId = payload.userId
    next()
  } catch {
    res.status(401).json({
      message: 'Token tidak valid atau sudah kedaluwarsa.',
    })
  }
}
