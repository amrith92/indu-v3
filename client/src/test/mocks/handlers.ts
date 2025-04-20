import { http, HttpResponse } from 'msw';

export const handlers = [
  // Mock API endpoints
  http.get('/api/documents', () => {
    return HttpResponse.json([]);
  }),
  
  http.post('/api/search', () => {
    return HttpResponse.json({
      results: []
    });
  }),
  
  http.post('/api/documents', () => {
    return HttpResponse.json({
      id: 'mock-doc-id',
      name: 'mock-document.pdf',
      type: 'pdf',
      size: 1024,
      createdAt: new Date().toISOString()
    }, { status: 201 });
  }),
  
  http.delete('/api/documents/:id', () => {
    return HttpResponse.json({ success: true });
  })
];