// Initialize the Google API client
import { Document, DocumentMetadata } from '@/types';
import { formatBytes } from './utils';
import { processFile } from './documentProcessing';

// Google Drive API configuration
const API_KEY = process.env.GOOGLE_DRIVE_API_KEY;
const CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

// Google Drive API initialization status
let isInitialized = false;
let isAuthenticated = false;

// Document MIME types that can be processed
const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/markdown',
  'text/csv',
];

// Initialize Google API client
export async function initGoogleDriveAPI(): Promise<boolean> {
  if (isInitialized) return isAuthenticated;
  
  try {
    // Load the Google API client library
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google API client'));
      document.body.appendChild(script);
    });
    
    // Initialize the gapi client
    await new Promise<void>((resolve, reject) => {
      window.gapi.load('client:auth2', {
        callback: () => resolve(),
        onerror: () => reject(new Error('Failed to load Google Auth client')),
      });
    });
    
    // Initialize the auth client
    await window.gapi.client.init({
      apiKey: API_KEY,
      clientId: CLIENT_ID,
      scope: SCOPES,
      discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
    });
    
    // Check if user is already signed in
    isAuthenticated = window.gapi.auth2.getAuthInstance().isSignedIn.get();
    isInitialized = true;
    
    return isAuthenticated;
  } catch (error) {
    console.error('Error initializing Google Drive API:', error);
    return false;
  }
}

// Authenticate with Google
export async function authenticateWithGoogle(): Promise<boolean> {
  try {
    if (!isInitialized) {
      await initGoogleDriveAPI();
    }
    
    if (!isAuthenticated) {
      await window.gapi.auth2.getAuthInstance().signIn();
      isAuthenticated = window.gapi.auth2.getAuthInstance().isSignedIn.get();
    }
    
    return isAuthenticated;
  } catch (error) {
    console.error('Error authenticating with Google:', error);
    return false;
  }
}

// List files from Google Drive
export async function listDriveFiles(
  queryParams: {
    pageSize?: number;
    pageToken?: string;
    searchTerm?: string;
    mimeTypes?: string[];
  } = {}
): Promise<{
  files: Array<{
    id: string;
    name: string;
    mimeType: string;
    size: number;
    modifiedTime: string;
  }>;
  nextPageToken?: string;
}> {
  try {
    if (!isAuthenticated) {
      await authenticateWithGoogle();
    }
    
    const {
      pageSize = 100,
      pageToken,
      searchTerm = '',
      mimeTypes = SUPPORTED_MIME_TYPES,
    } = queryParams;
    
    let query = 'trashed = false';
    
    if (mimeTypes && mimeTypes.length > 0) {
      const mimeTypeQueries = mimeTypes.map(type => `mimeType = '${type}'`);
      query += ` and (${mimeTypeQueries.join(' or ')})`;
    }
    
    if (searchTerm) {
      query += ` and name contains '${searchTerm}'`;
    }
    
    const response = await window.gapi.client.drive.files.list({
      pageSize,
      pageToken,
      q: query,
      fields: 'files(id, name, mimeType, size, modifiedTime), nextPageToken',
    });
    
    return {
      files: response.result.files,
      nextPageToken: response.result.nextPageToken,
    };
  } catch (error) {
    console.error('Error listing Google Drive files:', error);
    throw error;
  }
}

// Download file from Google Drive
export async function downloadDriveFile(fileId: string): Promise<{
  arrayBuffer: ArrayBuffer;
  metadata: {
    name: string;
    mimeType: string;
    size: number;
    modifiedTime: string;
  };
}> {
  try {
    if (!isAuthenticated) {
      await authenticateWithGoogle();
    }
    
    // Get file metadata
    const metadataResponse = await window.gapi.client.drive.files.get({
      fileId,
      fields: 'name, mimeType, size, modifiedTime',
    });
    
    const metadata = metadataResponse.result;
    
    // Download file content
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${window.gapi.auth.getToken().access_token}`,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    
    return {
      arrayBuffer,
      metadata,
    };
  } catch (error) {
    console.error('Error downloading Google Drive file:', error);
    throw error;
  }
}

// Process file from Google Drive
export async function processGoogleDriveFile(
  fileId: string,
  onProgress: (progress: number) => void
): Promise<Document> {
  try {
    // Download file from Google Drive
    const { arrayBuffer, metadata } = await downloadDriveFile(fileId);
    onProgress(20);
    
    // Convert to File object for processing
    const file = new File(
      [arrayBuffer],
      metadata.name,
      { type: metadata.mimeType }
    );
    
    // Process the file
    const document = await processFile(file, (progress) => {
      // Scale progress to account for download step
      onProgress(20 + (progress * 0.8));
    });
    
    // Add Google Drive specific metadata
    document.source = 'google_drive';
    document.metadata = {
      ...document.metadata,
      googleDriveId: fileId,
      googleDriveModifiedTime: new Date(metadata.modifiedTime),
    };
    
    return document;
  } catch (error) {
    console.error('Error processing Google Drive file:', error);
    throw error;
  }
}
