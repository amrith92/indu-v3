import { Document, DocumentChunk } from '@/types';

// IndexedDB database name and version
const DB_NAME = 'document-search-engine';
const DB_VERSION = 1;

// Object store names
const DOCUMENTS_STORE = 'documents';
const CHUNKS_STORE = 'chunks';
const EMBEDDINGS_STORE = 'embeddings';
const METADATA_STORE = 'metadata';

// Initialize the database
export async function initializeDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => {
      console.error('Error opening database:', event);
      reject(new Error('Could not open IndexedDB database'));
    };
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create documents store
      if (!db.objectStoreNames.contains(DOCUMENTS_STORE)) {
        const documentsStore = db.createObjectStore(DOCUMENTS_STORE, { keyPath: 'id' });
        documentsStore.createIndex('name', 'name', { unique: false });
        documentsStore.createIndex('type', 'type', { unique: false });
        documentsStore.createIndex('source', 'source', { unique: false });
      }
      
      // Create chunks store
      if (!db.objectStoreNames.contains(CHUNKS_STORE)) {
        const chunksStore = db.createObjectStore(CHUNKS_STORE, { keyPath: 'id' });
        chunksStore.createIndex('documentId', 'documentId', { unique: false });
      }
      
      // Create embeddings store
      if (!db.objectStoreNames.contains(EMBEDDINGS_STORE)) {
        const embeddingsStore = db.createObjectStore(EMBEDDINGS_STORE, { keyPath: 'chunkId' });
        embeddingsStore.createIndex('documentId', 'documentId', { unique: false });
      }
      
      // Create metadata store
      if (!db.objectStoreNames.contains(METADATA_STORE)) {
        db.createObjectStore(METADATA_STORE, { keyPath: 'key' });
      }
    };
  });
}

// Save a document
export async function saveDocument(document: Document): Promise<void> {
  const db = await initializeDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([DOCUMENTS_STORE, CHUNKS_STORE], 'readwrite');
    
    transaction.onerror = (event) => {
      reject(new Error('Transaction failed'));
    };
    
    const documentsStore = transaction.objectStore(DOCUMENTS_STORE);
    const chunksStore = transaction.objectStore(CHUNKS_STORE);
    
    // Store document without chunks to reduce size
    const documentToStore = { ...document };
    delete documentToStore.content.chunks;
    
    const documentRequest = documentsStore.put(documentToStore);
    
    documentRequest.onsuccess = () => {
      // Store each chunk separately
      const chunkPromises = document.content.chunks.map((chunk) => {
        return new Promise<void>((resolveChunk, rejectChunk) => {
          const chunkRequest = chunksStore.put(chunk);
          
          chunkRequest.onsuccess = () => resolveChunk();
          chunkRequest.onerror = () => rejectChunk(new Error('Failed to store chunk'));
        });
      });
      
      Promise.all(chunkPromises)
        .then(() => resolve())
        .catch((error) => reject(error));
    };
    
    documentRequest.onerror = () => {
      reject(new Error('Failed to store document'));
    };
  });
}

// Get a document by ID, including its chunks
export async function getDocumentById(id: string): Promise<Document | null> {
  const db = await initializeDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([DOCUMENTS_STORE, CHUNKS_STORE], 'readonly');
    const documentsStore = transaction.objectStore(DOCUMENTS_STORE);
    const chunksStore = transaction.objectStore(CHUNKS_STORE);
    const chunkIndex = chunksStore.index('documentId');
    
    const documentRequest = documentsStore.get(id);
    
    documentRequest.onsuccess = () => {
      const document = documentRequest.result;
      
      if (!document) {
        resolve(null);
        return;
      }
      
      // Get all chunks for this document
      const chunksRequest = chunkIndex.getAll(id);
      
      chunksRequest.onsuccess = () => {
        document.content.chunks = chunksRequest.result;
        resolve(document);
      };
      
      chunksRequest.onerror = () => {
        reject(new Error('Failed to get document chunks'));
      };
    };
    
    documentRequest.onerror = () => {
      reject(new Error('Failed to get document'));
    };
  });
}

// Get all documents (without chunks for efficiency)
export async function getAllDocuments(): Promise<Document[]> {
  const db = await initializeDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([DOCUMENTS_STORE], 'readonly');
    const documentsStore = transaction.objectStore(DOCUMENTS_STORE);
    
    const request = documentsStore.getAll();
    
    request.onsuccess = () => {
      resolve(request.result);
    };
    
    request.onerror = () => {
      reject(new Error('Failed to get documents'));
    };
  });
}

