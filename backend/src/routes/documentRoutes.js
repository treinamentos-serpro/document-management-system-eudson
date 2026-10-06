const express = require('express');

function documentRoutes({ controller, upload, requireUser }) {
  const router = express.Router();
  router.post('/upload', requireUser, upload.single('file'), controller.upload);
  router.get('/documents', requireUser, controller.list);
  router.get('/documents/:id/download', requireUser, controller.download);
  return router;
}

module.exports = documentRoutes;
