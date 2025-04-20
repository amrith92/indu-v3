import { useDocumentStore } from '@/hooks/useDocumentStore';
import { getFileTypeIcon, highlightText } from '@/lib/utils';
import { useSearchStore } from '@/hooks/useSearchStore';

export default function DocumentViewer() {
  const { selectedDocument, selectDocument } = useDocumentStore();
  const { searchQuery } = useSearchStore();
  
  if (!selectedDocument) return null;
  
  const closeDocument = () => {
    selectDocument(null);
  };
  
  const downloadDocument = () => {
    // In a real implementation, this would retrieve the original file
    alert('Download functionality will be implemented soon!');
  };
  
  // Prepare document content with highlights if search query exists
  const renderDocumentContent = () => {
    if (!selectedDocument) return null;
    
    let content = selectedDocument.content.fullText;
    
    // Add highlights for search terms if search query exists
    if (searchQuery) {
      content = highlightText(content, searchQuery);
    }
    
    // Add line breaks for readability
    content = content.replace(/\n\n/g, '</p><p>');
    
    return <div dangerouslySetInnerHTML={{ __html: `<p>${content}</p>` }} />;
  };
  
  return (
    <aside className="w-0 md:w-1/2 lg:w-2/5 bg-white border-l border-neutral-200 flex flex-col h-full transition-all duration-300 ease-in-out">
      <div className="border-b border-neutral-200 p-4 flex justify-between items-center">
        <div className="flex items-center">
          <span className="material-icons text-neutral-500 mr-2">
            {getFileTypeIcon(selectedDocument.type)}
          </span>
          <h3 className="font-medium truncate">{selectedDocument.name}</h3>
        </div>
        <div className="flex items-center">
          <button 
            onClick={downloadDocument}
            className="p-2 rounded-full hover:bg-neutral-100"
          >
            <span className="material-icons">file_download</span>
          </button>
          <button 
            onClick={closeDocument}
            className="p-2 rounded-full hover:bg-neutral-100"
          >
            <span className="material-icons">close</span>
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="bg-white border border-neutral-200 rounded-lg">
          <div className="p-6">
            {selectedDocument.type === 'pdf' && (
              <div className="mb-4 text-sm text-neutral-500">
                <div className="flex items-center">
                  <span className="material-icons text-sm mr-2">description</span>
                  <span>PDF Document • {selectedDocument.metadata.pageCount || '?'} pages</span>
                </div>
              </div>
            )}
            
            {selectedDocument.type === 'xlsx' && selectedDocument.metadata.sheets && (
              <div className="mb-4">
                <h3 className="text-sm font-medium mb-2">Sheets:</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedDocument.metadata.sheets.map((sheet: string) => (
                    <span 
                      key={sheet}
                      className="text-xs bg-neutral-100 px-2 py-1 rounded"
                    >
                      {sheet}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            <div className="prose prose-sm max-w-none">
              {renderDocumentContent()}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
