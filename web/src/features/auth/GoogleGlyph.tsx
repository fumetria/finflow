// Google "G" mark (4 colors) for the "Continuar con Google" button.
function GoogleGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.5 12.2c0-.7-.06-1.4-.18-2.1H12v4h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2-1.9 3.3-4.7 3.3-7.9z"
      />
      <path
        fill="#34A853"
        d="M12 23c3 0 5.5-1 7.3-2.7l-3.5-2.7c-1 .66-2.2 1-3.8 1-2.9 0-5.4-2-6.3-4.6H2v2.8A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.7 14c-.24-.7-.37-1.45-.37-2.2s.13-1.5.37-2.2V6.8H2A11 11 0 0 0 2 17z"
      />
      <path
        fill="#EA4335"
        d="M12 5.2c1.6 0 3 .55 4.2 1.6l3.1-3.1A11 11 0 0 0 2 6.8L5.7 9.6C6.6 7 9.1 5.2 12 5.2z"
      />
    </svg>
  );
}

export { GoogleGlyph };
