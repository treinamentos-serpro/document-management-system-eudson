const path = require('node:path');
const express = require('express');
const multer = require('multer');
const documentRoutes = require('./routes/documentRoutes');
const createDocumentUpload = require('./middleware/documentUpload');
const createDocumentController = require('./controllers/documentController');
const createDocumentService = require('./services/documentService');
const createDocumentRepository = require('./repositories/documentRepository');
const requireUser = require('./middleware/requireUser');

function positiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function createApp(options = {}) {
  const storageDir = path.resolve(
    options.storageDir || process.env.STORAGE_DIR || path.join(__dirname, '../storage')
  );
  const maxFileSizeBytes = positiveNumber(
    options.maxFileSizeBytes || process.env.MAX_FILE_SIZE_BYTES,
    10 * 1024 * 1024
  );
  const repository = createDocumentRepository({ storageDir });
  const service = createDocumentService({ repository });
  const controller = createDocumentController({ service });
  const upload = createDocumentUpload({ storageDir, maxFileSizeBytes });

  const app = express();
  app.use(express.json());
  app.get('/health', (_request, response) => response.json({ status: 'ok' }));
  app.use('/', documentRoutes({ controller, upload, requireUser }));
  app.use((_request, response) => {
    response.status(404).json({
      error: { code: 'ROUTE_NOT_FOUND', message: 'Rota não encontrada.' }
    });
  });
  app.use((error, _request, response, next) => {
    if (response.headersSent) return next(error);

    if (error instanceof multer.MulterError) {
      const tooLarge = error.code === 'LIMIT_FILE_SIZE';
      return response.status(tooLarge ? 413 : 400).json({
        error: {
          code: tooLarge ? 'FILE_TOO_LARGE' : 'INVALID_UPLOAD',
          message: tooLarge ? 'O arquivo excede o tamanho máximo permitido.' : 'Upload inválido.'
        }
      });
    }

    if (error.code === 'ENOENT') {
      return response.status(404).json({
        error: { code: 'DOCUMENT_NOT_FOUND', message: 'Documento não encontrado.' }
      });
    }

    return response.status(500).json({
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Ocorreu um erro interno.' }
    });
  });

  return app;
}

const app = createApp();
app.createApp = createApp;

if (require.main === module) {
  const port = positiveNumber(process.env.PORT, 3000);
  app.listen(port, () => console.log(`DMS backend ouvindo na porta ${port}`));
}

module.exports = app;
