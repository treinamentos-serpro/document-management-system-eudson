export default function DownloadButton({ onClick, disabled }) {
  return (
    <button
      className="icon-button"
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Baixar documento"
      title="Baixar documento"
    >
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M10 2.5v9m0 0 3.2-3.2M10 11.5 6.8 8.3M3.5 13.5v2A1.5 1.5 0 0 0 5 17h10a1.5 1.5 0 0 0 1.5-1.5v-2" />
      </svg>
    </button>
  );
}
