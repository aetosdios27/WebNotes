// src/lib/effect/errors.ts
// Typed errors for the entire application

export class NetworkError {
  readonly _tag = "NetworkError";
  constructor(readonly message: string, readonly cause?: unknown) {}
}

export class AuthError {
  readonly _tag = "AuthError";
  constructor(readonly message: string = "Not authenticated") {}
}

export class NotFoundError {
  readonly _tag = "NotFoundError";
  constructor(readonly resource: string, readonly id: string) {}
}

export class ValidationError {
  readonly _tag = "ValidationError";
  constructor(readonly message: string, readonly field?: string) {}
}

export class ConflictError {
  readonly _tag = "ConflictError";
  constructor(
    readonly message: string,
    readonly serverVersion?: number,
    readonly localVersion?: number
  ) {}
}

export class StorageError {
  readonly _tag = "StorageError";
  constructor(readonly operation: string, readonly cause?: unknown) {}
}
