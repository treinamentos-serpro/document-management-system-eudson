function createDocumentController({ service }) {
  return {
    async upload(request, response) {
      if (!request.file) {
        return response.status(400).json({
          error: { code: 'FILE_REQUIRED', message: 'Selecione um arquivo para enviar.' }
        });
      }

      const document = await service.createDocument({
        owner: request.userId,
        file: request.file
      });
      return response.status(201).json(document);
    },

    list(request, response) {
      return response.json({ documents: service.listDocuments(request.userId) });
    },

    async download(request, response, next) {
      const document = await service.getDocumentForDownload(request.params.id, request.userId);
      if (!document) {
        return response.status(404).json({
          error: { code: 'DOCUMENT_NOT_FOUND', message: 'Documento não encontrado.' }
        });
      }

      return response.download(document.filePath, document.originalName, (error) => {
        if (error) next(error);
      });
    }
  };
}

module.exports = createDocumentController;
