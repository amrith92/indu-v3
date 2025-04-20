import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processFile } from './documentProcessing';
import * as duckdb from './duckdb';
import * as storage from './storage';
import * as vectorStore from './vectorStore';
import * as languageProcessing from './languageProcessing';

// Mock the dependencies
vi.mock('./duckdb', () => ({
  insertDocument: vi.fn(),
  insertDocumentChunks: vi.fn(),
}));

vi.mock('./storage', () => ({
  saveDocument: vi.fn(),
  saveEmbedding: vi.fn(),
}));

vi.mock('./vectorStore', () => ({
  addToVectorStore: vi.fn(),
}));

vi.mock('./languageProcessing', () => ({
  generateEmbeddings: vi.fn().mockResolvedValue(new Float32Array([0.1, 0.2, 0.3])),
}));

describe('documentProcessing', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('processes PDF file correctly', async () => {
    // Mock the file
    const file = new File(['test pdf content'], 'test.pdf', { type: 'application/pdf' });
    
    // Mock the updateUploadFile callback
    const updateUploadFile = vi.fn();
    
    // Prepare a mock response for embedding generation
    vi.mocked(languageProcessing.generateEmbeddings).mockResolvedValue(new Float32Array([0.1, 0.2, 0.3]));
    
    // Call the processFile function with a progress callback
    const result = await processFile(file, (progress) => {
      updateUploadFile('file-id', { progress, status: 'processing' });
    });
    
    // Assertions
    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.name).toBe('test.pdf');
    expect(result.type).toBe('pdf');
    expect(result.source).toBe('local');
    expect(result.content.chunks.length).toBeGreaterThan(0);
    
    // Check if update callback was called
    expect(updateUploadFile).toHaveBeenCalledTimes(4); // Initial, text extraction, splitting, embedding
    
    // Check if the document was saved to storage
    expect(duckdb.insertDocument).toHaveBeenCalled();
    expect(duckdb.insertDocumentChunks).toHaveBeenCalled();
    expect(storage.saveDocument).toHaveBeenCalled();
    
    // Check if embeddings were generated and stored
    expect(languageProcessing.generateEmbeddings).toHaveBeenCalled();
    expect(vectorStore.addToVectorStore).toHaveBeenCalled();
  });

  it('updates progress during processing', async () => {
    // Mock the file
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    
    // Mock the updateUploadFile callback
    const updateUploadFile = vi.fn();
    
    // Call the processFile function with a progress callback
    await processFile(file, (progress) => {
      updateUploadFile('file-id', { progress, status: progress === 100 ? 'complete' : 'processing' });
    });
    
    // Assertions for progress updates
    expect(updateUploadFile).toHaveBeenCalledWith('file-id', { progress: 25, status: 'processing' });
    expect(updateUploadFile).toHaveBeenCalledWith('file-id', { progress: 50, status: 'processing' });
    expect(updateUploadFile).toHaveBeenCalledWith('file-id', { progress: 75, status: 'processing' });
    expect(updateUploadFile).toHaveBeenCalledWith('file-id', { progress: 100, status: 'complete' });
  });

  it('handles errors during processing', async () => {
    // Mock the file
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    
    // Mock the updateUploadFile callback
    const updateUploadFile = vi.fn();
    
    // Force an error
    vi.mocked(languageProcessing.generateEmbeddings).mockRejectedValue(new Error('Test error'));
    
    // Create a wrapped function to track error handling
    const onProgress = vi.fn();
    
    // Call the processFile function and expect it to throw
    await expect(processFile(file, onProgress)).rejects.toThrow();
    
    // Since our implementation changed, we're now checking that progress callback received updates
    expect(onProgress).toHaveBeenCalled();
  });
});