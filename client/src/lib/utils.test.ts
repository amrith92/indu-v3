import { describe, it, expect } from 'vitest';
import { 
  formatBytes, 
  getFileExtension, 
  getFileTypeIcon, 
  debounce, 
  highlightText, 
  truncateText,
  extractContextAroundMatch,
  calculateMatchPercentage,
  cn
} from './utils';

describe('Utils', () => {
  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 Bytes');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1024 * 1024)).toBe('1 MB');
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('should respect decimal places', () => {
      expect(formatBytes(1536, 2)).toBe('1.5 KB');
      expect(formatBytes(1536, 0)).toBe('2 KB');
    });
  });

  describe('getFileExtension', () => {
    it('should extract file extension', () => {
      expect(getFileExtension('document.pdf')).toBe('pdf');
      expect(getFileExtension('image.PNG')).toBe('png');
      expect(getFileExtension('file.name.with.dots.txt')).toBe('txt');
    });

    it('should handle files without extension', () => {
      expect(getFileExtension('filename')).toBe('filename');
    });
  });

  describe('getFileTypeIcon', () => {
    it('should return correct icon for file types', () => {
      expect(getFileTypeIcon('pdf')).toBe('picture_as_pdf');
      expect(getFileTypeIcon('docx')).toBe('description');
      expect(getFileTypeIcon('xlsx')).toBe('table_chart');
      expect(getFileTypeIcon('unknown')).toBe('insert_drive_file');
    });
  });

  describe('debounce', () => {
    it('should debounce function calls', async () => {
      vi.useFakeTimers();
      
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn();
      debouncedFn();
      debouncedFn();
      
      expect(mockFn).not.toHaveBeenCalled();
      
      vi.advanceTimersByTime(110);
      
      expect(mockFn).toHaveBeenCalledTimes(1);
      
      vi.useRealTimers();
    });
  });

  describe('highlightText', () => {
    it('should highlight text that matches query', () => {
      const text = 'This is a sample text';
      const query = 'sample';
      const highlighted = highlightText(text, query);
      
      expect(highlighted).toBe('This is a <span class="highlight">sample</span> text');
    });

    it('should handle multiple matches', () => {
      const text = 'Sample text with sample repeating';
      const query = 'sample';
      const highlighted = highlightText(text, query);
      
      expect(highlighted).toBe('<span class="highlight">Sample</span> text with <span class="highlight">sample</span> repeating');
    });

    it('should handle empty query', () => {
      const text = 'Sample text';
      const query = '';
      
      expect(highlightText(text, query)).toBe(text);
    });
  });

  describe('truncateText', () => {
    it('should truncate text to specified length', () => {
      const text = 'This is a very long text that should be truncated';
      
      expect(truncateText(text, 10)).toBe('This is a...');
    });

    it('should try to truncate at end of sentence near maxLength', () => {
      const text = 'This is a sentence. This is another sentence.';
      
      expect(truncateText(text, 20)).toBe('This is a sentence.');
    });

    it('should not truncate if text is shorter than maxLength', () => {
      const text = 'Short text';
      
      expect(truncateText(text, 20)).toBe('Short text');
    });
  });

  describe('extractContextAroundMatch', () => {
    it('should extract context around a match', () => {
      const text = 'This is a very long text and we want to extract the context around a specific word.';
      const match = 'specific';
      
      const result = extractContextAroundMatch(text, match, 10);
      
      expect(result).toBe('...xt around a specific word...');
    });

    it('should truncate if no match is found', () => {
      const text = 'This is a very long text.';
      const match = 'not-found';
      
      const result = extractContextAroundMatch(text, match, 10);
      
      expect(result).toBe('This is a very long text.');
    });
  });

  describe('calculateMatchPercentage', () => {
    it('should convert score to percentage', () => {
      expect(calculateMatchPercentage(0.75)).toBe(75);
      expect(calculateMatchPercentage(1)).toBe(100);
      expect(calculateMatchPercentage(0)).toBe(0);
    });
  });

  describe('cn', () => {
    it('should combine class names', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2');
      expect(cn('class1', { 'class2': true, 'class3': false })).toBe('class1 class2');
      expect(cn('class1', undefined, null, 'class2')).toBe('class1 class2');
    });
  });
});