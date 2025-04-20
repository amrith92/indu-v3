import { DocumentMetadata } from '@/types';
import mammoth from 'mammoth';

export async function processDocx(
  buffer: ArrayBuffer,
  onProgress: (progress: number) => void
): Promise<{ text: string; metadata: DocumentMetadata }> {
  try {
    // Convert the document
    onProgress(20);
    
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    const text = result.value;
    
    onProgress(80);
    
    // Extract basic metadata
    const metadata: DocumentMetadata = {
      wordCount: text.split(/\s+/).filter(word => word.length > 0).length,
    };
    
    // Try to extract additional metadata
    try {
      // Note: Full metadata extraction would require the office XML parsing
      // For now, we'll use a simplified approach
      const xmlString = await arrayBufferToString(buffer);
      
      // Extract creation date
      const creationDateMatch = xmlString.match(/<dcterms:created[^>]*>(.*?)<\/dcterms:created>/);
      if (creationDateMatch && creationDateMatch[1]) {
        metadata.createdAt = new Date(creationDateMatch[1]);
      }
      
      // Extract modification date
      const modDateMatch = xmlString.match(/<dcterms:modified[^>]*>(.*?)<\/dcterms:modified>/);
      if (modDateMatch && modDateMatch[1]) {
        metadata.modifiedAt = new Date(modDateMatch[1]);
      }
      
      // Extract author
      const authorMatch = xmlString.match(/<dc:creator[^>]*>(.*?)<\/dc:creator>/);
      if (authorMatch && authorMatch[1]) {
        metadata.author = authorMatch[1];
      }
    } catch (error) {
      console.warn('Failed to extract DOCX metadata:', error);
    }
    
    onProgress(100);
    
    return {
      text,
      metadata,
    };
  } catch (error) {
    console.error('Failed to process DOCX:', error);
    throw new Error('Failed to process DOCX file');
  }
}

// Helper to convert ArrayBuffer to string
async function arrayBufferToString(buffer: ArrayBuffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([buffer]);
    const reader = new FileReader();
    
    reader.onload = (event) => {
      if (event.target?.result) {
        resolve(event.target.result as string);
      } else {
        reject(new Error('Failed to convert ArrayBuffer to string'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read ArrayBuffer'));
    };
    
    reader.readAsText(blob);
  });
}
