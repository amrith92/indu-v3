import { useEffect, useState } from 'react';
import { initDuckDB } from '@/lib/duckdb';
import { initVectorStore } from '@/lib/vectorStore';
import { initializeDatabase } from '@/lib/storage';
import DocumentSidebar from '@/components/DocumentSidebar';
import SearchBar from '@/components/SearchBar';
import SearchResults from '@/components/SearchResults';
import DocumentViewer from '@/components/DocumentViewer';
import UploadModal from '@/components/UploadModal';
import ProcessingStatus from '@/components/ProcessingStatus';
import { useDocumentStore } from '@/hooks/useDocumentStore';
import { useSearchStore } from '@/hooks/useSearchStore';

export default function Home() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showProcessingStatus, setShowProcessingStatus] = useState(false);
  
  const { documents, selectedDocument, processingStatus } = useDocumentStore();
  const { isLoading, hasResults } = useSearchStore();
  
  // Initialize core libraries
  useEffect(() => {
    async function initialize() {
      try {
        await Promise.all([
          initializeDatabase(),
          initDuckDB(),
          initVectorStore(),
        ]);
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize application:', error);
      }
    }
    
    initialize();
  }, []);
  
  // Show processing status when files are being processed
  useEffect(() => {
    if (processingStatus.overall > 0 && processingStatus.overall < 100) {
      setShowProcessingStatus(true);
    } else if (processingStatus.overall === 100) {
      // Hide after a short delay
      const timer = setTimeout(() => {
        setShowProcessingStatus(false);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [processingStatus]);
  
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 shadow-sm z-10">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="material-icons text-primary-600">search</span>
            <h1 className="text-xl font-medium text-neutral-800">Document Search Engine</h1>
          </div>
          <div className="hidden md:flex items-center space-x-4">
            <button className="p-2 rounded-full hover:bg-neutral-100">
              <span className="material-icons">dark_mode</span>
            </button>
            <button className="p-2 rounded-full hover:bg-neutral-100">
              <span className="material-icons">settings</span>
            </button>
            <button className="p-2 rounded-full hover:bg-neutral-100">
              <span className="material-icons">fullscreen</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Document Management */}
        <DocumentSidebar onUploadClick={() => setShowUploadModal(true)} />

        {/* Main Content */}
        <main className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Search Bar */}
          <SearchBar />

          {/* Search Results */}
          <SearchResults />
        </main>

        {/* Right Sidebar - Document Viewer */}
        <DocumentViewer />
      </div>

      {/* Modal Components */}
      {showUploadModal && (
        <UploadModal 
          onClose={() => setShowUploadModal(false)} 
          onProcessStart={() => {
            setShowUploadModal(false);
            setShowProcessingStatus(true);
          }}
        />
      )}
      
      {showProcessingStatus && (
        <ProcessingStatus 
          onClose={() => setShowProcessingStatus(false)} 
        />
      )}
    </div>
  );
}
