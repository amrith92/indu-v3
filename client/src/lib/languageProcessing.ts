import { pipeline, env } from '@xenova/transformers';

// Configure the library
env.allowLocalModels = false;
env.useBrowserCache = true;

// Model configurations
const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';

// Initialize models
let embeddingPipeline: any = null;
let languageDetectionPipeline: any = null;

// Initialize the embedding model
async function initEmbeddingModel() {
  if (!embeddingPipeline) {
    embeddingPipeline = await pipeline('feature-extraction', EMBEDDING_MODEL);
  }
  return embeddingPipeline;
}

// Generate embeddings for text
export async function generateEmbeddings(text: string): Promise<Float32Array> {
  const pipe = await initEmbeddingModel();
  
  try {
    // Get embeddings
    const result = await pipe(text, {
      pooling: 'mean',
      normalize: true,
    });
    
    // Return the embedding vector
    return new Float32Array(result.data);
  } catch (error) {
    console.error('Error generating embeddings:', error);
    throw error;
  }
}

// Extract keywords from text
export async function extractKeywords(text: string): Promise<string[]> {
  // Simplified keyword extraction using TF-IDF concepts
  // A more advanced implementation would use a pre-trained model
  
  // Cleanup and normalize text
  const cleanText = text
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
  
  // Split into words
  const words = cleanText.split(' ');
  
  // Remove stopwords (simple English stopwords list)
  const stopwords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'else', 'when',
    'at', 'from', 'by', 'for', 'with', 'about', 'to', 'in', 'on', 'is',
    'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'shall', 'should', 'can', 'could',
    'of', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it',
    'we', 'they', 'me', 'him', 'her', 'us', 'them',
  ]);
  
  // Count word frequencies
  const wordCounts: Record<string, number> = {};
  
  for (const word of words) {
    if (word.length > 2 && !stopwords.has(word)) {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    }
  }
  
  // Sort by frequency
  const sortedWords = Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
  
  return sortedWords;
}

// Process Hindi/Hinglish text 
export async function processHindiText(text: string): Promise<{
  processedText: string;
  transliterated?: string;
}> {
  // For simple implementation, we just return the original text
  // A more advanced implementation would use language-specific processing
  return {
    processedText: text,
  };
}
