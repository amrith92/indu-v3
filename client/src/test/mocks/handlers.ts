import { rest } from 'msw';

export const handlers = [
  // Define mock handlers for API endpoints
  rest.get('/api/documents', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([
        {
          id: 'doc-1',
          name: 'Sample Document.pdf',
          type: 'pdf',
          size: 1024 * 1024, // 1MB
          sizeFormatted: '1 MB',
          createdAt: new Date().toISOString(),
          content: {
            fullText: 'This is a sample document content for testing.',
            chunks: [
              {
                id: 'chunk-1',
                documentId: 'doc-1',
                text: 'This is a sample document content for testing.',
                metadata: {
                  pageNumber: 1,
                  startIndex: 0,
                  endIndex: 48
                }
              }
            ]
          },
          source: 'local',
          metadata: {
            pageCount: 1,
            author: 'Test User',
            createdAt: new Date().toISOString()
          }
        }
      ])
    );
  }),

  rest.post('/api/search', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        results: [
          {
            documentId: 'doc-1',
            documentName: 'Sample Document.pdf',
            documentType: 'pdf',
            chunkId: 'chunk-1',
            text: 'This is a sample document content for testing.',
            score: 0.95,
            matchPercentage: 95,
            metadata: {
              pageNumber: 1,
              startIndex: 0,
              endIndex: 48
            }
          }
        ]
      })
    );
  }),

  rest.post('/api/documents', (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        id: 'doc-new',
        name: 'New Document.pdf',
        type: 'pdf',
        size: 512 * 1024,
        sizeFormatted: '512 KB',
        createdAt: new Date().toISOString(),
        source: 'local',
      })
    );
  }),
];