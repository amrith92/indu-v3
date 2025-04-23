import { useState, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { useSearchStore } from "@/hooks/useSearchStore";
import { executeSearchGraph } from "@/lib/langGraph";
import { logSearch } from "@/lib/duckdb";
import { getAllDocuments, getDocumentById } from "@/lib/storage";
import { extractContextAroundMatch, highlightText } from "@/lib/utils";

export default function SearchBar() {
  const {
    searchQuery,
    setSearchQuery,
    clearSearchQuery,
    language,
    setLanguage,
    setResults,
    setLoading,
    setSummaryAnswer,
  } = useSearchStore();

  const languages = [
    { id: "all", label: "All Languages" },
    { id: "english", label: "English" },
    { id: "hindi", label: "Hindi" },
    { id: "hinglish", label: "Hinglish" },
  ];

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setLoading(true);

      // Execute search
      const searchResults = await executeSearchGraph(searchQuery);

      // Log search
      await logSearch(searchQuery, language, searchResults.length);

      // Fetch document content for each result
      const documentsCache = new Map();
      const resultsWithContent = await Promise.all(
        searchResults.map(async (result) => {
          // Get document if not already in cache
          if (!documentsCache.has(result.documentId)) {
            const document = await getDocumentById(result.documentId);
            if (document) {
              documentsCache.set(result.documentId, document);
            }
          }

          const document = documentsCache.get(result.documentId);

          if (!document) {
            return { ...result, text: "Document not found" };
          }

          // Find the chunk
          const chunk = document.content.chunks.find(
            (c) => c.id === result.chunkId,
          );

          if (!chunk) {
            return { ...result, text: "Chunk not found" };
          }

          // Extract context around match
          const contextText = extractContextAroundMatch(
            chunk.text,
            searchQuery,
          );
          const highlightedText = highlightText(contextText, searchQuery);

          return {
            ...result,
            text: highlightedText,
          };
        }),
      );

      // Set results
      setResults(resultsWithContent);

      // Generate summary (simple version - first result)
      if (resultsWithContent.length > 0) {
        const topResult = resultsWithContent[0];
        setSummaryAnswer(topResult.text, {
          documentId: topResult.documentId,
          documentName: topResult.documentName,
          section: topResult.metadata.section || "",
        });
      } else {
        setSummaryAnswer(null);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleLanguageToggle = (
    lang: "english" | "hindi" | "hinglish" | "all",
  ) => {
    setLanguage(lang);
  };

  return (
    <div className="p-4 bg-white border-b border-neutral-200">
      <div className="relative max-w-4xl mx-auto">
        <div className="relative flex items-center">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="material-icons text-neutral-400">search</span>
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search your documents in English, Hindi, or Hinglish..."
            className="block w-full bg-neutral-50 border border-neutral-300 rounded-lg pl-10 pr-12 py-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {searchQuery && (
              <button
                onClick={clearSearchQuery}
                className="p-1 rounded-full hover:bg-neutral-200 transition-colors"
              >
                <span className="material-icons text-neutral-500">close</span>
              </button>
            )}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {languages.map((lang) => (
            <button
              key={lang.id}
              onClick={() => handleLanguageToggle(lang.id as any)}
              className={`text-xs py-1 px-2 rounded-full ${
                language === lang.id
                  ? "bg-primary-100 text-primary-800 hover:bg-primary-200"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              } transition-colors`}
            >
              {lang.label}
            </button>
          ))}
          <div className="flex-1"></div>
          <button className="text-xs py-1 px-2 text-primary-600 hover:text-primary-800 transition-colors flex items-center">
            <span>Advanced Search</span>
            <span className="material-icons text-sm ml-1">tune</span>
          </button>
        </div>
      </div>
    </div>
  );
}
