import { useEffect } from 'react';
import { useDocumentStore } from '@/hooks/useDocumentStore';
import { getFileTypeIcon } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { processFile } from '@/lib/documentProcessing';

interface DocumentSidebarProps {
  onUploadClick: () => void;
}

export default function DocumentSidebar({ onUploadClick }: DocumentSidebarProps) {
  const { 
    documents, 
    selectDocument, 
    filter, 
    setFilter, 
    clearFilter, 
    stats,
    addUploadFile,
    addDocument,
  } = useDocumentStore();

  // Filter documents based on search term
  const filteredDocuments = documents.filter(doc => {
    if (!filter) return true;
    
    const searchTerm = filter.toLowerCase();
    return (
      doc.name.toLowerCase().includes(searchTerm) ||
      doc.type.toLowerCase().includes(searchTerm)
    );
  });

  // Connect to Google Drive
  const handleConnectGoogleDrive = async () => {
    try {
      const { authenticateWithGoogle, listDriveFiles } = await import('@/lib/googleDrive');
      
      // Authenticate the user with Google
      const isAuthenticated = await authenticateWithGoogle();
      if (!isAuthenticated) {
        alert('Failed to authenticate with Google Drive.');
        return;
      }

      // List files from Google Drive and add them to the document store
      let pageToken: string | undefined = undefined;
      let allFiles: Array<{
        id: string;
        name: string;
        mimeType: string;
        size: number;
        modifiedTime: string;
      }> = [];

      // Loop through all pages of files
      do {
        const { files, nextPageToken } = await listDriveFiles({ pageToken });
        allFiles = allFiles.concat(files);
        pageToken = nextPageToken;
      } while (pageToken);

      // Process and add each file to the document store
      for (const file of allFiles) {
        try {
          documents.push({
            id: file.id,
            name: file.name,
            type: file.mimeType,
            size: file.size,
            sizeFormatted: `${(file.size / 1024).toFixed(2)} KB`,
            createdAt: new Date(file.modifiedTime),
            source: 'google_drive',
            content: undefined,
            metadata: undefined
          });
          console.log(`Added document: ${file.name}`);
        } catch (error) {
          console.error(`Failed to process file ${file.name}:`, error);
        }
      }

      console.log('All Google Drive files have been added to the document store.');

      alert('Google Drive files successfully imported!');
    } catch (error) {
      console.error('Error connecting to Google Drive:', error);
      alert('An error occurred while connecting to Google Drive.');
    }
  };

  const handleFileUpload = async () => {
    try {
      const { uploadFiles } = await import('@/lib/fileUpload');
      const files = await uploadFiles();
      if (!files) {
        alert('No files selected for upload.');
        return;
      }
      for (const file of files) {
        const fileBlob = new Blob([file.content], { type: file.type });
        const convertedFile = new File([fileBlob], file.name, { type: file.type, lastModified: Date.now() });
        const id = addUploadFile(convertedFile);
        const document = await processFile(convertedFile, (progress) => {
          console.log(`Processing ${file.name}: ${progress}%`);
        });
        addDocument(document);
        console.log(`Added document: ${file.name}`); 
      }
      console.log('All files have been added to the document store.');
      alert('Files successfully uploaded!');
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('An error occurred while uploading files.');
    }
  };

  return (
    <aside className="w-64 bg-white border-r border-neutral-200 flex flex-col h-full transition-all duration-300 ease-in-out">
      <div className="p-4 flex flex-col h-full">
        <h2 className="text-lg font-medium mb-4">Documents</h2>
        
        {/* Upload Buttons */}
        <div className="flex flex-col gap-2 mb-6">
          <Button 
            onClick={onUploadClick}
            className="bg-primary-600 hover:bg-primary-700 text-white py-2 px-4 rounded flex items-center justify-center gap-2 transition-colors"
          >
            <span className="material-icons text-sm">upload_file</span>
            <span>Upload Files</span>
          </Button>
          <Button 
            variant="outline"
            onClick={handleFileUpload}
            className="bg-white border border-neutral-300 hover:bg-neutral-50 py-2 px-4 rounded flex items-center justify-center gap-2 transition-colors"
          >
            <span className="material-icons text-sm">cloud</span>
            <span>Connect Google Drive</span>
          </Button>
        </div>
        
        {/* Document Filters */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-neutral-700">Filter Documents</h3>
            <button 
              onClick={clearFilter}
              className="text-xs text-primary-600 hover:text-primary-800"
            >
              Clear
            </button>
          </div>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <span className="material-icons text-neutral-400 text-lg">filter_list</span>
            </span>
            <Input
              type="text"
              placeholder="Filter by name, type..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>
        </div>
        
        {/* Document List */}
        <div className="flex-1 overflow-y-auto">
          {documents.length === 0 ? (
            <div className="text-center py-6 text-neutral-500">
              <span className="material-icons text-neutral-300 text-3xl mb-2">description</span>
              <p className="text-sm">No documents yet</p>
              <p className="text-xs mt-1">Upload files to get started</p>
            </div>
          ) : (
            <ul className="space-y-1">
              {filteredDocuments.map((doc) => (
                <li 
                  key={doc.id}
                  onClick={() => selectDocument(doc.id)}
                  className="p-2 hover:bg-neutral-100 rounded cursor-pointer transition-colors flex items-start gap-2"
                >
                  <span className="material-icons text-neutral-500 mt-0.5">
                    {getFileTypeIcon(doc.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{doc.name}</p>
                    <div className="flex items-center text-xs text-neutral-500">
                      <span>{doc.type.toUpperCase()}</span>
                      <span className="mx-1">•</span>
                      <span>{doc.sizeFormatted}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        {/* Document Stats */}
        <div className="mt-4 pt-4 border-t border-neutral-200 text-xs text-neutral-500">
          <div className="flex justify-between mb-1">
            <span>Total Documents:</span>
            <span>{stats.totalDocuments}</span>
          </div>
          <div className="flex justify-between mb-1">
            <span>Storage Used:</span>
            <span>{stats.storageUsedFormatted}</span>
          </div>
          <div className="flex justify-between">
            <span>Last Indexed:</span>
            <span>
              {stats.lastIndexed 
                ? new Date(stats.lastIndexed).toLocaleString(undefined, { 
                    hour: 'numeric', 
                    minute: '2-digit',
                    hour12: true,
                    month: 'short',
                    day: 'numeric' 
                  })
                : 'Never'
              }
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
