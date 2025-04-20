import { describe, it, expect, beforeEach } from 'vitest';
import { useSearchStore } from './useSearchStore';
import { SearchResult } from '@/types';

describe('useSearchStore', () => {
  beforeEach(() => {
    // Reset the store before each test
    useSearchStore.setState({
      searchQuery: '',
      language: 'all',
      results: [],
      isLoading: false,
      hasResults: false,
      summaryAnswer: null,
      summarySource: null
    });
  });

  it('should set search query', () => {
    const { setSearchQuery } = useSearchStore.getState();
    
    setSearchQuery('test query');
    
    const state = useSearchStore.getState();
    expect(state.searchQuery).toBe('test query');
  });

  it('should clear search query and results', () => {
    const { setSearchQuery, setResults, clearSearchQuery } = useSearchStore.getState();
    
    // Setup initial state
    setSearchQuery('test query');
    
    const testResults: SearchResult[] = [{
      documentId: 'doc-1',
      documentName: 'Test Document',
      documentType: 'pdf',
      chunkId: 'chunk-1',
      text: 'Test content',
      score: 0.9,
      matchPercentage: 90,
      metadata: {}
    }];
    
    setResults(testResults);
    
    let state = useSearchStore.getState();
    expect(state.searchQuery).toBe('test query');
    expect(state.results).toHaveLength(1);
    expect(state.hasResults).toBe(true);
    
    // Clear the search
    clearSearchQuery();
    
    state = useSearchStore.getState();
    expect(state.searchQuery).toBe('');
    expect(state.results).toHaveLength(0);
    expect(state.hasResults).toBe(false);
    expect(state.summaryAnswer).toBeNull();
  });

  it('should set language', () => {
    const { setLanguage } = useSearchStore.getState();
    
    setLanguage('hindi');
    
    const state = useSearchStore.getState();
    expect(state.language).toBe('hindi');
  });

  it('should set results and update hasResults', () => {
    const { setResults } = useSearchStore.getState();
    
    // Empty results
    setResults([]);
    
    let state = useSearchStore.getState();
    expect(state.results).toHaveLength(0);
    expect(state.hasResults).toBe(false);
    
    // With results
    const testResults: SearchResult[] = [{
      documentId: 'doc-1',
      documentName: 'Test Document',
      documentType: 'pdf',
      chunkId: 'chunk-1',
      text: 'Test content',
      score: 0.9,
      matchPercentage: 90,
      metadata: {}
    }];
    
    setResults(testResults);
    
    state = useSearchStore.getState();
    expect(state.results).toHaveLength(1);
    expect(state.hasResults).toBe(true);
  });

  it('should set loading state', () => {
    const { setLoading } = useSearchStore.getState();
    
    setLoading(true);
    
    let state = useSearchStore.getState();
    expect(state.isLoading).toBe(true);
    
    setLoading(false);
    
    state = useSearchStore.getState();
    expect(state.isLoading).toBe(false);
  });

  it('should set summary answer and source', () => {
    const { setSummaryAnswer } = useSearchStore.getState();
    
    setSummaryAnswer('This is a summary answer', {
      documentId: 'doc-1',
      documentName: 'Test Document',
      section: 'Introduction'
    });
    
    const state = useSearchStore.getState();
    expect(state.summaryAnswer).toBe('This is a summary answer');
    expect(state.summarySource).not.toBeNull();
    expect(state.summarySource?.documentId).toBe('doc-1');
    expect(state.summarySource?.section).toBe('Introduction');
  });

  it('should clear results and summary', () => {
    const { setResults, setSummaryAnswer, clearResults } = useSearchStore.getState();
    
    // Setup initial state
    const testResults: SearchResult[] = [{
      documentId: 'doc-1',
      documentName: 'Test Document',
      documentType: 'pdf',
      chunkId: 'chunk-1',
      text: 'Test content',
      score: 0.9,
      matchPercentage: 90,
      metadata: {}
    }];
    
    setResults(testResults);
    setSummaryAnswer('This is a summary answer');
    
    // Clear results
    clearResults();
    
    const state = useSearchStore.getState();
    expect(state.results).toHaveLength(0);
    expect(state.hasResults).toBe(false);
    expect(state.summaryAnswer).toBeNull();
    expect(state.summarySource).toBeNull();
  });
});