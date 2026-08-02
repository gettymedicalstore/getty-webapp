export class AuthenticationError extends Error {}
export class AuthorizationError extends Error {}
export class InvalidCredentialsError extends AuthenticationError {}
export class SessionExpiredError extends AuthenticationError {}
