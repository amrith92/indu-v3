import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Document, ProcessingStatus, Stats, UploadFile } from '@/types';
import { formatBytes } from '@/lib/utils';

interface DocumentState {
  documents: Document[];
  selectedDocument: Document | null;
  uploadedFiles: UploadFile[];
  processingStatus: ProcessingStatus;
  filter: string;
  stats: Stats;
  
  // Actions
  addDocument: (document: Document) => void;
  removeDocument: (id: string) => void;
  updateDocument: (id: string, document: Partial<Document>) => void;
  selectDocument: (id: string | null) => void;
  addUploadFile: (file: File) => void;
  removeUploadFile: (id: string) => void;
  updateUploadFile: (id: string, data: Partial<UploadFile>) => void;
  clearUploadedFiles: () => void;
  updateProcessingStatus: (status: Partial<ProcessingStatus>) => void;
  setFilter: (filter: string) => void;
  clearFilter: () => void;
}

export const useDocumentStore = create<DocumentState>()(
  devtools(
    persist(
      (set, get) => ({
        documents: [],
        selectedDocument: null,
        uploadedFiles: [],
        processingStatus: {
          overall: 0,
          files: [],
        },
        filter: '',
        stats: {
          totalDocuments: 0,
          storageUsed: 0,
          storageUsedFormatted: '0 B',
          lastIndexed: null,
        },
        
        addDocument: (document) => {
          set((state) => {
            const documents = [...state.documents, document];
            const totalSize = documents.reduce((acc, doc) => acc + doc.size, 0);
            
            return {
              documents,
              stats: {
                ...state.stats,
                totalDocuments: documents.length,
                storageUsed: totalSize,
                storageUsedFormatted: formatBytes(totalSize),
                lastIndexed: new Date(),
              }
            };
          });
        },
        
        removeDocument: (id) => {
          set((state) => {
            const documents = state.documents.filter((doc) => doc.id !== id);
            const totalSize = documents.reduce((acc, doc) => acc + doc.size, 0);
            
            return {
              documents,
              selectedDocument: state.selectedDocument?.id === id 
                ? null 
                : state.selectedDocument,
              stats: {
                ...state.stats,
                totalDocuments: documents.length,
                storageUsed: totalSize,
                storageUsedFormatted: formatBytes(totalSize),
              }
            };
          });
        },
        
        updateDocument: (id, document) => {
          set((state) => {
            const documents = state.documents.map((doc) => 
              doc.id === id ? { ...doc, ...document } : doc
            );
            
            return {
              documents,
              selectedDocument: state.selectedDocument?.id === id
                ? { ...state.selectedDocument, ...document }
                : state.selectedDocument,
            };
          });
        },
        
        selectDocument: (id) => {
          set((state) => ({
            selectedDocument: id 
              ? state.documents.find((doc) => doc.id === id) || null
              : null,
          }));
        },
        
        addUploadFile: (file) => {
          const id = crypto.randomUUID();
          set((state) => ({
            uploadedFiles: [
              ...state.uploadedFiles,
              {
                id,
                file,
                progress: 0,
                status: 'pending',
              },
            ],
          }));
          return id;
        },
        
        removeUploadFile: (id) => {
          set((state) => ({
            uploadedFiles: state.uploadedFiles.filter((file) => file.id !== id),
          }));
        },
        
        updateUploadFile: (id, data) => {
          set((state) => ({
            uploadedFiles: state.uploadedFiles.map((file) =>
              file.id === id ? { ...file, ...data } : file
            ),
          }));
        },
        
        clearUploadedFiles: () => {
          set({ uploadedFiles: [] });
        },
        
        updateProcessingStatus: (status) => {
          set((state) => ({
            processingStatus: {
              ...state.processingStatus,
              ...status,
            },
          }));
        },
        
        setFilter: (filter) => {
          set({ filter });
        },
        
        clearFilter: () => {
          set({ filter: '' });
        },
      }),
      {
        name: 'document-store',
        partialize: (state) => ({ 
          documents: state.documents,
          stats: state.stats,
        }),
      }
    )
  )
);
