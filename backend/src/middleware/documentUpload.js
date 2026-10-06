const fs = require('node:fs');
const crypto = require('node:crypto');
const multer = require('multer');

function createDocumentUpload({ storageDir, maxFileSizeBytes }) {
  const storage = multer.diskStorage({
    destination: (_request, _file, callback) => {
      fs.mkdir(storageDir, { recursive: true }, (error) => callback(error, storageDir));
    },
    filename: (_request, _file, callback) => callback(null, crypto.randomUUID())
  });

  return multer({
    storage,
    limits: { fileSize: maxFileSizeBytes, files: 1 }
  });
}

module.exports = createDocumentUpload;