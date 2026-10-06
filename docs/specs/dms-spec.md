# Especificação - Document Management System

## 1. Objetivo

Entregar uma aplicação web que permita a um usuário enviar, listar e baixar seus documentos, com os arquivos armazenados no filesystem local e os metadados mantidos em memória.

## 2. Escopo

### Dentro do escopo

- Receber um arquivo por envio, identificar seu proprietário e registrar seus metadados.
- Listar os documentos associados ao identificador do usuário da requisição.
- Baixar um documento pelo identificador, somente quando pertencer ao usuário da requisição.
- Disponibilizar uma interface web para envio, listagem e download por meio da API.
- Expor uma rota simples de saúde da aplicação.

### Fora do escopo

- Autenticação de identidade, cadastro de usuários, permissões avançadas ou compartilhamento entre usuários.
- Persistência de metadados em banco de dados ou armazenamento de arquivos em nuvem/serviço externo.
- Exclusão de documentos, versionamento, busca, organização por pastas, pré-visualização ou auditoria.
- Garantias de recuperação de metadados após reinício do processo.

## 3. Requisitos funcionais

| ID | Requisito | Critério de aceitação |
| --- | --- | --- |
| RF-01 | Enviar um documento | Dado um `X-User-Id` não vazio e um arquivo no campo multipart `file`, a API grava o conteúdo no storage local com nome interno único e retorna HTTP 201 com os metadados públicos. |
| RF-02 | Validar a identificação do usuário | As rotas de documentos exigem o header `X-User-Id`. Ausente ou composto apenas por espaços, retorna HTTP 400 com `USER_ID_REQUIRED`. O valor recebido é removido de espaços nas extremidades. |
| RF-03 | Validar o arquivo enviado | A rota de envio aceita um único arquivo no campo `file`. Sem arquivo, retorna HTTP 400 `FILE_REQUIRED`; arquivo acima do limite retorna HTTP 413 `FILE_TOO_LARGE`; upload inválido retorna HTTP 400 `INVALID_UPLOAD`. |
| RF-04 | Listar documentos próprios | A API retorna somente documentos cujo `owner` seja igual ao identificador da requisição, em ordem decrescente de `uploadedAt`. Usuário sem documentos recebe lista vazia. |
| RF-05 | Baixar documento próprio | A API entrega o conteúdo binário como anexo, usando `originalName` como nome de download, somente se o documento existir, pertencer ao usuário e o arquivo físico estiver disponível. |
| RF-06 | Não revelar documentos de terceiros | Um identificador inexistente, pertencente a outro usuário ou sem arquivo físico disponível resulta em HTTP 404 `DOCUMENT_NOT_FOUND`. |
| RF-07 | Reportar falhas de API | Erros inesperados são respondidos em JSON pelo formato definido nesta especificação. Rotas inexistentes retornam HTTP 404 `ROUTE_NOT_FOUND`. |
| RF-08 | Verificar saúde da aplicação | `GET /health` responde HTTP 200 com `{ "status": "ok" }`, sem exigir `X-User-Id`. |
| RF-09 | Usar a interface web | A interface permite selecionar e enviar um arquivo, consultar a lista do usuário configurado e iniciar o download de um item listado, apresentando falhas da API ao usuário. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Os arquivos enviados são gravados exclusivamente no filesystem local da aplicação por `multer` com `diskStorage`; a pasta de destino é criada quando necessário. |
| RNF-02 | Os metadados são mantidos em memória nesta fase. Reiniciar o processo limpa o índice de metadados; os arquivos existentes no disco não são automaticamente removidos e podem ficar sem referência. |
| RNF-03 | O tamanho máximo de arquivo é configurável por `MAX_FILE_SIZE_BYTES`; o padrão é 10 MiB (10.485.760 bytes). Valores ausentes ou não positivos usam o padrão. |
| RNF-04 | A porta HTTP é configurável por `PORT` (padrão 3000) e o diretório local por `STORAGE_DIR` (padrão `backend/storage`). |
| RNF-05 | O backend usa Node.js, Express e JavaScript CommonJS; testes backend usam o runner nativo `node:test`. O frontend usa React, Vite e JavaScript ESM. |
| RNF-06 | O backend segue Clean Architecture simples, com fluxo de dependência `routes -> controllers -> services -> repositories`. Cada camada mantém as responsabilidades definidas na seção 7. |
| RNF-07 | A listagem e o download isolam documentos por igualdade entre `owner` e `X-User-Id`. Esse mecanismo é identificação declarada pelo cliente, não autenticação: não valida a identidade do usuário e não deve ser tratado como controle de acesso seguro para produção. |
| RNF-08 | Metadados retornados pela API não expõem o nome físico nem o caminho local dos arquivos. O nome físico deve ser único e não derivado do nome original enviado. |

## 5. Modelo de dados

### Metadados públicos do documento

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `id` | string | Identificador único UUID do documento. |
| `originalName` | string | Nome original informado no envio; usado no nome sugerido ao baixar. |
| `size` | number | Tamanho do conteúdo em bytes. |
| `uploadedAt` | string | Instante de recebimento em formato ISO 8601. |
| `owner` | string | Valor normalizado de `X-User-Id` associado ao documento. |

### Dados internos de armazenamento

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `storageName` | string | Nome único gerado para o arquivo no disco. Interno; nunca deve ser incluído na resposta pública. |
| `filePath` | string | Caminho local derivado de `STORAGE_DIR` e `storageName` quando necessário. Não é metadado público nem é persistido pela API. |

Os metadados são indexados pelo `id` em memória. O mesmo `originalName` pode ocorrer para vários documentos, inclusive de proprietários diferentes, pois cada arquivo recebe um nome interno único. Se a criação dos metadados falhar após a gravação do arquivo, o arquivo recém-gravado deve ser removido. Não existe operação funcional de exclusão de documentos.

