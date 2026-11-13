import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as Y from "yjs";
import { fromBase64Url, toBase64Url } from "./encoding";
import { encodeDiff } from "./state";
import { MAX_UPDATE_BYTES } from "./update-input";
import type { createUpdateLog } from "./update-log";

class Unauthorized extends Data.TaggedError("Unauthorized")<{}> {}
class NotFound extends Data.TaggedError("NotFound")<{}> {}
class InvalidInput extends Data.TaggedError("InvalidInput")<{ readonly message: string }> {}
class TooLarge extends Data.TaggedError("TooLarge")<{}> {}
class UnsupportedMedia extends Data.TaggedError("UnsupportedMedia")<{}> {}
class ServerError extends Data.TaggedError("ServerError")<{ readonly cause: unknown }> {}

const NoteId = Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(1024));
const StateVector = Schema.Uint8ArrayFromBase64Url;
const Update = Schema.Uint8Array.check(Schema.isMinLength(2));
const database = <A>(run: () => Promise<A>) => Effect.tryPromise({
  try: run,
  catch: cause => new ServerError({ cause }),
});
const invalid = () => new InvalidInput({ message: "Invalid sync input" });

// Streaming the body keeps the bound effective even without Content-Length.
function readUpdate(request: Request) {
  return Effect.gen(function*() {
    const contentLength = request.headers.get("content-length");
    if (contentLength && Number(contentLength) > MAX_UPDATE_BYTES) return yield* new TooLarge();
    if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/octet-stream") {
      return yield* new UnsupportedMedia();
    }
    const bytes = yield* Effect.tryPromise({
      try: async () => {
        const reader = request.body?.getReader();
        if (!reader) return new Uint8Array();
        const chunks: Uint8Array[] = [];
        let size = 0;
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > MAX_UPDATE_BYTES) {
              await reader.cancel();
              throw new TooLarge();
            }
            chunks.push(value);
          }
        } finally {
          reader.releaseLock();
        }
        const bytes = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) {
          bytes.set(chunk, offset);
          offset += chunk.byteLength;
        }
        return bytes;
      },
      catch: cause => cause instanceof TooLarge ? cause : invalid(),
    });
    const update = yield* Schema.decodeUnknownEffect(Update)(bytes).pipe(Effect.mapError(invalid));
    yield* Effect.try({ try: () => Y.decodeUpdate(update), catch: invalid });
    return update;
  });
}

export function createBinarySyncHandlers(deps: {
  readonly session: () => Promise<{ user?: { id?: string } } | null>;
  readonly ownsNote: (id: string, userId: string) => Promise<boolean>;
  readonly log: ReturnType<typeof createUpdateLog>;
  readonly touch: (id: string) => Promise<unknown>;
}) {
  type Context = { params: Promise<{ id: string }> };
  const authorize = (context: Context) => Effect.gen(function*() {
    const session = yield* database(deps.session);
    const userId = session?.user?.id;
    if (!userId) return yield* new Unauthorized();
    const params = yield* database(() => context.params);
    const id = yield* Schema.decodeUnknownEffect(NoteId)(params.id).pipe(Effect.mapError(invalid));
    if (!(yield* database(() => deps.ownsNote(id, userId)))) return yield* new NotFound();
    return id;
  });
  const failure = (status: number, error: string) => Effect.succeed(Response.json({ error }, {
    status, headers: { "Cache-Control": "no-store" },
  }));
  const run = (program: Effect.Effect<Response, Unauthorized | NotFound | InvalidInput | TooLarge | UnsupportedMedia | ServerError>) =>
    Effect.runPromise(program.pipe(Effect.catchTags({
      Unauthorized: () => failure(401, "Unauthorized"),
      NotFound: () => failure(404, "Not found"),
      InvalidInput: error => failure(400, error.message),
      TooLarge: () => failure(413, "Yjs update exceeds the 1 MB limit"),
      UnsupportedMedia: () => failure(415, "Expected application/octet-stream"),
      ServerError: error => Effect.logError("Binary note sync failed", error.cause).pipe(
        Effect.andThen(failure(500, "Internal error"))),
    })));
  return {
    POST: (request: Request, context: Context) => run(Effect.gen(function*() {
      const id = yield* authorize(context);
      const update = yield* readUpdate(request);
      yield* database(() => deps.log.appendUpdate(id, update));
      yield* database(() => deps.touch(id));
      yield* database(() => deps.log.compactIfNeeded(id));
      return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
    })),
    GET: (request: Request, context: Context) => run(Effect.gen(function*() {
      const id = yield* authorize(context);
      const encoded = new URL(request.url).searchParams.get("sv");
      if (encoded === null || encoded.length > Math.ceil(MAX_UPDATE_BYTES * 4 / 3)) return yield* invalid();
      const vector = yield* Schema.decodeUnknownEffect(StateVector)(encoded).pipe(Effect.mapError(invalid));
      // Require the same URL-safe alphabet the client emits.
      yield* Effect.try({ try: () => { fromBase64Url(encoded); Y.decodeStateVector(vector); }, catch: invalid });
      const stored = yield* database(() => deps.log.readState(id));
      const state = stored ?? new Uint8Array([0, 0]);
      const diff = encodeDiff(state, vector);
      return new Response(new Uint8Array(diff), {
        headers: {
          "Content-Type": "application/octet-stream",
          "Cache-Control": "no-store",
          "X-Yjs-State-Vector": toBase64Url(Y.encodeStateVectorFromUpdate(state)),
          "X-Yjs-Has-State": String(stored !== null),
        },
      });
    })),
  };
}
