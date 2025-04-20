import { DocumentMetadata } from '@/types';
import * as pdfjsLib from 'pdfjs-dist';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';

// Set worker source
if (typeof window !== 'undefined' && 'Worker' in window) {
  const pdfjsVersion = '5.0.375'/* || pdfjsLib.version*/;
  GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.worker.min.mjs`;
}

export async function processPdf(
  buffer: ArrayBuffer,
  onProgress: (progress: number) => void
): Promise<{ text: string; metadata: DocumentMetadata }> {
  const data = new Uint8Array(buffer);
  
  try {
    // Load PDF document
    const pdf = await getDocument({ data }).promise;
    onProgress(20);
    
    // Extract metadata
    const metadata: DocumentMetadata = {
      pageCount: pdf.numPages,
      author: '',
      createdAt: undefined,
      modifiedAt: undefined,
    };
    
    // Try to get more detailed metadata
    try {
      const metadataObj = await pdf.getMetadata();
      if (metadataObj?.info) {
        const info = metadataObj.info as any;
        metadata.author = info.Author || '';
        
        if (info.CreationDate) {
          metadata.createdAt = parseDate(info.CreationDate);
        }
        
        if (info.ModDate) {
          metadata.modifiedAt = parseDate(info.ModDate);
        }
      }
    } catch (error) {
      console.warn('Failed to extract PDF metadata:', error);
    }
    
    onProgress(30);
    
    // Extract text from each page
    let fullText = '';
    let extractedPages = 0;
    
    for (let i = 1; i <= pdf.numPages; i++) {
      try {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        
        // Concatenate text items
        const pageText = content.items
          .map((item: any) => item.str)
          .join(' ');
        
        fullText += pageText + '\n\n';
        
        // Update progress
        extractedPages++;
        onProgress(30 + (extractedPages / pdf.numPages) * 70);
      } catch (error) {
        console.warn(`Failed to extract text from page ${i}:`, error);
      }
    }
    
    // Count words
    const wordCount = fullText.split(/\s+/).filter(word => word.length > 0).length;
    metadata.wordCount = wordCount;
    
    onProgress(100);
    
    return {
      text: fullText,
      metadata,
    };
  } catch (error) {
    console.error('Failed to process PDF:', error);
    throw new Error('Failed to process PDF file');
  }
}

// Parse PDF date format (e.g., "D:20201231235959+00'00'")
function parseDate(dateString: string): Date | undefined {
  try {
    // PDF date format: D:YYYYMMDDHHmmSSOHH'mm'
    // where O is the offset sign (+ or -)
    if (dateString.startsWith('D:')) {
      dateString = dateString.substring(2);
      
      const year = parseInt(dateString.substring(0, 4));
      const month = parseInt(dateString.substring(4, 6)) - 1; // 0-based
      const day = parseInt(dateString.substring(6, 8));
      const hour = parseInt(dateString.substring(8, 10));
      const minute = parseInt(dateString.substring(10, 12));
      const second = parseInt(dateString.substring(12, 14));
      
      return new Date(year, month, day, hour, minute, second);
    }
    
    // Try regular date parsing as fallback
    return new Date(dateString);
  } catch (error) {
    console.warn('Failed to parse PDF date:', error);
    return undefined;
  }
}