## 6. Contratos de API

### Convenções comuns

- Os caminhos abaixo são os caminhos expostos pelo backend. A interface pode usar o prefixo `/api` provido pelo proxy do Vite, sem alterar os caminhos internos do backend.
- As rotas de documentos exigem `X-User-Id` com valor não vazio. `/health` não exige esse header.
- Erros JSON usam o envelope `{ "error": { "code": "...", "message": "..." } }`. As mensagens são em português; clientes devem usar `code` para identificar a condição.
- Não há paginação, filtros ou ordenação solicitável nesta versão.

### `POST /upload`

**Headers:** `X-User-Id: <identificador>` e `Content-Type: multipart/form-data`.

**Entrada:** um arquivo no campo multipart `file`; no máximo um arquivo por requisição. Limite definido por `MAX_FILE_SIZE_BYTES`.

**Sucesso:** HTTP 201, `Content-Type: application/json`, corpo com os metadados públicos do documento:

```json
{
  "id": "<uuid>",
  "originalName": "relatorio.pdf",
  "size": 2048,
  "uploadedAt": "2026-10-06T12:00:00.000Z",
  "owner": "usuario-123"
}
```

**Erros:**

| HTTP | Código | Condição |
| --- | --- | --- |
| 400 | `USER_ID_REQUIRED` | Header ausente ou vazio. |
| 400 | `FILE_REQUIRED` | Campo `file` não enviado. |
| 400 | `INVALID_UPLOAD` | Requisição multipart inválida ou violação de limite de quantidade/campo. |
| 413 | `FILE_TOO_LARGE` | Arquivo excede o limite configurado. |
| 500 | `INTERNAL_SERVER_ERROR` | Falha inesperada no processamento ou no storage. |

### `GET /documents`

**Headers:** `X-User-Id: <identificador>`.

**Sucesso:** HTTP 200, `Content-Type: application/json`, lista no envelope `documents`, contendo apenas metadados públicos do usuário e ordenada do mais recente para o mais antigo:

```json
{
  "documents": [
    {
      "id": "<uuid>",
      "originalName": "relatorio.pdf",
      "size": 2048,
      "uploadedAt": "2026-10-06T12:00:00.000Z",
      "owner": "usuario-123"
    }
  ]
}
```

Sem documentos, retorna `{ "documents": [] }`. Sem `X-User-Id`, retorna HTTP 400 `USER_ID_REQUIRED`.

### `GET /documents/:id/download`

**Headers:** `X-User-Id: <identificador>`.

**Sucesso:** HTTP 200 com o conteúdo binário do arquivo e `Content-Disposition: attachment`, usando `originalName` como nome sugerido para o download. A rota não retorna metadados JSON no sucesso.

**Erros:** HTTP 400 `USER_ID_REQUIRED` se faltar o header; HTTP 404 `DOCUMENT_NOT_FOUND` se o documento não existir, não pertencer ao usuário ou o arquivo não estiver disponível; HTTP 500 `INTERNAL_SERVER_ERROR` para outras falhas inesperadas de leitura.

### `GET /health`

Sem autenticação. Retorna HTTP 200 e `Content-Type: application/json`:

```json
{ "status": "ok" }
```

### Erros gerais

Uma rota inexistente retorna HTTP 404:

```json
{
  "error": {
    "code": "ROUTE_NOT_FOUND",
    "message": "Rota não encontrada."
  }
}
```

Falhas inesperadas retornam HTTP 500 com `INTERNAL_SERVER_ERROR` e mensagem genérica, sem expor detalhes internos ou caminhos locais.

## 7. Decisões arquiteturais

- **Routes:** declaram os caminhos, aplicam o middleware de identificação do usuário e encaminham as requisições.
- **Controllers:** validam aspectos básicos do protocolo HTTP e traduzem resultados do serviço em status, headers e corpos de resposta.
- **Services:** concentram as regras de negócio, como criação dos metadados, isolamento por proprietário e verificação de disponibilidade do arquivo.
- **Repositories:** mantêm e consultam os metadados em memória. Não dependem de Express ou de componentes da interface.
- **Armazenamento:** Multer usa `diskStorage` para gravar arquivos no diretório local configurado. Os nomes físicos são gerados independentemente do nome original; armazenamento externo não é permitido nesta fase.
- **Identificação:** `X-User-Id` é um mecanismo provisório para associar documentos e filtrar operações. Não substitui autenticação; uma solução de identidade real requer especificação própria antes de uso em produção.
- **Frontend:** React com componentes funcionais e Hooks; integração HTTP por `fetch`, através do prefixo `/api` e do proxy do Vite. A interface consome os contratos definidos acima.
- **Erros e mensagens:** backend usa códigos estáveis e mensagens em português; erros são tratados nas bordas HTTP e de filesystem.

## 8. Plano de execução

Este roteiro descreve etapas futuras do produto. A tarefa de elaboração desta especificação não executa nem altera arquivos de backend ou frontend.

1. Revisar e aprovar escopo, contratos de API, regras de propriedade e limites operacionais descritos neste documento.
2. Implementar e validar configuração da aplicação, storage local com Multer e contratos de upload, listagem e download, respeitando as camadas arquiteturais.
3. Implementar a interface de envio, listagem e download integrada à API via proxy do Vite, incluindo estados de sucesso, vazio e erro.
4. Verificar fluxos e critérios de aceitação com testes backend e validação de integração da interface, incluindo isolamento entre usuários, limites de tamanho e arquivos indisponíveis.
5. Atualizar documentação operacional e registrar limitações conhecidas, especialmente a identificação provisória por header e a perda do índice de metadados em reinicializações.