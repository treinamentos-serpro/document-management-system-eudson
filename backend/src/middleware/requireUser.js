function requireUser(request, response, next) {
  const userId = request.get('X-User-Id')?.trim();
  if (!userId) {
    return response.status(400).json({
      error: { code: 'USER_ID_REQUIRED', message: 'Informe o identificador do usuário.' }
    });
  }

  request.userId = userId;
  return next();
}

module.exports = requireUser;
