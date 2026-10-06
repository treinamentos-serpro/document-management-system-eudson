const path = require('node:path');

function createDocumentRepository({ storageDir }) {
  const documents = new Map();

  function toPublicDocument(document) {
    const { storageName: _storageName, ...publicDocument } = document;
    return publicDocument;
  }

  return {
    create(document) {
      documents.set(document.id, document);
      return toPublicDocument(document);
    },

    listByOwner(owner) {
      return [...documents.values()]
        .filter((document) => document.owner === owner)
        .sort((first, second) => second.uploadedAt.localeCompare(first.uploadedAt))
        .map(toPublicDocument);
    },

    findByIdAndOwner(id, owner) {
      const document = documents.get(id);
      if (!document || document.owner !== owner) return null;

      return {
        ...toPublicDocument(document),
        filePath: path.join(storageDir, document.storageName)
      };
    }
  };
}

module.exports = createDocumentRepository;
