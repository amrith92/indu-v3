
import { Document, DocumentChunk } from '@/types';
import { pipeline } from '@xenova/transformers';

let nerPipeline: any = null;

// Initialize NER pipeline
async function initNER() {
  if (!nerPipeline) {
    nerPipeline = await pipeline('token-classification', 'Xenova/bert-base-NER');
  }
}

// Extract entities from text
async function extractEntities(text: string) {
  await initNER();
  const result = await nerPipeline(text);
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
