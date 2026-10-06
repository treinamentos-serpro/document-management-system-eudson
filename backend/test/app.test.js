const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const appModule = require('../src/app');

async function startServer(app) {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  return {
    server,
    baseUrl: `http://127.0.0.1:${server.address().port}`
  };
}

test('o app backend é exportado', () => {
  assert.equal(typeof appModule, 'function');
  assert.equal(typeof appModule.createApp, 'function');
});

test('upload, listagem e download respeitam o usuário e o armazenamento local', async (context) => {
  const storageDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dms-test-'));
  const { server, baseUrl } = await startServer(appModule.createApp({
    storageDir,
    maxFileSizeBytes: 64
  }));
  context.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await fs.rm(storageDir, { recursive: true, force: true });
  });

  const missingUser = await fetch(`${baseUrl}/documents`);
  assert.equal(missingUser.status, 400);
  assert.equal((await missingUser.json()).error.code, 'USER_ID_REQUIRED');

  const emptyUpload = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': 'alice' },
    body: new FormData()
  });
  assert.equal(emptyUpload.status, 400);
  assert.equal((await emptyUpload.json()).error.code, 'FILE_REQUIRED');

  const form = new FormData();
  form.append('file', new Blob(['document content']), 'report.txt');
  const uploadResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': 'alice' },
    body: form
  });
  assert.equal(uploadResponse.status, 201);
  const document = await uploadResponse.json();
  assert.equal(document.originalName, 'report.txt');
  assert.equal(document.size, 16);
  assert.equal(document.owner, 'alice');
  assert.equal(typeof document.id, 'string');
  assert.equal('storageName' in document, false);

  const storedFiles = await fs.readdir(storageDir);
  assert.equal(storedFiles.length, 1);
  assert.notEqual(storedFiles[0], document.originalName);

  const aliceDocuments = await fetch(`${baseUrl}/documents`, {
    headers: { 'X-User-Id': 'alice' }
  });
  assert.deepEqual((await aliceDocuments.json()).documents, [document]);

  const bobDocuments = await fetch(`${baseUrl}/documents`, {
    headers: { 'X-User-Id': 'bob' }
  });
  assert.deepEqual((await bobDocuments.json()).documents, []);

  const forbiddenDownload = await fetch(`${baseUrl}/documents/${document.id}/download`, {
    headers: { 'X-User-Id': 'bob' }
  });
  assert.equal(forbiddenDownload.status, 404);

  const download = await fetch(`${baseUrl}/documents/${document.id}/download`, {
    headers: { 'X-User-Id': 'alice' }
  });
  assert.equal(download.status, 200);
  assert.match(download.headers.get('content-disposition'), /attachment/);
  assert.equal(await download.text(), 'document content');

  const oversizedForm = new FormData();
  oversizedForm.append('file', new Blob(['x'.repeat(100)]), 'large.txt');
  const oversizedUpload = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': 'alice' },
    body: oversizedForm
  });
  assert.equal(oversizedUpload.status, 413);
  assert.equal((await oversizedUpload.json()).error.code, 'FILE_TOO_LARGE');
});
