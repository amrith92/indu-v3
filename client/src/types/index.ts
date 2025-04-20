export interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  sizeFormatted: string;
  createdAt: Date;
  content: DocumentContent | undefined;
  source: 'local' | 'google_drive';
  metadata: DocumentMetadata | undefined;
}

export interface DocumentMetadata {
  author?: string;
  createdAt?: Date;
  modifiedAt?: Date;
  pageCount?: number;
  wordCount?: number;
  mimeType?: string;
  [key: string]: any;
}

export interface DocumentContent {
  fullText: string;
  chunks: DocumentChunk[];
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  text: string;
  embedding?: Float32Array;
  metadata: {
    pageNumber?: number;
    paragraph?: number;
    section?: string;
    startIndex: number;
    endIndex: number;
    [key: string]: any;
  };
}

export type SearchResult = {
  documentId: string;
  documentName: string;
  documentType: string;
  chunkId: string;
  text: string;
  score: number;
  matchPercentage: number;
  metadata: {
    pageNumber?: number;
    paragraph?: number;
    section?: string;
    [key: string]: any;
  };
};

export interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'processing' | 'complete' | 'error';
  error?: string;
}

export interface Stats {
  totalDocuments: number;
  storageUsed: number;
  storageUsedFormatted: string;
  lastIndexed: Date | null;
}

export interface ProcessingStatus {
  overall: number;
  files: {
    id: string;
    name: string;
    progress: number;
  }[];
}
