const API_BASE_URL = '/api';

async function readError(response) {
  try {
    const body = await response.json();
    return body.error?.message || 'Não foi possível concluir a operação.';
  } catch {
    return 'Não foi possível concluir a operação.';
  }
}

async function request(url, options = {}) {
  const response = await fetch(`${API_BASE_URL}${url}`, options);
  if (!response.ok) throw new Error(await readError(response));
  return response;
}

export async function fetchDocuments(userId, signal) {
  const response = await request('/documents', {
    headers: { 'X-User-Id': userId },
    signal
  });
  const result = await response.json();
  return result.documents;
}

export async function uploadDocument(userId, file) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await request('/upload', {
    method: 'POST',
    headers: { 'X-User-Id': userId },
    body: formData
  });
  return response.json();
}

export async function downloadDocument(userId, document) {
  const response = await request(`/documents/${encodeURIComponent(document.id)}/download`, {
    headers: { 'X-User-Id': userId }
  });
  const objectUrl = URL.createObjectURL(await response.blob());
  const link = window.document.createElement('a');
  link.href = objectUrl;
  link.download = document.originalName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
