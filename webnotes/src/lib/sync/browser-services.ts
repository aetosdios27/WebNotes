import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/http";
import * as Y from "yjs";
import { AckStoreError, AckVectorStore, SyncTransport, TransportError } from "./services";
import { fromBase64Url, syncUrl, toBase64Url } from "./encoding";

export const browserTransport = Layer.effect(SyncTransport, Effect.gen(function*() {
  const client = yield* HttpClient.HttpClient;
  const execute = (request: HttpClientRequest.HttpClientRequest) => client.execute(request).pipe(
    Effect.mapError(() => new TransportError({ message: "Sync connection failed", retryable: true })),
    Effect.flatMap(response => response.status >= 200 && response.status < 300
      ? Effect.succeed(response)
      : Effect.fail(new TransportError({
          message: `Sync failed (${response.status})`,
          retryable: response.status >= 500 || response.status === 408 || response.status === 429,
        }))),
    Effect.timeout("15 seconds"),
    Effect.catchTag("TimeoutError", () => Effect.fail(new TransportError({ message: "Sync timed out", retryable: true }))),
  );
  return SyncTransport.of({
    push: (id, update) => execute(HttpClientRequest.post(syncUrl(id)).pipe(
      HttpClientRequest.bodyUint8Array(update, "application/octet-stream"),
    )).pipe(Effect.asVoid),
    pull: (id, vector) => Effect.gen(function*() {
      const response = yield* execute(HttpClientRequest.get(syncUrl(id), {
        urlParams: { sv: toBase64Url(vector) },
      }));
      const buffer = yield* response.arrayBuffer.pipe(
        Effect.mapError(() => new TransportError({ message: "Could not read sync response", retryable: true })),
      );
      return yield* Effect.try({
        try: () => {
          const update = new Uint8Array(buffer);
          Y.decodeUpdate(update);
          const serverVector = fromBase64Url(response.headers["x-yjs-state-vector"] ?? "");
          Y.decodeStateVector(serverVector);
          return { update, serverVector, hasServerState: response.headers["x-yjs-has-state"] === "true" };
        },
        catch: () => new TransportError({ message: "Invalid sync response", retryable: false }),
      });
    }).pipe(
      Effect.timeout("15 seconds"),
      Effect.catchTag("TimeoutError", () => Effect.fail(new TransportError({ message: "Sync timed out", retryable: true }))),
    ),
    beacon: (id, update) => {
      navigator.sendBeacon(syncUrl(id), new Blob([new Uint8Array(update)], { type: "application/octet-stream" }));
    },
  });
})).pipe(Layer.provide(FetchHttpClient.layer));

// Include the account in the key: a different account must never inherit an ack.
export function browserAckStore(userId: string) {
  const key = (id: string) => `webnotes-sync-ack:${userId}:${id}`;
  return Layer.succeed(AckVectorStore, AckVectorStore.of({
    load: id => Effect.try({
      try: () => {
        const value = localStorage.getItem(key(id));
        if (value === null) return null;
        const bytes = fromBase64Url(value);
        Y.decodeStateVector(bytes);
        return bytes;
      },
      catch: () => new AckStoreError({ message: "Could not read sync acknowledgement" }),
    }),
    save: (id, vector) => Effect.try({
      try: () => localStorage.setItem(key(id), toBase64Url(vector)),
      catch: () => new AckStoreError({ message: "Could not persist sync acknowledgement" }),
    }),
  }));
}