// Delete a document and all associated chunks
export async function deleteDocument(id: string): Promise<void> {
  const db = await initializeDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([DOCUMENTS_STORE, CHUNKS_STORE, EMBEDDINGS_STORE], 'readwrite');
    
    transaction.onerror = (event) => {
      reject(new Error('Transaction failed'));
    };
    
    const documentsStore = transaction.objectStore(DOCUMENTS_STORE);
    const chunksStore = transaction.objectStore(CHUNKS_STORE);
    const embeddingsStore = transaction.objectStore(EMBEDDINGS_STORE);
    
    // Delete document
    const documentRequest = documentsStore.delete(id);
    
    documentRequest.onsuccess = () => {
      // Get all chunks for this document
      const chunkIndex = chunksStore.index('documentId');
      const chunksRequest = chunkIndex.getAll(id);
      
      chunksRequest.onsuccess = () => {
        const chunks = chunksRequest.result as DocumentChunk[];
        
        // Delete each chunk and its embedding
        const chunkPromises = chunks.map((chunk) => {
          return new Promise<void>((resolveChunk, rejectChunk) => {
            const chunkRequest = chunksStore.delete(chunk.id);
            const embeddingRequest = embeddingsStore.delete(chunk.id);
            
            chunkRequest.onerror = () => rejectChunk(new Error('Failed to delete chunk'));
            embeddingRequest.onerror = () => rejectChunk(new Error('Failed to delete embedding'));
            
            Promise.all([
              new Promise(r => { chunkRequest.onsuccess = r; }),
              new Promise(r => { embeddingRequest.onsuccess = r; })
            ]).then(() => resolveChunk());
          });
        });
        
        Promise.all(chunkPromises)
          .then(() => resolve())
          .catch((error) => reject(error));
      };
      
      chunksRequest.onerror = () => {
        reject(new Error('Failed to get document chunks for deletion'));
      };
    };
    
    documentRequest.onerror = () => {
      reject(new Error('Failed to delete document'));
    };
  });
}

// Save an embedding for a chunk
export async function saveEmbedding(chunkId: string, documentId: string, embedding: Float32Array): Promise<void> {
  const db = await initializeDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([EMBEDDINGS_STORE], 'readwrite');
    const embeddingsStore = transaction.objectStore(EMBEDDINGS_STORE);
    
    const request = embeddingsStore.put({
      chunkId,
      documentId,
      embedding: Array.from(embedding), // Convert to regular array for storage
    });
    
    request.onsuccess = () => {
      resolve();
    };
    
    request.onerror = () => {
      reject(new Error('Failed to save embedding'));
    };
  });
}

// Get embedding for a chunk
export async function getEmbedding(chunkId: string): Promise<Float32Array | null> {
  const db = await initializeDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([EMBEDDINGS_STORE], 'readonly');
    const embeddingsStore = transaction.objectStore(EMBEDDINGS_STORE);
    
    const request = embeddingsStore.get(chunkId);
    
    request.onsuccess = () => {
      if (request.result) {
        resolve(new Float32Array(request.result.embedding));
      } else {
        resolve(null);
      }
    };
    
    request.onerror = () => {
      reject(new Error('Failed to get embedding'));
    };
  });
}

// Save metadata object
export async function saveMetadata(key: string, value: any): Promise<void> {
  const db = await initializeDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([METADATA_STORE], 'readwrite');
    const metadataStore = transaction.objectStore(METADATA_STORE);
    
    const request = metadataStore.put({
      key,
      value,
      timestamp: Date.now(),
    });
    
    request.onsuccess = () => {
      resolve();
    };
    
    request.onerror = () => {
      reject(new Error(`Failed to save metadata for key: ${key}`));
    };
  });
}

// Get metadata object
export async function getMetadata(key: string): Promise<any | null> {
  const db = await initializeDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([METADATA_STORE], 'readonly');
    const metadataStore = transaction.objectStore(METADATA_STORE);
    
    const request = metadataStore.get(key);
    
    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result.value);
      } else {
        resolve(null);
      }
    };
    
    request.onerror = () => {
      reject(new Error(`Failed to get metadata for key: ${key}`));
    };
  });
}
