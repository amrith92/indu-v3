
import { pipeline } from '@xenova/transformers';
import sharp from 'sharp';
import { DocumentChunk } from '@/types';

export class LayoutProcessor {
  private model: any;
  
  async initialize() {
    this.model = await pipeline('document-question-answering', 'microsoft/layoutlm-base-uncased');
  }

  async processDocument(imageBuffer: ArrayBuffer): Promise<DocumentChunk[]> {
    // Convert buffer to image
    const image = sharp(Buffer.from(imageBuffer));
    
    // Get image metadata
    const metadata = await image.metadata();
    
    // Process with LayoutLM
    const result = await this.model({
      image: imageBuffer,
      question: 'What is the content of this document?'
    });

    // Create chunks with spatial information
    return result.chunks.map((chunk: any) => ({
      id: crypto.randomUUID(),
      documentId: '', // Will be set by caller
      text: chunk.text,
      metadata: {
        bbox: chunk.bbox,
        confidence: chunk.score,
        pageNum: chunk.page_num,
        type: chunk.type,
        startIndex: chunk.start_index,
        endIndex: chunk.end_index
      }
    }));
  }
}

export const layoutProcessor = new LayoutProcessor();
