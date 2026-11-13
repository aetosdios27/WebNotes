import * as Context from "effect/Context";
import * as Data from "effect/Data";
import type * as Effect from "effect/Effect";

export class TransportError extends Data.TaggedError("TransportError")<{
  readonly message: string;
  readonly retryable: boolean;
}> {}

export class AckStoreError extends Data.TaggedError("AckStoreError")<{
  readonly message: string;
}> {}

export class SyncTransport extends Context.Service<SyncTransport, {
  readonly push: (id: string, update: Uint8Array) => Effect.Effect<void, TransportError>;
  readonly pull: (id: string, vector: Uint8Array) => Effect.Effect<{
    readonly update: Uint8Array;
    readonly serverVector: Uint8Array;
    readonly hasServerState: boolean;
  }, TransportError>;
  readonly beacon: (id: string, update: Uint8Array) => void;
}>()("webnotes/SyncTransport") {}

export class AckVectorStore extends Context.Service<AckVectorStore, {
  readonly load: (id: string) => Effect.Effect<Uint8Array | null, AckStoreError>;
  readonly save: (id: string, vector: Uint8Array) => Effect.Effect<void, AckStoreError>;
}>()("webnotes/AckVectorStore") {}
