
import { Document, DocumentChunk } from '@/types';
import { pipeline } from '@xenova/transformers';

// Initialize NER pipeline at module level
const nerPipeline = pipeline('token-classification', 'Xenova/bert-base-NER');
let nerPipelineInstance: any = null;

// Initialize NER pipeline
async function initNER() {
  if (!nerPipelineInstance) {
    nerPipelineInstance = await nerPipeline;
  }
  return nerPipelineInstance;
}

// Extract entities from text
async function extractEntities(text: string) {
  const pipeline = await initNER();
  const result = await pipeline(text);
  return result.map((entity: any) => ({
    type: entity.entity_group,
    name: entity.word
  }));
}

// Process document chunks
async function processChunks(chunks: DocumentChunk[]) {
  const processedChunks = [];
  
  for (const chunk of chunks) {
    const entities = await extractEntities(chunk.text);
    processedChunks.push({
      ...chunk,
      entities
    });
  }
  
  return processedChunks;
}

// Handle worker messages
self.onmessage = async (e) => {
  const { type, payload } = e.data;
  
  switch (type) {
    case 'PROCESS_DOCUMENT':
      try {
        const processedChunks = await processChunks(payload.chunks);
        self.postMessage({ type: 'PROCESSING_COMPLETE', payload: processedChunks });
      } catch (error) {
        self.postMessage({ type: 'PROCESSING_ERROR', payload: error.message });
      }
      break;
  }
};
