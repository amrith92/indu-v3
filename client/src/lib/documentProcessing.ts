import { Document, DocumentChunk, DocumentMetadata } from '@/types';
import { processDocx } from './processors/docxProcessor';
import { processPdf } from './processors/pdfProcessor';
import { processXlsx } from './processors/xlsxProcessor';
import { processText } from './processors/textProcessor';
import { saveDocument } from './storage';
import { formatBytes, getFileExtension } from './utils';
import { generateEmbeddings } from './languageProcessing';
import { insertDocument } from './duckdb';

// Main document processing function
export async function processFile(
  file: File,
  onProgress: (progress: number) => void
): Promise<Document> {
  try {
    onProgress(10);

    // Step 1: Read the file
    const arrayBuffer = await readFileAsArrayBuffer(file);
    onProgress(20);

    // Step 2: Determine file type and choose processor
    const fileType = getFileExtension(file.name);

    // Step 3: Extract text, layout, and metadata based on file type
    const { text, metadata } = await extractTextAndMetadata(
      arrayBuffer, 
      fileType, 
      file.name,
      (subProgress) => onProgress(20 + subProgress * 0.2)
    );

    // Process layout if document contains images
    let layoutChunks = [];
    if (metadata.hasImages) {
      layoutChunks = await layoutProcessor.processDocument(arrayBuffer);
      onProgress(40);
    }

    onProgress(50);

    // Step 4: Split text into chunks and merge with layout chunks
    const textChunks = await splitIntoChunks(text, {
      documentId: crypto.randomUUID(),
      fileName: file.name,
    });
    
    const chunks = [...textChunks, ...layoutChunks.map(chunk => ({
      ...chunk,
      documentId: textChunks[0].documentId
    }))];

    onProgress(60);

    // Step 5: Generate embeddings for chunks
    const chunksWithEmbeddings = await processChunksWithEmbeddings(
      chunks,
      (subProgress) => onProgress(60 + subProgress * 0.3)
    );

    console.log('Chunks with embeddings:', chunksWithEmbeddings);

    onProgress(90);

    // Step 6: Create document object
    const document: Document = {
      id: chunks[0].documentId,
      name: file.name,
      type: fileType,
      size: file.size,
      sizeFormatted: formatBytes(file.size),
      createdAt: new Date(),
      content: {
        fullText: text,
        chunks: chunksWithEmbeddings,
      },
      source: 'local',
      metadata: {
        ...metadata,
        mimeType: file.type,
      },
    };

    // Step 7: Build knowledge graph
    await import('./knowledgeGraph').then(module => module.addDocumentToGraph(document));

    // Step 8: Save document to storage
    await saveDocument(document);
    await insertDocument(document);

    onProgress(100);

    return document;
  } catch (error) {
    console.error('Error processing file:', error);
    throw error;
  }
}

// Read file as ArrayBuffer
function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(reader.result as ArrayBuffer);
    };

    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };

    reader.readAsArrayBuffer(file);
  });
}

// Extract text and metadata from file
async function extractTextAndMetadata(
  buffer: ArrayBuffer,
  fileType: string,
  fileName: string,
  onProgress: (progress: number) => void
): Promise<{ text: string; metadata: DocumentMetadata }> {
  switch (fileType.toLowerCase()) {
    case 'pdf':
      return processPdf(buffer, onProgress);
    case 'docx':
    case 'doc':
      return processDocx(buffer, onProgress);
    case 'xlsx':
    case 'xls':
      return processXlsx(buffer, onProgress);
    case 'txt':
    case 'md':
    case 'csv':
      return processText(buffer, onProgress);
    default:
      try {
        // Try text processing as fallback
        return processText(buffer, onProgress);
      } catch (error) {
        throw new Error(`Unsupported file type: ${fileType}`);
      }
  }
}

