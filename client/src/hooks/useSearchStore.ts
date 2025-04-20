import { create } from 'zustand';
import { SearchResult } from '@/types';

interface SearchState {
  searchQuery: string;
  language: 'english' | 'hindi' | 'hinglish' | 'all';
  results: SearchResult[];
  isLoading: boolean;
  hasResults: boolean;
  summaryAnswer: string | null;
  summarySource: {
    documentId: string;
    documentName: string;
    section?: string;
  } | null;
  
  // Actions
  setSearchQuery: (query: string) => void;
  clearSearchQuery: () => void;
  setLanguage: (language: 'english' | 'hindi' | 'hinglish' | 'all') => void;
  setResults: (results: SearchResult[]) => void;
  clearResults: () => void;
  setLoading: (isLoading: boolean) => void;
  setSummaryAnswer: (answer: string | null, source?: {
    documentId: string;
    documentName: string;
    section?: string;
  } | null) => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  searchQuery: '',
  language: 'all',
  results: [],
  isLoading: false,
  hasResults: false,
  summaryAnswer: null,
  summarySource: null,
  
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  
  clearSearchQuery: () => set({ 
    searchQuery: '',
    results: [],
    hasResults: false,
    summaryAnswer: null,
    summarySource: null 
  }),
  
  setLanguage: (language) => set({ language }),
  
  setResults: (results) => set({ 
    results,
    hasResults: results.length > 0
  }),
  
  clearResults: () => set({ 
    results: [],
    hasResults: false,
    summaryAnswer: null,
    summarySource: null 
  }),
  
  setLoading: (isLoading) => set({ isLoading }),
  
  setSummaryAnswer: (answer, source = null) => set({
    summaryAnswer: answer,
    summarySource: source
  }),
}));
