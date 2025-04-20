import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function getFileExtension(filename: string): string {
  return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2).toLowerCase();
}

export function getFileTypeIcon(fileType: string): string {
  switch (fileType.toLowerCase()) {
    case 'pdf':
      return 'picture_as_pdf';
    case 'doc':
    case 'docx':
      return 'description';
    case 'xls':
    case 'xlsx':
      return 'table_chart';
    case 'ppt':
    case 'pptx':
      return 'slideshow';
    case 'txt':
      return 'text_snippet';
    case 'csv':
      return 'view_list';
    case 'zip':
    case 'rar':
      return 'folder_zip';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
      return 'image';
    default:
      return 'insert_drive_file';
  }
}

export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return function(...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function highlightText(text: string, query: string): string {
  if (!query || !text) return text;
  
  const queryTerms = query.trim().toLowerCase().split(/\s+/).filter(term => term.length > 2);
  
  if (queryTerms.length === 0) return text;
  
  let result = text;
  
  for (const term of queryTerms) {
    const regex = new RegExp(`(${term})`, 'gi');
    result = result.replace(regex, '<span class="highlight">$1</span>');
  }
  
  return result;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  
  // Try to find end of sentence near max length
  const endOfSentence = text.indexOf('. ', maxLength - 20);
  if (endOfSentence > 0 && endOfSentence < maxLength + 20) {
    return text.substring(0, endOfSentence + 1);
  }
  
  return text.substring(0, maxLength) + '...';
}

export function extractContextAroundMatch(
  text: string, 
  match: string, 
  contextSize: number = 150
): string {
  const matchIndex = text.toLowerCase().indexOf(match.toLowerCase());
  
  if (matchIndex === -1) return truncateText(text, contextSize * 2);
  
  const start = Math.max(0, matchIndex - contextSize);
  const end = Math.min(text.length, matchIndex + match.length + contextSize);
  
  let excerpt = text.substring(start, end);
  
  // Add ellipsis if we've truncated the text
  if (start > 0) excerpt = '...' + excerpt;
  if (end < text.length) excerpt = excerpt + '...';
  
  return excerpt;
}

export function calculateMatchPercentage(score: number): number {
  // Assuming scores range from 0 to 1, where 1 is a perfect match
  return Math.round(score * 100);
}
