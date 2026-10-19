import { EventEmitter } from "events";

/**
 * In-process pub/sub used to nudge the SSE stream the instant attendance
 * changes on the same server instance (scan route / manual PATCH route).
 *
 * Correctness never depends on this: the SSE route also polls the database
 * every few hundred ms, so changes made on a different serverless instance
 * are still delivered promptly.
 */
const globalForEvents = globalThis as unknown as {
  attendanceEmitter: EventEmitter | undefined;
};

const emitter: EventEmitter =
  globalForEvents.attendanceEmitter ?? new EventEmitter();
emitter.setMaxListeners(0);

if (process.env.NODE_ENV !== "production") {
  globalForEvents.attendanceEmitter = emitter;
}

export function publishAttendanceChange(sessionId: string): void {
  emitter.emit(sessionId);
}

export function subscribeAttendanceChange(
  sessionId: string,
  listener: () => void
): () => void {
  emitter.on(sessionId, listener);
  return () => {
    emitter.off(sessionId, listener);
  };
}
