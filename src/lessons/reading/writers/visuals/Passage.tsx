/**
 * A short passage for practice questions and examples. Rendered as HTML (not SVG) so it stays
 * readable at panel size. Words wrapped in *stars* are marked.
 */
export function Passage({ text }: { text: string }) {
  const parts = text.split(/(\*[^*]+\*)/g).filter(Boolean);
  return (
    <p
      style={{
        margin: 0,
        maxWidth: 360,
        fontSize: 15.5,
        lineHeight: 1.5,
        textAlign: 'left',
        color: 'var(--ink)',
        fontFamily: 'var(--font-body)',
      }}
    >
      {parts.map((part, i) =>
        part.startsWith('*') ? (
          <mark key={i} style={{ background: '#fde68a', borderRadius: 4, padding: '0 3px', fontWeight: 700, color: 'inherit' }}>
            {part.slice(1, -1)}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </p>
  );
}
