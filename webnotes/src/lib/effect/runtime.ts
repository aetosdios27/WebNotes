// src/lib/effect/runtime.ts
// The Effect runtime - runs effects in the browser

import { Effect, Runtime, Layer, ManagedRuntime } from "effect";

// Create a runtime that can be used in React components
export const appRuntime = ManagedRuntime.make(Layer.empty);

// Helper to run effects from React
export const runEffect = <A, E>(
  effect: Effect.Effect<A, E, never>
): Promise<A> => {
  return Effect.runPromise(effect);
};

// Helper to run effects that can fail
export const runEffectEither = <A, E>(effect: Effect.Effect<A, E, never>) => {
  return Effect.runPromise(Effect.either(effect));
};
