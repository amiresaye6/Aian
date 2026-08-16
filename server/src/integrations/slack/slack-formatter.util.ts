/**
 * Converts standard Markdown to Slack's mrkdwn format.
 *
 * Slack uses its own markup syntax which differs from standard Markdown:
 *   - Bold: *text* (not **text**)
 *   - Italic: _text_ (same)
 *   - Strikethrough: ~text~ (not ~~text~~)
 *   - Links: <url|text> (not [text](url))
 *   - No # headers (we bold them as a fallback)
 *   - Bullet points: • (not - or *)
 *
 * This function is applied once at the sendReply chokepoint, so every
 * outgoing message from the orchestrator is Slack-safe.
 */
export function markdownToSlackMrkdwn(markdown: string): string {
  if (!markdown) return markdown;

  let text = markdown;

  // ── Preserve code blocks so we don't mangle their contents ──────────
  const codeBlocks: string[] = [];
  text = text.replace(/```[\s\S]*?```/g, (match) => {
    codeBlocks.push(match);
    return `__CODEBLOCK_${codeBlocks.length - 1}__`;
  });

  const inlineCodes: string[] = [];
  text = text.replace(/`[^`]+`/g, (match) => {
    inlineCodes.push(match);
    return `__INLINECODE_${inlineCodes.length - 1}__`;
  });

  // ── Links: [text](url) → <url|text> ────────────────────────────────
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<$2|$1>');

  // ── Bold: **text** or __text__ → *text* ─────────────────────────────
  // Must run before italic since ** contains *
  text = text.replace(/\*\*(.+?)\*\*/g, '*$1*');
  text = text.replace(/__(.+?)__/g, '*$1*');

  // ── Strikethrough: ~~text~~ → ~text~ ────────────────────────────────
  text = text.replace(/~~(.+?)~~/g, '~$1~');

  // ── Headers: # Header → *Header* (bold fallback) ───────────────────
  text = text.replace(/^#{1,6}\s+(.+)$/gm, '*$1*');

  // ── Bullet points: leading - or * (not bold) → • ───────────────────
  // Only match lines starting with optional whitespace then - or * followed by space
  text = text.replace(/^(\s*)[-*]\s+/gm, '$1• ');

  // ── Horizontal rules: --- or *** or ___ → ——— ──────────────────────
  text = text.replace(/^[-*_]{3,}$/gm, '———');

  // ── Restore code blocks ─────────────────────────────────────────────
  text = text.replace(
    /__INLINECODE_(\d+)__/g,
    (_, i) => inlineCodes[parseInt(i)],
  );
  text = text.replace(
    /__CODEBLOCK_(\d+)__/g,
    (_, i) => codeBlocks[parseInt(i)],
  );

  return text;
}
