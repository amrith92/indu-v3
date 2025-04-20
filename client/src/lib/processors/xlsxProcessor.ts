import { DocumentMetadata } from '@/types';
import * as XLSX from 'xlsx';

export async function processXlsx(
  buffer: ArrayBuffer,
  onProgress: (progress: number) => void
): Promise<{ text: string; metadata: DocumentMetadata }> {
  try {
    onProgress(20);
    
    // Load the workbook
    const data = new Uint8Array(buffer);
    const workbook = XLSX.read(data, { type: 'array' });
    
    onProgress(40);
    
    // Extract metadata
    const metadata: DocumentMetadata = {
      sheetCount: workbook.SheetNames.length,
      sheets: workbook.SheetNames,
    };
    
    // Extract text from each sheet
    let fullText = '';
    let processedSheets = 0;
    
    for (const sheetName of workbook.SheetNames) {
      try {
        const worksheet = workbook.Sheets[sheetName];
        
        // Add sheet name as section header
        fullText += `## Sheet: ${sheetName}\n\n`;
        
        // Convert sheet to JSON for text extraction
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Process rows and columns
        for (const row of json) {
          if (Array.isArray(row) && row.length > 0) {
            const rowText = row.join('\t');
            if (rowText.trim()) {
              fullText += rowText + '\n';
            }
          }
        }
        
        fullText += '\n\n';
      } catch (error) {
        console.warn(`Failed to extract text from sheet ${sheetName}:`, error);
      }
      
      // Update progress
      processedSheets++;
      onProgress(40 + (processedSheets / workbook.SheetNames.length) * 60);
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
    console.error('Failed to process XLSX:', error);
    throw new Error('Failed to process XLSX file');
  }
}
