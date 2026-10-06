import { useRef, useState } from 'react';

export default function UploadComponent({ onUpload, isUploading, disabled }) {
  const [file, setFile] = useState(null);
  const inputRef = useRef(null);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file || disabled || isUploading) return;
    const uploaded = await onUpload(file);
    if (!uploaded) return;
    setFile(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      <label className="file-picker">
        <span className="file-picker-icon" aria-hidden="true">+</span>
        <span className="file-picker-copy">
          <strong>{file ? file.name : 'Escolha um arquivo'}</strong>
          <small>{file ? `${(file.size / 1024).toFixed(1)} KB` : 'Qualquer formato, até 10 MiB'}</small>
        </span>
        <input
          ref={inputRef}
          type="file"
          onChange={(event) => setFile(event.target.files?.[0] || null)}
          disabled={disabled || isUploading}
        />
      </label>
      <button className="button button-primary upload-submit" type="submit" disabled={!file || disabled || isUploading}>
        {isUploading ? 'Enviando...' : 'Enviar documento'}
      </button>
    </form>
  );
}
