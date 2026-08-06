/* ============================================================================
   TEMPORARY PROBE ROUTE — created only to empirically verify NDJSON streaming.
   DELETE THIS FILE (and the app/api/streamtest folder) when done.
   ============================================================================ */

/* NOTE: deliberately NO `export const runtime` and NO `export const dynamic`
   here, so the build output tells us empirically whether they are required.
   ANSWERED: `next build` lists `ƒ /api/streamtest` (Dynamic) without either
   export, even though GET touched nothing from `request`. Neither is needed.

   OPEN QUESTION this round: node/undici sees the chunks arrive one by one, but
   a real Chromium got all five at once, 2s in — so something between the socket
   and `reader.read()` is holding them. Suspect MIME sniffing: the browser wants
   ~1KB before it will commit to a type, and five NDJSON lines are ~500 bytes
   total. Query params below let one build test every candidate fix:
     ?nosniff=1   -> send X-Content-Type-Options: nosniff
     ?pad=N       -> emit an N-byte filler line first
     ?ct=<type>   -> override the Content-Type
   -------------------------------------------------------------------------- */

const encoder = new TextEncoder();

function ndjson(obj: unknown): Uint8Array {
  return encoder.encode(JSON.stringify(obj) + "\n");
}

function streamHeaders(opts: {
  nosniff: boolean;
  ct: string;
  notransform: boolean;
  identity: boolean;
}) {
  const h: Record<string, string> = {
    "Content-Type": opts.ct,
    /* `no-transform` adalah satu-satunya cara respons melarang perantara
       (termasuk kompresor bawaan `next start`) mengubah badannya */
    "Cache-Control": opts.notransform ? "no-store, no-transform" : "no-store",
    "X-Accel-Buffering": "no",
  };
  if (opts.nosniff) h["X-Content-Type-Options"] = "nosniff";
  /* menyatakan encoding secara eksplisit: kompresor yang taat tidak akan
     menimpa Content-Encoding yang sudah ada */
  if (opts.identity) h["Content-Encoding"] = "identity";
  return h;
}

type Variant = {
  nosniff: boolean;
  pad: number;
  ct: string;
  notransform: boolean;
  identity: boolean;
};

function readVariant(request: Request): Variant {
  const sp = new URL(request.url).searchParams;
  const pad = Number(sp.get("pad") ?? 0);
  return {
    nosniff: sp.get("nosniff") === "1",
    pad: Number.isFinite(pad) && pad > 0 ? Math.min(pad, 64 * 1024) : 0,
    ct: sp.get("ct") || "application/x-ndjson",
    notransform: sp.get("notransform") === "1",
    identity: sp.get("identity") === "1",
  };
}

/* -----------------------------------------------------------------------------
   GET: the plain 5-lines-at-500ms probe, now variant-aware.
   -------------------------------------------------------------------------- */
export function GET(request: Request) {
  const v = readVariant(request);
  const stream = makeStream({
    lines: 5,
    delayMs: 500,
    mode: "ok",
    tag: "GET",
    pad: v.pad,
  });
  return new Response(stream, { headers: streamHeaders(v) });
}

/* -----------------------------------------------------------------------------
   POST: same machinery, but parameterised so one file can drive every
   experiment (error mid-stream, long stream for the abort test).
   -------------------------------------------------------------------------- */
export async function POST(request: Request) {
  const v = readVariant(request);
  let body: { lines?: number; delayMs?: number; mode?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const stream = makeStream({
    lines: typeof body.lines === "number" ? body.lines : 5,
    delayMs: typeof body.delayMs === "number" ? body.delayMs : 500,
    mode: body.mode === "error" ? "error" : "ok",
    tag: "POST",
    pad: v.pad,
  });

  return new Response(stream, { headers: streamHeaders(v) });
}

function makeStream(opts: {
  lines: number;
  delayMs: number;
  mode: "ok" | "error";
  tag: string;
  pad: number;
}) {
  const { lines, delayMs, mode, tag, pad } = opts;

  /* Held outside the ReadableStream callbacks so cancel() can interrupt the
     in-flight sleep instead of letting the loop run to completion. */
  let timer: ReturnType<typeof setTimeout> | undefined;
  let wake: (() => void) | undefined;
  let cancelled = false;

  const sleep = (ms: number) =>
    new Promise<void>((resolve) => {
      wake = resolve;
      timer = setTimeout(resolve, ms);
    });

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const t0 = Date.now();
      console.log(`[streamtest:${tag}] start pid=${process.pid} pad=${pad}`);

      try {
        /* Filler FIRST, as its own NDJSON line, so a client that splits on
           "\n" can skip it by looking at `.filler` instead of choking. */
        if (pad > 0) controller.enqueue(ndjson({ filler: "x".repeat(pad) }));

        for (let seq = 1; seq <= lines; seq++) {
          if (cancelled) {
            console.log(`[streamtest:${tag}] loop saw cancelled, stopping`);
            return;
          }

          if (mode === "error" && seq === 3) {
            /* Error MID-stream: status 200 + headers were already flushed with
               the first chunk, so there is no way to turn this into a 500. All
               the client gets is a torn connection. */
            console.log(`[streamtest:${tag}] erroring stream at seq=${seq}`);
            controller.error(new Error("probe blew up mid-stream"));
            return;
          }

          controller.enqueue(
            ndjson({
              seq,
              stage: `stage-${seq}`,
              serverMs: Date.now() - t0,
              serverIso: new Date().toISOString(),
            })
          );
          console.log(
            `[streamtest:${tag}] enqueued seq=${seq} at +${Date.now() - t0}ms`
          );

          if (seq < lines) await sleep(delayMs);
        }

        /* close() throws if the stream was already cancelled/errored. */
        if (!cancelled) controller.close();
      } catch (err) {
        if (!cancelled) {
          try {
            controller.error(err);
          } catch {
            /* already torn down */
          }
        }
      } finally {
        if (timer) clearTimeout(timer);
      }
    },

    /* Called by the platform when the CLIENT goes away (or calls
       reader.cancel()). `reason` is undefined for a plain socket hangup. */
    cancel(reason) {
      cancelled = true;
      if (timer) clearTimeout(timer);
      wake?.(); // unblock the pending sleep so start() can bail immediately
      console.log(
        `[streamtest:${tag}] CANCEL fired reason=${String(reason)} at ${new Date().toISOString()}`
      );
    },
  });
}
