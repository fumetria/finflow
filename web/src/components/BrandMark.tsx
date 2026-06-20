// finflow logo: a rounded square (primary) with an ascending line glyph.
// Reused in the auth screen and the sidebar header.
function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-[9px] bg-primary text-primary-foreground"
      style={{ width: size, height: size }}
    >
      <svg
        width={size * 0.62}
        height={size * 0.62}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 17 10 11l3.5 3.5L20 7" />
        <path d="M15 7h5v5" />
      </svg>
    </span>
  );
}

export { BrandMark };
