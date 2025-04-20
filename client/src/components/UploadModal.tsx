import { useState, useRef, ChangeEvent } from 'react';
import { useDocumentStore } from '@/hooks/useDocumentStore';
import { processFile } from '@/lib/documentProcessing';
import { addToVectorStore } from '@/lib/vectorStore';
import { formatBytes } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface UploadModalProps {
  onClose: () => void;
  onProcessStart: () => void;
}

export default function UploadModal({ onClose, onProcessStart }: UploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { 
    uploadedFiles, 
    addUploadFile, 
    removeUploadFile, 
    clearUploadedFiles, 
    updateUploadFile,
    updateProcessingStatus,
    addDocument
  } = useDocumentStore();
  
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    // Add each file to the store
    for (let i = 0; i < files.length; i++) {
      addUploadFile(files[i]);
    }
    
    // Reset the input so the same file can be selected again
    e.target.value = '';
  };
  
  const removeFile = (id: string) => {
    removeUploadFile(id);
  };
  
  const processFiles = async () => {
    if (uploadedFiles.length === 0) return;
    
    onProcessStart(); // Close modal and show processing status
    
    // Initialize processing status
    updateProcessingStatus({
      overall: 0,
      files: uploadedFiles.map(file => ({
        id: file.id,
        name: file.file.name,
        progress: 0
      }))
    });
    
    // Process each file
    for (let i = 0; i < uploadedFiles.length; i++) {
      const uploadFile = uploadedFiles[i];
      
      try {
        // Update file status
        updateUploadFile(uploadFile.id, { status: 'processing' });
        
        // Update overall progress
        updateProcessingStatus({
          overall: Math.round((i / uploadedFiles.length) * 100)
        });
        
        // Process the file
        const document = await processFile(
          uploadFile.file,
          (progress) => {
            // Update file progress
            updateProcessingStatus({
              files: uploadedFiles.map((f, idx) => ({
                id: f.id,
                name: f.file.name,
                progress: idx === i ? progress : (idx < i ? 100 : 0)
              }))
            });
          }
        );
        
        // Add processed document to store
        addDocument(document);
        
        // Add to vector store
        await addToVectorStore(
          document.content.chunks,
          document.name,
          document.type
        );
        
        // Update file status
        updateUploadFile(uploadFile.id, { status: 'complete', progress: 100 });
      } catch (error) {
        console.error(`Error processing file ${uploadFile.file.name}:`, error);
        updateUploadFile(uploadFile.id, { 
          status: 'error', 
          error: (error as Error).message || 'Unknown error'
        });
      }
    }
    
    // Update final progress
    updateProcessingStatus({
      overall: 100
    });
    
    // Clear uploaded files after processing
    clearUploadedFiles();
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full mx-4">
        <div className="p-4 border-b border-neutral-200 flex justify-between items-center">
          <h3 className="text-lg font-medium">Upload Documents</h3>
          <button 
            onClick={onClose} 
            className="p-1 rounded-full hover:bg-neutral-100"
          >
            <span className="material-icons">close</span>
          </button>
        </div>
        <div className="p-4">
          <div 
            className="border-2 border-dashed border-neutral-300 rounded-lg p-8 text-center mb-4"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const files = e.dataTransfer.files;
              for (let i = 0; i < files.length; i++) {
                addUploadFile(files[i]);
              }
            }}
          >
            <span className="material-icons text-4xl text-neutral-400 mb-3">cloud_upload</span>
            <p className="text-neutral-600 mb-2">Drag and drop files here or click to browse</p>
            <p className="text-xs text-neutral-500 mb-4">Supports PDF, DOCX, XLSX, TXT, MD, and more</p>
            <Button 
              onClick={triggerFileInput}
              className="bg-primary-600 hover:bg-primary-700 text-white py-2 px-4 rounded transition-colors"
            >
              Select Files
            </Button>
            <input 
              type="file" 
              ref={fileInputRef}
              multiple 
              className="hidden" 
              accept=".pdf,.docx,.xlsx,.txt,.md,.csv"
              onChange={handleFileChange}
            />
          </div>
          
          {uploadedFiles.length > 0 && (
            <div className="space-y-2 mb-4">
              {uploadedFiles.map(file => (
                <div 
                  key={file.id}
                  className="flex items-center justify-between p-2 bg-neutral-50 rounded border border-neutral-200"
                >
                  <div className="flex items-center">
                    <span className="material-icons text-neutral-500 mr-2">description</span>
                    <div>
                      <p className="text-sm font-medium truncate">{file.file.name}</p>
                      <p className="text-xs text-neutral-500">{formatBytes(file.file.size)}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => removeFile(file.id)}
                    className="p-1 rounded-full hover:bg-neutral-200"
                  >
                    <span className="material-icons text-sm">close</span>
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline"
              onClick={onClose}
              className="px-4 py-2 border border-neutral-300 rounded hover:bg-neutral-50 transition-colors"
            >
              Cancel
            </Button>
            <Button 
              onClick={processFiles}
              disabled={uploadedFiles.length === 0}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded transition-colors disabled:bg-neutral-300 disabled:cursor-not-allowed"
            >
              Upload & Process
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