// Split text into chunks
async function splitIntoChunks(
  text: string,
  options: { documentId: string; fileName: string }
): Promise<DocumentChunk[]> {
  const { documentId, fileName } = options;

  // Simple chunking strategy: split by paragraphs then combine
  // If a paragraph is too long, split it further
  const MAX_CHUNK_SIZE = 1000; // characters
  const MIN_CHUNK_SIZE = 200; // characters

  const paragraphs = text.split(/\n\s*\n/);
  const chunks: DocumentChunk[] = [];

  let currentChunk = '';
  let startIndex = 0;
  let paragraph = 1;

  for (const p of paragraphs) {
    const trimmedP = p.trim();
    if (!trimmedP) continue;

    // If this paragraph is very large, split it further
    if (trimmedP.length > MAX_CHUNK_SIZE) {
      // First, add existing chunk if needed
      if (currentChunk) {
        chunks.push({
          id: crypto.randomUUID(),
          documentId,
          text: currentChunk,
          metadata: {
            startIndex,
            endIndex: startIndex + currentChunk.length,
            paragraph: paragraph - 1,
          },
        });

        currentChunk = '';
      }

      // Now split the large paragraph
      let sentenceStart = 0;
      const sentences = trimmedP.match(/[^.!?]+[.!?]+/g) || [trimmedP];

      let sentenceChunk = '';

      for (const sentence of sentences) {
        if (sentenceChunk.length + sentence.length > MAX_CHUNK_SIZE) {
          chunks.push({
            id: crypto.randomUUID(),
            documentId,
            text: sentenceChunk,
            metadata: {
              startIndex: startIndex + sentenceStart,
              endIndex: startIndex + sentenceStart + sentenceChunk.length,
              paragraph,
            },
          });

          sentenceStart += sentenceChunk.length;
          sentenceChunk = sentence;
        } else {
          sentenceChunk += sentence;
        }
      }

      // Add any remaining sentence chunk
      if (sentenceChunk) {
        chunks.push({
          id: crypto.randomUUID(),
          documentId,
          text: sentenceChunk,
          metadata: {
            startIndex: startIndex + sentenceStart,
            endIndex: startIndex + sentenceStart + sentenceChunk.length,
            paragraph,
          },
        });
      }
    } else {
      // Normal sized paragraph
      if (currentChunk.length + trimmedP.length > MAX_CHUNK_SIZE) {
        // Current chunk would be too large, store it and start a new one
        chunks.push({
          id: crypto.randomUUID(),
          documentId,
          text: currentChunk,
          metadata: {
            startIndex,
            endIndex: startIndex + currentChunk.length,
            paragraph: paragraph - 1,
          },
        });

        currentChunk = trimmedP;
        startIndex = text.indexOf(trimmedP);
      } else if (currentChunk.length + trimmedP.length < MIN_CHUNK_SIZE) {
        // Chunk is still small, add to it
        currentChunk = currentChunk ? `${currentChunk}\n\n${trimmedP}` : trimmedP;
        if (!currentChunk) startIndex = text.indexOf(trimmedP);
      } else {
        // Chunk would be a good size, add this paragraph
        currentChunk = currentChunk ? `${currentChunk}\n\n${trimmedP}` : trimmedP;
        if (!currentChunk) startIndex = text.indexOf(trimmedP);

        chunks.push({
          id: crypto.randomUUID(),
          documentId,
          text: currentChunk,
          metadata: {
            startIndex,
            endIndex: startIndex + currentChunk.length,
            paragraph,
          },
        });

        currentChunk = '';
      }
    }

    paragraph++;
  }

  // Add the last chunk if there is one
  if (currentChunk) {
    chunks.push({
      id: crypto.randomUUID(),
      documentId,
      text: currentChunk,
      metadata: {
        startIndex,
        endIndex: startIndex + currentChunk.length,
        paragraph: paragraph - 1,
      },
    });
  }

  return chunks;
}

// Process chunks with embeddings
async function processChunksWithEmbeddings(
  chunks: DocumentChunk[],
  onProgress: (progress: number) => void
): Promise<DocumentChunk[]> {
  const total = chunks.length;
  const processed = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    try {
      // Generate embedding for chunk
      const embedding = await generateEmbeddings(chunk.text);

      // Add embedding to chunk
      const processedChunk = {
        ...chunk,
        embedding,
      };

      processed.push(processedChunk);
      onProgress((i + 1) / total * 100);
    } catch (error) {
      console.error('Error generating embedding for chunk:', error);
      processed.push(chunk); // Still add chunk without embedding
      onProgress((i + 1) / total * 100);
    }
  }

  return processed;
}