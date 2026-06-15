/**
 * LaTeX-aware segmentation + chunking.
 *
 * CORPUS_POLICY.md: "Never split inside a `$...$` / `\[...\]` block or
 * mid-equation." So we first segment text into maths spans vs prose, then pack
 * segments into size-bounded chunks, splitting ONLY within prose (at paragraph /
 * sentence / word boundaries) and NEVER inside a maths span. A maths span longer
 * than the size budget is still emitted whole.
 */

export type Segment = { type: "math" | "text"; value: string };

// Delimiter pairs, longest/display first so `$$` wins over `$`.
const DELIMITERS: { open: string; close: string }[] = [
  { open: "$$", close: "$$" },
  { open: "\\[", close: "\\]" },
  { open: "\\(", close: "\\)" },
  { open: "$", close: "$" },
];

/** Split text into ordered maths/prose segments. Maths segments keep their delimiters. */
export function segmentLatex(input: string): Segment[] {
  const segments: Segment[] = [];
  let i = 0;
  let textStart = 0;

  while (i < input.length) {
    const delim = DELIMITERS.find((d) => input.startsWith(d.open, i));
    if (!delim) {
      i++;
      continue;
    }
    const closeIdx = input.indexOf(delim.close, i + delim.open.length);
    if (closeIdx === -1) {
      // Unmatched opener — treat as ordinary text, keep scanning.
      i++;
      continue;
    }
    if (i > textStart) segments.push({ type: "text", value: input.slice(textStart, i) });
    const end = closeIdx + delim.close.length;
    segments.push({ type: "math", value: input.slice(i, end) });
    i = end;
    textStart = end;
  }
  if (textStart < input.length) segments.push({ type: "text", value: input.slice(textStart) });
  return segments;
}

export interface ChunkOptions {
  maxChars?: number;
}

const DEFAULT_MAX_CHARS = 1200;

/** Index (within `s`) at which to cut so the first part is <= limit, preferring a
 * paragraph break, then newline, then sentence end, then a space. Falls back to a
 * hard cut at `limit` (only ever applied to prose, never maths). */
function findTextSplit(s: string, limit: number): number {
  const window = s.slice(0, limit);
  const para = window.lastIndexOf("\n\n");
  if (para > 0) return para + 2;
  const nl = window.lastIndexOf("\n");
  if (nl > 0) return nl + 1;
  const sentence = window.lastIndexOf(". ");
  if (sentence > 0) return sentence + 2;
  const space = window.lastIndexOf(" ");
  if (space > 0) return space + 1;
  return limit;
}

/**
 * Pack `text` into chunks of at most `maxChars`, never splitting a maths span.
 * Returns trimmed, non-empty chunks.
 */
export function chunkLatexAware(text: string, opts: ChunkOptions = {}): string[] {
  const maxChars = opts.maxChars ?? DEFAULT_MAX_CHARS;
  const segments = segmentLatex(text);
  const chunks: string[] = [];
  let current = "";

  const flush = () => {
    const t = current.trim();
    if (t) chunks.push(t);
    current = "";
  };

  for (const seg of segments) {
    if (seg.type === "math") {
      // Adding the (atomic) maths span would overflow -> start a fresh chunk.
      if (current.trim() && current.length + seg.value.length > maxChars) flush();
      current += seg.value;
      continue;
    }

    let rest = seg.value;
    while (rest.length > 0) {
      const room = maxChars - current.length;
      if (rest.length <= room) {
        current += rest;
        break;
      }
      const splitAt = findTextSplit(rest, Math.max(room, 1));
      if (splitAt <= 0 && current.trim()) {
        // No room left in the current chunk; flush and retry on an empty one.
        flush();
        continue;
      }
      const cut = splitAt > 0 ? splitAt : Math.min(Math.max(room, 1), rest.length);
      current += rest.slice(0, cut);
      rest = rest.slice(cut);
      flush();
    }
  }
  flush();
  return chunks;
}
