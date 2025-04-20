import { SearchResult, DocumentChunk } from '@/types';
import { saveEmbedding, getEmbedding } from './storage';
import { generateEmbeddings } from './languageProcessing';

// Simple in-memory vector store - will be replaced with WASM-based implementation
let vectorIndex: {
  chunkId: string;
  documentId: string;
  documentName: string;
  documentType: string;
  embedding: Float32Array;
  metadata: any;
}[] = [];

export async function initVectorStore(): Promise<void> {
  // This will be replaced with WASM version of hnswlib
  console.log('Initializing vector store');
  
  // For now, just clear the in-memory index
  vectorIndex = [];
  
  // Load existing documents from storage
  try {
    const documents = await import('./storage').then(module => module.getAllDocuments());
    
    // Process each document and add to vector index
    for (const doc of documents) {
      if (doc.content?.chunks) {
        for (const chunk of doc.content.chunks) {
          // Get embedding from storage if it exists
          const embedding = await import('./storage').then(module => 
            module.getEmbedding(chunk.id)
          );
          
          if (embedding) {
            vectorIndex.push({
              chunkId: chunk.id,
              documentId: doc.id,
              documentName: doc.name,
              documentType: doc.type,
              embedding,
              metadata: chunk.metadata,
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('Error initializing vector store:', error);
  }
}

export async function addToVectorStore(
  chunks: DocumentChunk[],
  documentName: string,
  documentType: string
): Promise<void> {
  for (const chunk of chunks) {
    if (!chunk.embedding) {
      // Generate embedding if not already present
      chunk.embedding = await generateEmbeddings(chunk.text);
    }
    
    // Store embedding in IndexedDB
    await saveEmbedding(chunk.id, chunk.documentId, chunk.embedding);
    
    // Add to in-memory index
    vectorIndex.push({
      chunkId: chunk.id,
      documentId: chunk.documentId,
      documentName,
      documentType,
      embedding: chunk.embedding,
      metadata: chunk.metadata,
    });
  }
}

export async function removeFromVectorStore(documentId: string): Promise<void> {
  // Remove from in-memory index
  vectorIndex = vectorIndex.filter(item => item.documentId !== documentId);
  
  // Note: The IndexedDB embeddings will be cleaned up by the document deletion process
}

export async function search(
  query: string,
  limit: number = 10
): Promise<SearchResult[]> {
  try {
    console.log(`Vector search for: "${query}" (limit: ${limit})`);
    
    // Generate query embedding
    const queryEmbedding = await generateEmbeddings(query);
    
    // Perform vector similarity search
    const results = vectorIndex
      .map(item => ({
        ...item,
        score: cosineSimilarity(queryEmbedding, item.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    
    // Fetch text content for the results
    const searchResults: SearchResult[] = results.map(result => ({
      documentId: result.documentId,
      documentName: result.documentName,
      documentType: result.documentType,
      chunkId: result.chunkId,
      text: '', // Will be filled by the caller
      score: result.score,
      matchPercentage: Math.round(result.score * 100),
      metadata: result.metadata,
    }));
    
    return searchResults;
  } catch (error) {
    console.error('Error searching vector store:', error);
    return []; // Return empty array instead of throwing error for MVP
  }
}

// Cosine similarity between two vectors
function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same dimensions');
  }
  
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }
  
  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);
  
  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }
  
  return dotProduct / (magnitudeA * magnitudeB);
}
