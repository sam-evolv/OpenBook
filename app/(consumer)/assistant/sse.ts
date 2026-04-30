/**
 * Tiny SSE parser for the /api/ai/chat stream.
 *
 * Holds onto partial chunks across reads so an event split mid-line
 * (which happens regularly on real networks) is dispatched exactly
 * once when its terminator arrives. Yields each parsed event so the
 * caller can update React state synchronously.
 */

export interface SSEEvent {
  event: string;
  data: any;
}

export async function* parseSSE(
  res: Response
): AsyncGenerator<SSEEvent, void, void> {
  if (!res.body) return;
  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE events are separated by a blank line. Walk through complete
      // events and leave any trailing partial in the buffer for the next chunk.
      let idx: number;
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const raw = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);

        let eventName = 'message';
        let dataLines: string[] = [];

        for (const line of raw.split('\n')) {
          if (line.startsWith('event:')) {
            eventName = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            dataLines.push(line.slice(5).trimStart());
          }
        }
        if (dataLines.length === 0) continue;
        const dataStr = dataLines.join('\n');
        let data: any;
        try {
          data = JSON.parse(dataStr);
        } catch {
          data = dataStr;
        }
        yield { event: eventName, data };
      }
    }

    // Flush any remaining buffer (rare — server should always close after `done`).
    buffer += decoder.decode();
    if (buffer.trim().length > 0) {
      const lines = buffer.split('\n');
      let eventName = 'message';
      const dataLines: string[] = [];
      for (const line of lines) {
        if (line.startsWith('event:')) eventName = line.slice(6).trim();
        else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
      }
      if (dataLines.length > 0) {
        try {
          yield { event: eventName, data: JSON.parse(dataLines.join('\n')) };
        } catch {
          /* ignore trailing garbage */
        }
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* already released */
    }
  }
}
