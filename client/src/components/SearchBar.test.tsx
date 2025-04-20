import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../test/utils';
import userEvent from '@testing-library/user-event';
import SearchBar from './SearchBar';
import { useSearchStore } from '@/hooks/useSearchStore';
import * as langGraph from '@/lib/langGraph';
import * as duckdb from '@/lib/duckdb';
import * as storage from '@/lib/storage';

// Mock the dependencies
vi.mock('@/lib/langGraph', () => ({
  executeSearchGraph: vi.fn(),
}));

vi.mock('@/lib/duckdb', () => ({
  logSearch: vi.fn(),
}));

vi.mock('@/lib/storage', () => ({
  getDocumentById: vi.fn(),
  getAllDocuments: vi.fn(),
}));

describe('SearchBar', () => {
  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();
    
    // Reset search store
    useSearchStore.setState({
      searchQuery: '',
      language: 'all',
      results: [],
      isLoading: false,
      hasResults: false,
      summaryAnswer: null,
      summarySource: null,
    });
  });

  it('renders search input and language options', () => {
    render(<SearchBar />);
    
    // Check if search input exists
    const searchInput = screen.getByPlaceholderText('Search your documents in English, Hindi, or Hinglish...');
    expect(searchInput).toBeInTheDocument();
    
    // Check if language options exist
    expect(screen.getByText('All Languages')).toBeInTheDocument();
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('Hindi')).toBeInTheDocument();
    expect(screen.getByText('Hinglish')).toBeInTheDocument();
    
    // Check Advanced Search option
    expect(screen.getByText('Advanced Search')).toBeInTheDocument();
  });

  it('updates search query when typing', async () => {
    render(<SearchBar />);
    
    const searchInput = screen.getByPlaceholderText('Search your documents in English, Hindi, or Hinglish...');
    
    await userEvent.type(searchInput, 'test query');
    
    expect(searchInput).toHaveValue('test query');
    expect(useSearchStore.getState().searchQuery).toBe('test query');
  });

  it('shows clear button when search query is not empty', async () => {
    useSearchStore.setState({ searchQuery: 'test query' });
    
    render(<SearchBar />);
    
    const clearButton = screen.getByRole('button', { name: /close/i });
    expect(clearButton).toBeInTheDocument();
    
    await userEvent.click(clearButton);
    
    expect(useSearchStore.getState().searchQuery).toBe('');
  });

  it('changes language selection when clicking language options', async () => {
    render(<SearchBar />);
    
    const hindiOption = screen.getByText('Hindi');
    
    await userEvent.click(hindiOption);
    
    expect(useSearchStore.getState().language).toBe('hindi');
  });

  it('performs search when pressing enter', async () => {
    // Mock the search functionality
    vi.mocked(langGraph.executeSearchGraph).mockResolvedValue([
      {
        documentId: 'doc-1',
        documentName: 'Test Document',
        documentType: 'pdf',
        chunkId: 'chunk-1',
        text: 'This is a test document content.',
        score: 0.95,
        matchPercentage: 95,
        metadata: { section: 'Introduction' }
      }
    ]);
    
    vi.mocked(storage.getDocumentById).mockResolvedValue({
      id: 'doc-1',
      name: 'Test Document',
      type: 'pdf',
      size: 1024,
      sizeFormatted: '1 KB',
      createdAt: new Date(),
      content: {
        fullText: 'Full document content.',
        chunks: [
          {
            id: 'chunk-1',
            documentId: 'doc-1',
            text: 'This is a test document content.',
            metadata: { section: 'Introduction' }
          }
        ]
      },
      source: 'local',
      metadata: {}
    });
    
    // Set search query
    useSearchStore.setState({ searchQuery: 'test query' });
    
    render(<SearchBar />);
    
    const searchInput = screen.getByPlaceholderText('Search your documents in English, Hindi, or Hinglish...');
    
    fireEvent.keyDown(searchInput, { key: 'Enter' });
    
    // Wait for the search to complete
    await waitFor(() => {
      expect(langGraph.executeSearchGraph).toHaveBeenCalledWith('test query');
      expect(duckdb.logSearch).toHaveBeenCalled();
      expect(storage.getDocumentById).toHaveBeenCalledWith('doc-1');
      expect(useSearchStore.getState().isLoading).toBe(false);
      expect(useSearchStore.getState().results).toHaveLength(1);
    });
  });

  it('handles empty search query', async () => {
    useSearchStore.setState({ searchQuery: '' });
    
    render(<SearchBar />);
    
    const searchInput = screen.getByPlaceholderText('Search your documents in English, Hindi, or Hinglish...');
    
    fireEvent.keyDown(searchInput, { key: 'Enter' });
    
    // The search function should not be called
    expect(langGraph.executeSearchGraph).not.toHaveBeenCalled();
  });
});