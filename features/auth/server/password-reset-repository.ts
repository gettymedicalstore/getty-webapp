import { createHash, randomInt, randomUUID, timingSafeEqual } from "node:crypto"

const OTP_EXPIRY_MS = 10 * 60 * 1000
const MAX_ATTEMPTS = 5

export type PasswordResetChallenge = {
  id: string
  userId: string
  email: string
  otpHash: string
  attempts: number
  verified: boolean
  used: boolean
  expiresAt: string
  createdAt: string
  verifiedAt?: string
  usedAt?: string
}

const challenges = new Map<string, PasswordResetChallenge>()

export function createPasswordResetChallenge(input: {
  userId: string
  email: string
}) {
  invalidateExistingChallenges(input.userId)

  const otp = randomInt(0, 10_000).toString().padStart(4, "0")

  const now = new Date()
  const challengeId = randomUUID()

  const challenge: PasswordResetChallenge = {
    id: challengeId,
    userId: input.userId,
    email: input.email.trim().toLowerCase(),
    otpHash: hashOtp(otp),
    attempts: 0,
    verified: false,
    used: false,
    expiresAt: new Date(now.getTime() + OTP_EXPIRY_MS).toISOString(),
    createdAt: now.toISOString(),
  }

  challenges.set(challengeId, challenge)

  return {
    challenge,
    otp,
    expiresInSeconds: Math.floor(OTP_EXPIRY_MS / 1000),
  }
}

export function verifyPasswordResetChallenge(input: {
  challengeId: string
  email: string
  otp: string
}) {
  const challenge = challenges.get(input.challengeId)

  if (!challenge) {
    return failure("The verification code is invalid or has expired.")
  }

  if (challenge.used) {
    return failure("This verification code has already been used.")
  }

  if (challenge.verified) {
    return failure("This verification code has already been verified.")
  }

  if (new Date(challenge.expiresAt).getTime() <= Date.now()) {
    challenges.delete(challenge.id)

    return failure("The verification code has expired.")
  }

  if (challenge.email !== input.email.trim().toLowerCase()) {
    return failure("The verification code is invalid.")
  }

  if (challenge.attempts >= MAX_ATTEMPTS) {
    challenges.delete(challenge.id)

    return failure(
      "Too many incorrect attempts. Request a new verification code."
    )
  }

  const updatedAttempts = challenge.attempts + 1

  if (!isMatchingOtp(challenge.otpHash, input.otp)) {
    challenges.set(challenge.id, {
      ...challenge,
      attempts: updatedAttempts,
    })

    return {
      success: false as const,
      message: "The verification code is incorrect.",
      remainingAttempts: Math.max(0, MAX_ATTEMPTS - updatedAttempts),
    }
  }

  const verifiedChallenge: PasswordResetChallenge = {
    ...challenge,
    attempts: updatedAttempts,
    verified: true,
    verifiedAt: new Date().toISOString(),
  }

  challenges.set(challenge.id, verifiedChallenge)

  return {
    success: true as const,
    challenge: verifiedChallenge,
  }
}

export function consumePasswordResetChallenge(input: {
  challengeId: string
  userId: string
  email: string
}) {
  const challenge = challenges.get(input.challengeId)

  if (!challenge) {
    return failure("Your password reset session is invalid or has expired.")
  }

  if (
    challenge.userId !== input.userId ||
    challenge.email !== input.email.trim().toLowerCase()
  ) {
    return failure("Your password reset session is invalid.")
  }

  if (!challenge.verified || challenge.used) {
    return failure("Your password reset session is no longer valid.")
  }

  if (new Date(challenge.expiresAt).getTime() <= Date.now()) {
    challenges.delete(challenge.id)

    return failure("Your password reset session has expired.")
  }

  const consumedChallenge: PasswordResetChallenge = {
    ...challenge,
    used: true,
    usedAt: new Date().toISOString(),
  }

  challenges.set(challenge.id, consumedChallenge)

  return {
    success: true as const,
    challenge: consumedChallenge,
  }
}

export function createPublicChallengeId(challengeId: string) {
  return challengeId
}

function invalidateExistingChallenges(userId: string) {
  for (const [challengeId, challenge] of challenges) {
    if (challenge.userId === userId && !challenge.used) {
      challenges.delete(challengeId)
    }
  }
}

function hashOtp(otp: string) {
  return createHash("sha256").update(`${otp}:${getOtpSecret()}`).digest("hex")
}

function isMatchingOtp(expectedHash: string, otp: string) {
  const receivedHash = hashOtp(otp)

  const expectedBuffer = Buffer.from(expectedHash, "hex")
  const receivedBuffer = Buffer.from(receivedHash, "hex")

  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  )
}

function getOtpSecret() {
  const secret = process.env.AUTH_TOKEN_SECRET?.trim()

  if (!secret) {
    throw new Error("AUTH_TOKEN_SECRET is not configured.")
  }

  return secret
}

function failure(message: string) {
  return {
    success: false as const,
    message,
  }
}
