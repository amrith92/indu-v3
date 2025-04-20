import { DocumentMetadata } from '@/types';

export async function processText(
  buffer: ArrayBuffer,
  onProgress: (progress: number) => void
): Promise<{ text: string; metadata: DocumentMetadata }> {
  try {
    onProgress(20);
    
    // Convert buffer to text
    const text = await arrayBufferToString(buffer);
    
    onProgress(70);
    
    // Generate basic metadata
    const lines = text.split('\n');
    const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
    
    const metadata: DocumentMetadata = {
      lineCount: lines.length,
      wordCount: wordCount,
      charCount: text.length,
    };
    
    onProgress(100);
    
    return {
      text,
      metadata,
    };
  } catch (error) {
    console.error('Failed to process text file:', error);
    throw new Error('Failed to process text file');
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
