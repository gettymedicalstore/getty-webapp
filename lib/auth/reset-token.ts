import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken"

const RESET_TOKEN_EXPIRY: SignOptions["expiresIn"] = "10m"

export type PasswordResetTokenPayload = {
  userId: string
  email: string
  purpose: "password-reset"
  challengeId: string
}

export function createPasswordResetToken(input: {
  userId: string
  email: string
  challengeId: string
}) {
  const payload: PasswordResetTokenPayload = {
    userId: input.userId,
    email: input.email.trim().toLowerCase(),
    purpose: "password-reset",
    challengeId: input.challengeId,
  }

  return jwt.sign(payload, getTokenSecret(), {
    expiresIn: RESET_TOKEN_EXPIRY,
    issuer: "getty-medical-store",
    audience: "password-reset",
  })
}

export function verifyPasswordResetToken(
  token: string
): PasswordResetTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getTokenSecret(), {
      issuer: "getty-medical-store",
      audience: "password-reset",
    })

    if (!isJwtPayload(decoded)) {
      return null
    }

    if (
      decoded.purpose !== "password-reset" ||
      typeof decoded.userId !== "string" ||
      typeof decoded.email !== "string" ||
      typeof decoded.challengeId !== "string"
    ) {
      return null
    }

    return {
      userId: decoded.userId,
      email: decoded.email.trim().toLowerCase(),
      purpose: "password-reset",
      challengeId: decoded.challengeId,
    }
  } catch {
    return null
  }
}

function getTokenSecret() {
  const secret = process.env.AUTH_TOKEN_SECRET?.trim()

  if (!secret || secret.length < 32) {
    throw new Error("AUTH_TOKEN_SECRET must contain at least 32 characters.")
  }

  return secret
}

function isJwtPayload(value: string | JwtPayload): value is JwtPayload {
  return typeof value === "object" && value !== null
}
