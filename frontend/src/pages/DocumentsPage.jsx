import { useEffect, useState } from 'react';
import DocumentList from '../components/DocumentList.jsx';
import UploadComponent from '../components/UploadComponent.jsx';
import { downloadDocument, fetchDocuments, uploadDocument } from '../services/documents.js';

const USER_STORAGE_KEY = 'dms-user-id';

function getStoredUserId() {
  try {
    return window.localStorage.getItem(USER_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export default function DocumentsPage() {
  const [userId, setUserId] = useState(getStoredUserId);
  const [userIdInput, setUserIdInput] = useState(userId);
  const [documents, setDocuments] = useState([]);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!userId) {
      setDocuments([]);
      return undefined;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setError('');
    fetchDocuments(userId, controller.signal)
      .then(setDocuments)
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') setError(requestError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [userId, refreshVersion]);

  function handleRefresh() {
    setRefreshVersion((version) => version + 1);
  }

  function handleUserSubmit(event) {
    event.preventDefault();
    const nextUserId = userIdInput.trim();
    if (!nextUserId) {
      setError('Informe um identificador para consultar seus documentos.');
      return;
    }

    try {
      window.localStorage.setItem(USER_STORAGE_KEY, nextUserId);
    } catch {
      setError('Não foi possível salvar o identificador neste navegador.');
      return;
    }

    setError('');
    setNotice('');
    setUserId(nextUserId);
  }

  async function handleUpload(file) {
    setIsUploading(true);
    setError('');
    setNotice('');
    try {
      await uploadDocument(userId, file);
      setNotice('Documento enviado com sucesso.');
      try {
        setDocuments(await fetchDocuments(userId));
      } catch (requestError) {
        setError(`Documento enviado, mas não foi possível atualizar a lista: ${requestError.message}`);
      }
      return true;
    } catch (requestError) {
      setError(requestError.message);
      return false;
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDownload(document) {
    setDownloadingId(document.id);
    setError('');
    try {
      await downloadDocument(userId, document);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <main className="page-shell">
      <header className="masthead">
        <a className="brand" href="#top" aria-label="DMS, início">
          <span className="brand-mark" aria-hidden="true">D</span>
          <span>DMS <small>ARQUIVO PESSOAL</small></span>
        </a>
        <span className="system-status"><span /> Armazenamento local</span>
      </header>

      <section className="intro" id="top">
        <p className="eyebrow">DOCUMENT MANAGEMENT SYSTEM</p>
        <h1>Seus documentos,<br /><em>em um só lugar.</em></h1>
        <p className="intro-copy">Envie, organize e acesse seus arquivos com simplicidade.</p>
      </section>

      <section className="workspace" aria-label="Gerenciamento de documentos">
        <div className="identity-row">
          <div>
            <p className="section-kicker">ESPAÇO DE TRABALHO</p>
            <h2>Identificação</h2>
          </div>
          <form className="identity-form" onSubmit={handleUserSubmit}>
            <label className="visually-hidden" htmlFor="user-id">Identificador do usuário</label>
            <input
              id="user-id"
              value={userIdInput}
              onChange={(event) => setUserIdInput(event.target.value)}
              placeholder="Seu identificador"
              autoComplete="username"
              maxLength={120}
            />
            <button className="button button-secondary" type="submit">Acessar</button>
          </form>
        </div>
        <p className="identity-note">Este identificador organiza seus documentos neste protótipo; não é uma credencial de acesso.</p>

        {error && <p className="feedback feedback-error" role="alert">{error}</p>}
        {notice && <p className="feedback feedback-success" role="status">{notice}</p>}

        <div className="content-grid">
          <section className="upload-section" aria-labelledby="upload-heading">
            <p className="section-kicker">ADICIONAR</p>
            <h2 id="upload-heading">Enviar documento</h2>
            <UploadComponent
              onUpload={handleUpload}
              isUploading={isUploading}
              disabled={!userId}
            />
            {!userId && <p className="inline-hint">Informe seu identificador para habilitar o envio.</p>}
          </section>

          <section className="documents-section" aria-labelledby="documents-heading">
            <div className="documents-heading-row">
              <div>
                <p className="section-kicker">BIBLIOTECA</p>
                <h2 id="documents-heading">Documentos</h2>
              </div>
              <div className="documents-heading-actions">
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={handleRefresh}
                  disabled={!userId || isLoading}
                >
                  Atualizar
                </button>
                <span className="document-count">{documents.length.toString().padStart(2, '0')}</span>
              </div>
            </div>
            {!userId ? (
              <p className="list-message">Acesse seu espaço para ver os documentos.</p>
            ) : (
              <DocumentList
                documents={documents}
                isLoading={isLoading}
                downloadingId={downloadingId}
                onDownload={handleDownload}
              />
            )}
          </section>
        </div>
      </section>

      <footer className="page-footer">
        <span>DMS <span className="footer-separator">/</span> Gestão de documentos</span>
        <span>Arquivos armazenados localmente</span>
      </footer>
    </main>
  );
}
