const fs = require('node:fs/promises');
const crypto = require('node:crypto');

function createDocumentService({ repository }) {
  return {
    async createDocument({ owner, file }) {
      const document = {
        id: crypto.randomUUID(),
        originalName: file.originalname,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        owner,
        storageName: file.filename
      };

      try {
        return repository.create(document);
      } catch (error) {
        await fs.unlink(file.path).catch(() => {});
        throw error;
      }
    },

    listDocuments(owner) {
      return repository.listByOwner(owner);
    },

    async getDocumentForDownload(id, owner) {
      const document = repository.findByIdAndOwner(id, owner);
      if (!document) return null;

      try {
        await fs.access(document.filePath);
        return document;
      } catch (error) {
        if (error.code === 'ENOENT') return null;
        throw error;
      }
    }
  };
}

module.exports = createDocumentService;
