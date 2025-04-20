import { describe, it, expect, beforeEach } from 'vitest';
import { useDocumentStore } from './useDocumentStore';
import { Document } from '@/types';

describe('useDocumentStore', () => {
  beforeEach(() => {
    // Reset the store before each test
    const { clearUploadedFiles, clearFilter } = useDocumentStore.getState();
    
    // Clear all documents (by setting directly)
    useDocumentStore.setState({
      documents: [],
      selectedDocument: null,
      uploadedFiles: [],
      processingStatus: {
        overall: 0,
        files: []
      },
      filter: '',
      stats: {
        totalDocuments: 0,
        storageUsed: 0,
        storageUsedFormatted: '0 B',
        lastIndexed: null
      }
    });
    
    clearUploadedFiles();
    clearFilter();
  });

  it('should add a document to the store', () => {
    const { addDocument, documents } = useDocumentStore.getState();
    
    const document: Document = {
      id: 'test-doc-1',
      name: 'Test Document.pdf',
      type: 'pdf',
      size: 1024,
      sizeFormatted: '1 KB',
      createdAt: new Date(),
      source: 'local',
      content: {
        fullText: 'Test content',
        chunks: []
      },
      metadata: {}
    };
    
    addDocument(document);
    
    const state = useDocumentStore.getState();
    
    expect(state.documents).toHaveLength(1);
    expect(state.documents[0].id).toBe('test-doc-1');
    expect(state.stats.totalDocuments).toBe(1);
    expect(state.stats.storageUsed).toBe(1024);
  });

  it('should remove a document from the store', () => {
    const { addDocument, removeDocument } = useDocumentStore.getState();
    
    const document: Document = {
      id: 'test-doc-1',
      name: 'Test Document.pdf',
      type: 'pdf',
      size: 1024,
      sizeFormatted: '1 KB',
      createdAt: new Date(),
      source: 'local',
      content: {
        fullText: 'Test content',
        chunks: []
      },
      metadata: {}
    };
    
    addDocument(document);
    
    let state = useDocumentStore.getState();
    expect(state.documents).toHaveLength(1);
    
    removeDocument('test-doc-1');
    
    state = useDocumentStore.getState();
    expect(state.documents).toHaveLength(0);
    expect(state.stats.totalDocuments).toBe(0);
    expect(state.stats.storageUsed).toBe(0);
  });

  it('should select a document', () => {
    const { addDocument, selectDocument } = useDocumentStore.getState();
    
    const document: Document = {
      id: 'test-doc-1',
      name: 'Test Document.pdf',
      type: 'pdf',
      size: 1024,
      sizeFormatted: '1 KB',
      createdAt: new Date(),
      source: 'local',
      content: {
        fullText: 'Test content',
        chunks: []
      },
      metadata: {}
    };
    
    addDocument(document);
    
    selectDocument('test-doc-1');
    
    const state = useDocumentStore.getState();
    expect(state.selectedDocument).not.toBeNull();
    expect(state.selectedDocument?.id).toBe('test-doc-1');
  });

  it('should update a document', () => {
    const { addDocument, updateDocument } = useDocumentStore.getState();
    
    const document: Document = {
      id: 'test-doc-1',
      name: 'Test Document.pdf',
      type: 'pdf',
      size: 1024,
      sizeFormatted: '1 KB',
      createdAt: new Date(),
      source: 'local',
      content: {
        fullText: 'Test content',
        chunks: []
      },
      metadata: {}
    };
    
    addDocument(document);
    
    updateDocument('test-doc-1', { name: 'Updated Document.pdf' });
    
    const state = useDocumentStore.getState();
    expect(state.documents[0].name).toBe('Updated Document.pdf');
  });

  it('should add an upload file', () => {
    const { addUploadFile } = useDocumentStore.getState();
    
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    
    addUploadFile(file);
    
    const state = useDocumentStore.getState();
    expect(state.uploadedFiles).toHaveLength(1);
    expect(state.uploadedFiles[0].file.name).toBe('test.pdf');
    expect(state.uploadedFiles[0].status).toBe('pending');
  });

  it('should update processing status', () => {
    const { updateProcessingStatus } = useDocumentStore.getState();
    
    updateProcessingStatus({
      overall: 50,
      files: [
        { id: 'file-1', name: 'test.pdf', progress: 50 }
      ]
    });
    
    const state = useDocumentStore.getState();
    expect(state.processingStatus.overall).toBe(50);
    expect(state.processingStatus.files).toHaveLength(1);
    expect(state.processingStatus.files[0].progress).toBe(50);
  });
});