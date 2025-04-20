import { useEffect, useState } from 'react';
import { useDocumentStore } from '@/hooks/useDocumentStore';
import { useSearchStore } from '@/hooks/useSearchStore';
import { getFileTypeIcon } from '@/lib/utils';

export default function SearchResults() {
  const { selectDocument } = useDocumentStore();
  const { 
    searchQuery, 
    results, 
    isLoading, 
    hasResults,
    summaryAnswer,
    summarySource
  } = useSearchStore();
  
  const [displayResults, setDisplayResults] = useState<typeof results>([]);
  const [resultsPerPage, setResultsPerPage] = useState(5);
  
  // Update displayed results based on pagination
  useEffect(() => {
    setDisplayResults(results.slice(0, resultsPerPage));
  }, [results, resultsPerPage]);
  
  const loadMoreResults = () => {
    setResultsPerPage(prev => prev + 5);
  };
  
  const openDocument = (documentId: string) => {
    selectDocument(documentId);
  };
  
  // Create safe HTML renderer for highlighted text
  const renderHighlightedHTML = (html: string) => {
    return { __html: html };
  };
  
  return (
    <div className="flex-1 overflow-y-auto p-4">
      {/* Loading State */}
      {isLoading && (
        <div className="max-w-4xl mx-auto flex justify-center items-center py-12">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-neutral-600">Processing your query...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !hasResults && (
        <div className="max-w-4xl mx-auto text-center py-12">
          <div className="flex flex-col items-center">
            <span className="material-icons text-5xl text-neutral-300 mb-4">search</span>
            <h3 className="text-xl font-medium text-neutral-700 mb-2">Search Your Documents</h3>
            <p className="text-neutral-500 max-w-md mx-auto">
              Use natural language to ask questions about your documents. Try queries in English, Hindi, or Hinglish.
            </p>
          </div>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="p-4 border border-neutral-200 rounded-lg bg-white hover:shadow-md transition-shadow cursor-pointer">
              <p className="text-sm font-medium text-neutral-800 mb-1">Find financial projections</p>
              <p className="text-xs text-neutral-500">What are the Q4 revenue projections?</p>
            </div>
            <div className="p-4 border border-neutral-200 rounded-lg bg-white hover:shadow-md transition-shadow cursor-pointer">
              <p className="text-sm font-medium text-neutral-800 mb-1">Locate meeting details</p>
              <p className="text-xs text-neutral-500">When is the next project review scheduled?</p>
            </div>
            <div className="p-4 border border-neutral-200 rounded-lg bg-white hover:shadow-md transition-shadow cursor-pointer">
              <p className="text-sm font-medium text-neutral-800 mb-1">Compare metrics</p>
              <p className="text-xs text-neutral-500">How does Q2 compare to Q3 performance?</p>
            </div>
          </div>
        </div>
      )}

      {/* Results State */}
      {!isLoading && hasResults && (
        <div className="max-w-4xl mx-auto">
          {/* Results Summary */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-medium text-neutral-800">
                Results for "{searchQuery}"
              </h2>
              <span className="text-sm text-neutral-500">
                {results.length} results from {new Set(results.map(r => r.documentId)).size} documents
              </span>
            </div>
            
            {summaryAnswer && (
              <div className="bg-primary-50 border border-primary-100 rounded-lg p-4">
                <h3 className="text-sm font-medium text-primary-800 mb-2">Most Relevant Answer</h3>
                <p 
                  className="text-neutral-700 text-sm"
                  dangerouslySetInnerHTML={renderHighlightedHTML(summaryAnswer)}
                ></p>
                
                {summarySource && (
                  <div className="mt-2 flex items-center text-xs text-neutral-500">
                    <span className="font-medium">Source:</span>
                    <span className="ml-1">{summarySource.documentName}</span>
                    {summarySource.section && (
                      <>
                        <span className="mx-1">•</span>
                        <span>Section: {summarySource.section}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Results List */}
          <div className="space-y-4">
            {displayResults.map((result, index) => (
              <div 
                key={`${result.documentId}-${result.chunkId}-${index}`}
                className="bg-white border border-neutral-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-base font-medium text-neutral-800">{result.documentName}</h3>
                  <span className="text-xs bg-primary-100 text-primary-800 py-1 px-2 rounded-full">
                    {result.matchPercentage}% match
                  </span>
                </div>
                <p 
                  className="text-sm text-neutral-600 mb-3"
                  dangerouslySetInnerHTML={renderHighlightedHTML(result.text)}
                ></p>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center text-neutral-500">
                    <span className="material-icons text-sm mr-1">{getFileTypeIcon(result.documentType)}</span>
                    {result.metadata.pageNumber && (
                      <span>Page {result.metadata.pageNumber}</span>
                    )}
                    {result.metadata.section && (
                      <>
                        <span className="mx-1">•</span>
                        <span>Section: {result.metadata.section}</span>
                      </>
                    )}
                    {result.metadata.paragraph && (
                      <>
                        <span className="mx-1">•</span>
                        <span>Paragraph {result.metadata.paragraph}</span>
                      </>
                    )}
                  </div>
                  <button 
                    onClick={() => openDocument(result.documentId)}
                    className="text-primary-600 hover:text-primary-800 flex items-center"
                  >
                    <span>View</span>
                    <span className="material-icons text-sm ml-1">open_in_new</span>
                  </button>
                </div>
              </div>
            ))}

            {/* Load More */}
            {displayResults.length < results.length && (
              <div className="text-center py-4">
                <button 
                  onClick={loadMoreResults}
                  className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                >
                  Load more results
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
