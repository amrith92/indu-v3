# Document Search Engine: Complete Design and Implementation Guide

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
   - [High-Level Architecture](#21-high-level-architecture)
   - [Component Overview](#22-component-overview)
   - [Data Flow](#23-data-flow)
3. [Technical Stack](#3-technical-stack)
   - [Frontend Framework](#31-frontend-framework)
   - [WASM Components](#32-wasm-components)
   - [Storage Technology](#33-storage-technology)
   - [DuckDB Integration](#34-duckdb-integration)
   - [Vector Search](#35-vector-search)
4. [Component Design Specification](#4-component-design-specification)
   - [Document Processing Module](#41-document-processing-module)
   - [Vector Search Module](#42-vector-search-module)
   - [Multilingual Processing](#43-multilingual-processing)
   - [LangGraph Implementation](#44-langgraph-implementation)
   - [Google Drive Integration](#45-google-drive-integration)
5. [Database Schema](#5-database-schema)
   - [DuckDB Schema](#51-duckdb-schema)
   - [Vector Store Design](#52-vector-store-design)
   - [Persistence Strategy](#53-persistence-strategy)
6. [Query Processing Flow](#6-query-processing-flow)
   - [LangGraph Nodes](#61-langgraph-nodes)
   - [Query Understanding](#62-query-understanding)
   - [Search Process](#63-search-process)
   - [Result Processing](#64-result-processing)
7. [UI/UX Design](#7-uiux-design)
   - [Key User Flows](#71-key-user-flows)
   - [Component Structure](#72-component-structure)
   - [Responsive Design](#73-responsive-design)
8. [Performance Optimization](#8-performance-optimization)
   - [WASM Optimization](#81-wasm-optimization)
   - [Memory Management](#82-memory-management)
   - [Storage Efficiency](#83-storage-efficiency)
9. [Implementation Roadmap](#9-implementation-roadmap)
   - [Phase 1: Foundation](#91-phase-1-foundation)
   - [Phase 2: Core Functionality](#92-phase-2-core-functionality)
   - [Phase 3: Advanced Features](#93-phase-3-advanced-features)
   - [Phase 4: Optimization](#94-phase-4-optimization)
10. [Testing Strategy](#10-testing-strategy)
11. [Implementation Prompt](#11-implementation-prompt)

## 1. Executive Summary

This document outlines the complete design for a client-only web application that provides semantic document search capabilities. The application enables users to index documents from Google Drive or local uploads, perform natural language queries in multiple languages (including English, Hindi, and Hinglish), and receive contextually relevant results with exact document sections that answer the query intent.

Key features include:
- Client-side processing with WebAssembly (WASM) for performance
- Semantic understanding of document content through vector embeddings
- Multilingual query processing for English, Hindi, and mixed languages
- Conceptual modeling of document content using graph relationships
- Zero-server architecture for enhanced privacy and reduced infrastructure costs
- DuckDB integration for structured data storage and SQL querying capabilities
- LangGraph implementation for orchestrating complex query workflows

The design combines modern web technologies with advanced NLP techniques to create a powerful document search application that runs entirely in the browser.

## 2. System Architecture

### 2.1 High-Level Architecture

The system follows a client-only architecture where all processing, indexing, and search operations occur within the user's browser. This approach leverages modern web technologies such as WebAssembly, IndexedDB, DuckDB-WASM, and client-side ML models to deliver powerful functionality without server dependencies.

![System Architecture Diagram](data:image/svg+xml;base64,<svg-content>)

### 2.2 Component Overview

1. **Document Acquisition Layer**: Integrates with Google Drive API and handles local file uploads
2. **Document Processing Pipeline**: Parses, processes, and extracts features from documents 
3. **Knowledge Base**: Stores document content, metadata, embeddings, and concept graphs
4. **Query Processing Engine**: Interprets natural language queries and identifies relevant content
5. **User Interface Layer**: Provides search interface and document visualization

### 2.3 Data Flow

The data flow within the system follows these key paths:

1. **Document Import Flow**:
   - User selects documents from Google Drive or uploads local files
   - Document processor extracts text and structure
   - Text is chunked into semantic sections
   - Features (embeddings, entities, concepts) are extracted
   - All data is stored in the knowledge base (DuckDB + vector store)

2. **Query Processing Flow**:
   - User inputs a natural language query (English, Hindi, or mixed)
   - Query understanding module identifies language and intent
   - Query is expanded with related concepts
   - Vector embeddings are generated for the query
   - Retrieval combines vector similarity and keyword search
   - Results are ranked and the most relevant sections extracted
   - Related questions are generated
   - Final response with highlighted sections is presented

![Document Processing Data Flow](data:image/svg+xml;base64,<svg-content>)

## 3. Technical Stack

### 3.1 Frontend Framework

- **Core Framework**: React with TypeScript
- **State Management**: Zustand or Jotai (lightweight state management)
- **Styling**: TailwindCSS for utility-first styling
- **UI Components**: Radix UI/Headless UI for accessible components
- **Data Fetching**: React Query for caching and state synchronization
- **Build Tool**: Vite for fast development and optimized production builds

### 3.2 WASM Components

- **Document Processing**: 
  - Rust-based WASM modules for document parsing
  - PDF processing with pdf.js-extract compiled to WASM
  - Office document processing with mammoth.js and SheetJS

- **Vector Search**:
  - C++-based WASM for vector similarity search
  - HNSW implementation in hnswlib-wasm
  - Optimized for browser environments

- **NLP Components**:
  - Lightweight transformer models using Xenova/transformers.js
  - Language detection and processing modules
  - Entity recognition components

- **Graph Database**:
  - Rust-based graph database compiled to WASM
  - Optimized for concept relationships and traversal

### 3.3 Storage Technology

A hybrid storage approach is implemented:

- **DuckDB-WASM**: Primary storage for structured document data
  - Document metadata
  - Document structure
  - Text content
  - Relationship mapping

- **Custom Vector Store**: Optimized for embedding vectors
  - HNSW index for fast approximate nearest neighbor search
  - Quantized vectors for space efficiency
  - In-memory for query performance with persistence to DuckDB

- **IndexedDB**: For backing persistent storage
  - DuckDB database persistence
  - Original document storage

### 3.4 DuckDB Integration

- **duckdb-wasm**: WASM compilation of DuckDB for browser environments
- **Apache Arrow**: Efficient memory layout for columnar data
- **Web Worker**: Background processing thread for database operations
- **Persistence Management**: Regular snapshots to IndexedDB

### 3.5 Vector Search

- **hnswlib-wasm**: WASM port of hnswlib for ANN search
- **Vector Quantization**: Reduces embedding size
- **Hybrid Search**: Combines vector similarity with keyword search
- **Re-ranking**: Post-processes results for relevance

## 4. Component Design Specification

### 4.1 Document Processing Module

#### Purpose
Process various document formats, extract text and structure, and prepare them for indexing.

#### Implementation Libraries
- **pdf.js-extract** (WASM-compiled): Extracting text and structure from PDFs
- **mammoth.js** (WASM-compiled): Converting DOCX to HTML/text
- **SheetJS/xlsx** (WASM-compiled): Processing Excel files
- **markdown-it**: Parsing Markdown files

#### API Design
```typescript
interface DocumentProcessorModule {
  // Initialize the module with required configuration
  initialize(config: ProcessorConfig): Promise<void>;
  
  // Process a document and return structured content
  processDocument(
    fileBuffer: ArrayBuffer, 
    filename: string, 
    mimeType: string
  ): Promise<ProcessedDocument>;
  
  // Extract text content from a document
  extractText(
    fileBuffer: ArrayBuffer, 
    mimeType: string
  ): Promise<string>;
  
  // Extract document metadata
  extractMetadata(
    fileBuffer: ArrayBuffer, 
    mimeType: string
  ): Promise<DocumentMetadata>;
  
  // Free up resources
  dispose(): void;
}
```

### 4.2 Vector Search Module

#### Purpose
Efficient storage and retrieval of vector embeddings for semantic search.

#### Implementation Libraries
- **hnswlib-wasm**: WASM port of hnswlib for approximate nearest neighbor search
- **Xenova/transformers.js**: WASM-based transformer models for embedding generation

#### API Design
```typescript
interface VectorSearchModule {
  // Initialize the module with vector dimensions and options
  initialize(dimensions: number, options: VectorSearchOptions): Promise<void>;
  
  // Add vectors to the index
  addVectors(
    vectors: Float32Array[], 
    ids: string[]
  ): Promise<void>;
  
  // Build the search index
  buildIndex(options?: IndexBuildOptions): Promise<void>;
  
  // Search for nearest neighbors
  search(
    queryVector: Float32Array, 
    topK: number, 
    options?: SearchOptions
  ): Promise<SearchResult[]>;
  
  // Delete vectors from the index
  deleteVectors(ids: string[]): Promise<void>;
  
  // Export the index for persistence
  exportIndex(): Promise<ArrayBuffer>;
  
  // Import a previously exported index
  importIndex(indexData: ArrayBuffer): Promise<void>;
  
  // Free resources
  dispose(): void;
}
```

### 4.3 Multilingual Processing

#### Purpose
Handle multilingual queries and content with a focus on English, Hindi, and Hinglish.

#### Implementation Libraries
- **Xenova/transformers.js**: WASM-optimized transformer models
- **compromise**: Lightweight NLP for English text
- **Snowball**: WASM-compiled stemming library
- **FastText.js**: Lightweight word embeddings

#### API Design
```typescript
interface MultilingualProcessor {
  // Detect language of text
  detectLanguage(text: string): Promise<LanguageDetectionResult>;
  
  // Process Hindi/Hinglish text
  processHindiText(text: string): Promise<ProcessedText>;
  
  // Process English text
  processEnglishText(text: string): Promise<ProcessedText>;
  
  // Transliterate Hinglish to standardized form
  transliterateHinglish(text: string): Promise<string>;
  
  // Generate text embeddings
  generateEmbeddings(text: string, language?: string): Promise<Float32Array>;
  
  // Extract entities (names, places, etc.)
  extractEntities(text: string, language?: string): Promise<Entity[]>;
  
  // Extract keywords and key phrases
  extractKeyTerms(text: string, language?: string): Promise<KeyTerm[]>;
}
```

### 4.4 LangGraph Implementation

#### Purpose
Orchestrate the flow of query processing using a directed graph approach.

#### Implementation Libraries
- **LangChain.js**: Core framework for LangChain functionality
- **Langchain-core**: For essential components
- **@langchain/community**: For community extensions

#### Custom Implementation
```typescript
interface LangGraphNode {
  id: string;
  type: string;
  process: (input: any, context: GraphContext) => Promise<any>;
  nextNodes: Array<{
    nodeId: string;
    condition?: (output: any, context: GraphContext) => boolean;
  }>;
}

class QueryGraph {
  constructor(nodes: LangGraphNode[]);
  
  // Add a node to the graph
  addNode(node: LangGraphNode): void;
  
  // Execute the graph with a starting node
  execute(startNodeId: string, initialInput: any): Promise<any>;
  
  // Get the execution history
  getExecutionPath(): Array<string>;
  
  // Serialize the graph for visualization
  serializeGraph(): Record<string, any>;
}
```

![LangGraph Query Processing Flow](data:image/svg+xml;base64,<svg-content>)

### 4.5 Google Drive Integration

#### Purpose
Access and index documents from Google Drive.

#### Implementation Libraries
- **Google Drive API Client for JavaScript**
- **react-google-drive-picker**: UI component for Google Drive file selection

#### API Design
```typescript
interface GoogleDriveService {
  // Authenticate with Google
  authenticate(): Promise<boolean>;
  
  // Check if currently authenticated
  isAuthenticated(): boolean;
  
  // Get list of documents
  listDocuments(options?: ListOptions): Promise<DriveFile[]>;
  
  // Download document content
  downloadFile(fileId: string): Promise<ArrayBuffer>;
  
  // Get document metadata
  getFileMetadata(fileId: string): Promise<FileMetadata>;
  
  // Watch for changes to documents
  watchFiles(fileIds: string[]): Promise<void>;
  
  // Handle file change notification
  handleFileChange(callback: (fileId: string, changeType: ChangeType) => void): void;
  
  // Revoke authentication
  logout(): Promise<void>;
}
```

## 5. Database Schema

### 5.1 DuckDB Schema

```sql
-- Documents table
CREATE TABLE documents (
  id VARCHAR PRIMARY KEY,
  title VARCHAR,
  author VARCHAR,
  created_date TIMESTAMP,
  modified_date TIMESTAMP,
  page_count INTEGER,
  word_count INTEGER,
  language VARCHAR,
  source_type VARCHAR,
  source_path VARCHAR,
  indexed_at TIMESTAMP
);

-- Document content table
CREATE TABLE document_content (
  id VARCHAR PRIMARY KEY,
  document_id VARCHAR REFERENCES documents(id),
  full_text TEXT,
  content_vector BLOB -- Stored as compressed/serialized vector
);

-- Document sections table
CREATE TABLE document_sections (
  id VARCHAR PRIMARY KEY,
  document_id VARCHAR REFERENCES documents(id),
  title VARCHAR,
  level INTEGER,
  parent_id VARCHAR REFERENCES document_sections(id),
  start_index INTEGER,
  end_index INTEGER,
  content TEXT
);

-- Document elements table (paragraphs, headings, etc.)
CREATE TABLE document_elements (
  id VARCHAR PRIMARY KEY,
  document_id VARCHAR REFERENCES documents(id),
  section_id VARCHAR REFERENCES document_sections(id),
  page_number INTEGER,
  element_type VARCHAR,
  content TEXT,
  metadata JSON
);

-- Vector embeddings table
CREATE TABLE embeddings (
  id VARCHAR PRIMARY KEY,
  document_id VARCHAR REFERENCES documents(id),
  section_id VARCHAR REFERENCES document_sections(id),
  embedding BLOB,
  embedding_model VARCHAR
);

-- Concept table
CREATE TABLE concepts (
  id VARCHAR PRIMARY KEY,
  name VARCHAR,
  type VARCHAR,
  metadata JSON
);

-- Concept relationships table
CREATE TABLE concept_relationships (
  source_id VARCHAR REFERENCES concepts(id),
  target_id VARCHAR REFERENCES concepts(id),
  relationship_type VARCHAR,
  weight FLOAT,
  PRIMARY KEY (source_id, target_id, relationship_type)
);

-- Document-concept relationships
CREATE TABLE document_concepts (
  document_id VARCHAR REFERENCES documents(id),
  concept_id VARCHAR REFERENCES concepts(id),
  section_id VARCHAR REFERENCES document_sections(id),
  weight FLOAT,
  PRIMARY KEY (document_id, concept_id, section_id)
);
```

### 5.2 Vector Store Design

The vector store is implemented as a specialized in-memory structure optimized for similarity search:

1. **Core Data Structure**:
   - HNSW graph for efficient approximate nearest neighbor search
   - Quantized vectors to reduce memory footprint
   - ID mapping for fast retrieval of document sections

2. **Persistence Strategy**:
   - Serialization to binary format
   - Storage in DuckDB BLOB column
   - Incremental updates to avoid full rebuilds

3. **Implementation**:
   ```typescript
   class VectorStore {
     private index: HNSWIndex;
     private idMap: Map<number, string>;
     
     constructor(dimensions: number, options?: VectorStoreOptions);
     
     // Add vectors to the store
     add(vectors: Float32Array[], ids: string[]): void;
     
     // Build search index
     buildIndex(): Promise<void>;
     
     // Search for similar vectors
     search(queryVector: Float32Array, topK: number): SearchResult[];
     
     // Export index for persistence
     serialize(): ArrayBuffer;
     
     // Import from serialized data
     deserialize(data: ArrayBuffer): void;
   }
   ```

### 5.3 Persistence Strategy

The persistence strategy for DuckDB uses a combination of approaches:

1. **Worker-Based Processing**:
   - Run DuckDB in a separate worker thread
   - Prevent UI blocking during database operations
   - Message-based communication protocol

2. **Automatic Persistence**:
   - Regular snapshots to IndexedDB
   - Transaction count tracking for auto-save
   - Pre-unload saving to prevent data loss

3. **Serialization**:
   ```typescript
   class DuckDBPersistenceManager {
     private db: DuckDBAsyncConnection;
     
     // Save database to IndexedDB
     async saveToIndexedDB(): Promise<void>;
     
     // Load database from IndexedDB
     async loadFromIndexedDB(): Promise<ArrayBuffer | null>;
     
     // Export database for download
     async exportForDownload(): Promise<Blob>;
     
     // Import database from uploaded file
     async importFromUpload(file: File): Promise<void>;
   }
   ```

## 6. Query Processing Flow

### 6.1 LangGraph Nodes

The query processing flow is implemented as a directed graph with specialized nodes:

1. **Query Analyzer**: Parses and classifies the query
2. **Language Detector**: Identifies query language
3. **Transliteration & Normalization**: Handles Hindi/Hinglish
4. **Intent Classifier**: Determines query intent
5. **Conceptual Expansion**: Expands query with related concepts
6. **Retriever**: Fetches relevant documents using hybrid search
7. **Content Ranker**: Ranks and filters results
8. **Answer Extractor**: Identifies exact answers in content
9. **Section Identifier**: Locates the specific document sections
10. **Related Questions Generator**: Creates contextual follow-up questions

### 6.2 Query Understanding

The query understanding process involves:

1. **Language Identification**:
   - Detect if query is in English, Hindi, or mixed (Hinglish)
   - Apply language-specific processing

2. **Query Normalization**:
   - Transliterate Hinglish to consistent form
   - Correct spelling errors
   - Standardize query structure

3. **Intent Recognition**:
   - Classify query type (factual, procedural, conceptual)
   - Identify expected answer type
   - Extract key entities and relationships

4. **Semantic Enrichment**:
   - Expand query with synonyms and related terms
   - Map to concept graph for broader understanding
   - Generate query embedding for semantic search

### 6.3 Search Process

The search process combines multiple approaches:

1. **Vector Search**:
   - Generate query embedding
   - Find similar document sections using HNSW index
   - Score based on vector similarity

2. **Keyword Search**:
   - Extract key terms from query
   - Perform text search in DuckDB
   - Apply BM25-like scoring

3. **Concept Search**:
   - Map query to concept graph
   - Traverse related concepts
   - Find documents connected to relevant concepts

4. **Hybrid Ranking**:
   - Combine scores from different search methods
   - Apply relevance boosting factors
   - Re-rank based on document structure and quality

### 6.4 Result Processing

After retrieving candidate document sections:

1. **Answer Extraction**:
   - Identify exact passages that answer the query
   - Extract relevant sentences or paragraphs
   - Determine confidence scores

2. **Context Building**:
   - Add surrounding context for better understanding
   - Include document metadata for attribution
   - Link to original document location

3. **Related Question Generation**:
   - Analyze document content for related topics
   - Generate natural follow-up questions
   - Filter for relevance and diversity

4. **Response Formatting**:
   - Structure results for clear presentation
   - Highlight exact answer passages
   - Include document attribution and links

## 7. UI/UX Design

### 7.1 Key User Flows

1. **Document Import Flow**:
   - Google Drive authorization
   - Document selection
   - Permission confirmation
   - Processing status feedback
   - Import completion notification

2. **Search Flow**:
   - Query input (text/voice)
   - Progressive results display
   - Answer highlighting
   - Context exploration
   - Follow-up question selection

3. **Document Exploration Flow**:
   - Result selection
   - Document navigation
   - In-document search
   - Related content discovery
   - Content saving/sharing

### 7.2 Component Structure

Core UI components include:

1. **Search Interface**:
   - Natural language search bar
   - Query suggestions
   - Language toggle (if needed for input)
   - Recent queries list

2. **Results Display**:
   - Direct answer cards
   - Document section previews
   - Highlighted matches
   - Relevance indicators
   - Source attribution

3. **Document Viewer**:
   - Formatted document display
   - Section navigation
   - Text highlighting
   - Contextual search
   - Original format viewing option

4. **Library Management**:
   - Document list view
   - Import status indicators
   - Filtering and sorting options
   - Batch operations
   - Storage usage indicators

5. **Related Content Panel**:
   - Similar questions
   - Related document sections
   - Topic exploration
   - Concept visualization

### 7.3 Responsive Design

The UI adapts to different device formats:

1. **Desktop**:
   - Multi-column layout
   - Side-by-side document and results view
   - Extensive filtering options
   - Keyboard shortcuts

2. **Tablet**:
   - Collapsible panels
   - Touch-optimized controls
   - Simplified layout
   - Gesture navigation

3. **Mobile**:
   - Single column layout
   - Bottom sheet for advanced options
   - Streamlined results view
   - Voice input prioritization

## 8. Performance Optimization

### 8.1 WASM Optimization

1. **Module Loading Strategy**:
   - Lazy loading of WASM modules
   - Parallel compilation where possible
   - Module caching in IndexedDB
   - Streaming instantiation for large modules

2. **Memory Management**:
   - Explicit memory allocation/deallocation
   - Reuse of memory buffers
   - Strategic garbage collection hints
   - Monitor memory usage with `performance.memory`

3. **Compute Optimization**:
   - SIMD operations where supported
   - Multi-threading with shared memory
   - Chunk-based processing for large documents
   - Prioritization of critical path operations

### 8.2 Memory Management

1. **Document Processing**:
   - Stream processing for large documents
   - Discard intermediate results after use
   - Targeted garbage collection triggers
   - Memory usage monitoring and adaptive behavior

2. **Index Management**:
   - Quantized vectors to reduce memory footprint
   - Progressive loading of index segments
   - Efficient data structures for sparse operations
   - Explicit cleanup of unused indexes

3. **UI Virtualization**:
   - Virtual scrolling for long lists
   - Lazy rendering of complex components
   - Image and resource optimization
   - Deferred loading of non-critical content

### 8.3 Storage Efficiency

1. **DuckDB Optimization**:
   - Appropriate index creation
   - Query optimization
   - Compression of large text fields
   - Strategic partitioning of large tables

2. **IndexedDB Management**:
   - Chunked storage of large objects
   - Periodic database compaction
   - Version management for schema upgrades
   - Storage quota monitoring

3. **Vector Compression**:
   - Scalar quantization for embeddings
   - Product quantization for large vector collections
   - Binary encodings where appropriate
   - Dimension reduction techniques

## 9. Implementation Roadmap

### 9.1 Phase 1: Foundation

**Duration: 2-3 weeks**

1. **Project Setup**:
   - Initialize React/TypeScript project with Vite
   - Set up DuckDB-WASM integration
   - Configure build toolchain
   - Establish testing framework

2. **Core Document Processing**:
   - Basic document upload functionality
   - Text extraction from PDF and DOCX
   - Simple document metadata storage
   - Preliminary UI for document management

3. **Storage Layer**:
   - Basic DuckDB schema implementation
   - IndexedDB persistence strategy
   - Document storage and retrieval
   - Export/import functionality

### 9.2 Phase 2: Core Functionality

**Duration: 3-4 weeks**

1. **Enhanced Document Processing**:
   - WASM-based document parsers
   - Structure extraction
   - Section identification
   - Extended metadata extraction

2. **Basic Search**:
   - Text-based search implementation
   - Simple query parsing
   - Result highlighting
   - Basic result ranking

3. **Google Drive Integration**:
   - Authentication setup
   - Document listing
   - File download
   - Metadata synchronization

4. **UI Development**:
   - Search interface
   - Results display
   - Document viewer
   - Basic responsive design

### 9.3 Phase 3: Advanced Features

**Duration: 4-5 weeks**

1. **Vector Search Implementation**:
   - Embedding generation
   - HNSW index creation
   - Vector similarity search
   - Hybrid search approach

2. **Multilingual Support**:
   - Language detection
   - Hindi text processing
   - Hinglish transliteration
   - Cross-language search

3. **Concept Graph**:
   - Entity extraction
   - Concept mapping
   - Relationship building
   - Graph-based search

4. **LangGraph Integration**:
   - Query understanding
   - Intent classification
   - Graph-based query processing
   - Answer extraction

### 9.4 Phase 4: Optimization

**Duration: 2-3 weeks**

1. **Performance Tuning**:
   - WASM optimization
   - Memory management
   - Storage efficiency
   - UI responsiveness

2. **Advanced UI Features**:
   - Related questions
   - Concept visualization
   - Enhanced document viewer
   - Voice input

3. **Testing & Refinement**:
   - Cross-browser testing
   - Performance benchmarking
   - User experience testing
   - Edge case handling

4. **Final Polishing**:
   - Documentation
   - Error handling
   - Progressive enhancement
   - Accessibility improvements

## 10. Testing Strategy

1. **Unit Testing**:
   - Test individual components and functions
   - Mock external dependencies
   - Test different document formats
   - Verify multilingual functionality

2. **Integration Testing**:
   - Test component interactions
   - Verify data flow through the system
   - Test search and indexing pipeline
   - Validate DuckDB integration

3. **Performance Testing**:
   - Measure document processing times
   - Benchmark search performance
   - Test with large document collections
   - Monitor memory usage

4. **Browser Compatibility**:
   - Test across major browsers (Chrome, Firefox, Safari, Edge)
   - Verify WASM support and fallbacks
   - Test on different devices and screen sizes
   - Validate offline functionality

5. **User Experience Testing**:
   - Validate core user flows
   - Test multilingual search scenarios
   - Verify result relevance and quality
   - Test with different query types

## 11. Implementation Prompt

### Document Search Engine Implementation Prompt

#### Overview
You are tasked with implementing a client-only web application for semantic document search. The application will index documents from Google Drive or local uploads, allow natural language queries in multiple languages, and return the exact relevant document sections that answer the query.

#### Key Requirements
1. Client-side processing with WebAssembly (WASM)
2. Document indexing from Google Drive and local uploads
3. Natural language search in English, Hindi, and Hinglish
4. Semantic understanding of document content
5. DuckDB integration for structured data storage
6. Vector search for semantic similarity
7. Zero-server architecture for privacy and reduced infrastructure

#### Implementation Approach

1. **Initial Setup**
   - Create a new project using Vite with React and TypeScript
   - Configure TailwindCSS for styling
   - Set up ESLint and Prettier for code quality
   - Initialize Git repository with proper structure

2. **DuckDB Integration**
   - Install and configure duckdb-wasm package
   - Set up Web Worker for background database operations
   - Implement the database schema as specified in Section 5.1
   - Create utility functions for database operations
   - Implement persistence strategy using IndexedDB

   ```javascript
   // Example DuckDB initialization
   import * as duckdb from '@duckdb/duckdb-wasm';
   
   class DocumentDatabase {
     private db: AsyncDuckDB;
     private conn: AsyncDuckDBConnection;
     
     async initialize() {
       const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
       const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);
       
       this.db = new duckdb.AsyncDuckDB(bundle);
       await this.db.instantiate();
       
       this.conn = await this.db.connect();
       
       // Initialize schema
       await this.createSchema();
     }
     
     // Additional methods...
   }
   ```

3. **Document Processing Implementation**
   - Implement file upload component with drag-and-drop support
   - Set up WASM modules for document parsing (PDF, DOCX, etc.)
   - Create text extraction pipeline
   - Implement document chunking and section identification
   - Store processed documents in DuckDB

4. **Google Drive Integration**
   - Set up Google OAuth authentication
   - Implement Google Drive API client
   - Create document selection interface
   - Build synchronization logic for document updates

5. **Vector Search Implementation**
   - Integrate transformers.js for embedding generation
   - Implement HNSW index using hnswlib-wasm
   - Create vector store with persistence to DuckDB
   - Build hybrid search combining vector and keyword approaches

   ```javascript
   // Example Vector Search implementation
   import { Pipeline } from '@xenova/transformers';
   
   class EmbeddingGenerator {
     private model: Pipeline;
     
     async initialize() {
       this.model = await Pipeline.fromPretrained(
         'Xenova/all-MiniLM-L6-v2',
         { quantized: true }
       );
     }
     
     async generateEmbedding(text: string): Promise<Float32Array> {
       const result = await this.model.embed(text);
       return result.data;
     }
   }
   ```

6. **Multilingual Processing**
   - Implement language detection for queries
   - Create Hindi and Hinglish processing modules
   - Build transliteration functionality
   - Ensure cross-language search capabilities

7. **LangGraph Implementation**
   - Create a custom implementation of LangGraph
   - Build nodes for query understanding, retrieval, and processing
   - Implement the execution engine for the graph
   - Connect to search and result processing

   ```javascript
   // Example LangGraph node
   class QueryAnalyzerNode implements LangGraphNode {
     id = 'query-analyzer';
     type = 'processor';
     
     async process(input: string, context: GraphContext) {
       // Analyze query
       const language = await detectLanguage(input);
       const intent = await classifyIntent(input);
       const entities = await extractEntities(input);
       
       // Update context
       context.updateState({
         queryLanguage: language,
         queryIntent: intent,
         queryEntities: entities
       });
       
       return { language, intent, entities };
     }
     
     nextNodes = [
       {
         nodeId: 'language-processor',
         condition: (output, context) => true
       }
     ];
   }
   ```

8. **UI Implementation**
   - Build search interface with auto-complete and language detection
   - Create results display with section highlighting
   - Implement document viewer with navigation
   - Build related questions panel
   - Design responsive layout for all device sizes

   ```javascript
   // Example Search Component
   function SearchBar({ onSearch }) {
     const [query, setQuery] = useState('');
     const [language, setLanguage] = useState('auto');
     const [suggestions, setSuggestions] = useState([]);
     
     const handleQueryChange = async (e) => {
       const value = e.target.value;
       setQuery(value);
       
       if (value.length > 2) {
         // Get query suggestions
         const detectedLang = await detectLanguage(value);
         setLanguage(detectedLang);
         
         const newSuggestions = await getSuggestions(value, detectedLang);
         setSuggestions(newSuggestions);
       } else {
         setSuggestions([]);
       }
     };
     
     const handleSearch = () => {
       onSearch({ query, language });
     };
     
     return (
       <div className="search-container">
         <input
           type="text"
           value={query}
           onChange={handleQueryChange}
           placeholder="Search documents in any language..."
           className="search-input"
         />
         <button onClick={handleSearch} className="search-button">
           Search
         </button>
         
         {suggestions.length > 0 && (
           <ul className="suggestions-list">
             {suggestions.map((suggestion, index) => (
               <li
                 key={index}
                 onClick={() => {
                   setQuery(suggestion);
                   handleSearch();
                 }}
               >
                 {suggestion}
               </li>
             ))}
           </ul>
         )}
       </div>
     );
   }
   ```

9. **Performance Optimization**
   - Implement lazy loading of WASM modules
   - Set up Web Workers for background processing
   - Add virtualization for long lists
   - Optimize memory usage with proper cleanup
   - Implement progressive loading of results

   ```javascript
   // Example WASM lazy loading
   class WasmModuleLoader {
     private modules = new Map<string, any>();
     private loading = new Map<string, Promise<any>>();
     
     async loadModule(name: string, url: string): Promise<any> {
       // Return cached module if available
       if (this.modules.has(name)) {
         return this.modules.get(name);
       }
       
       // Return existing promise if already loading
       if (this.loading.has(name)) {
         return this.loading.get(name);
       }
       
       // Start loading
       const loadPromise = (async () => {
         try {
           // Check IndexedDB cache first
           const cachedModule = await this.loadFromCache(name);
           if (cachedModule) {
             const instance = await WebAssembly.instantiate(cachedModule);
             const module = instance.exports;
             this.modules.set(name, module);
             return module;
           }
           
           // Load from URL
           const response = await fetch(url);
           const wasmBuffer = await response.arrayBuffer();
           
           // Store in cache
           await this.storeInCache(name, wasmBuffer);
           
           // Instantiate
           const instance = await WebAssembly.instantiate(wasmBuffer);
           const module = instance.exports;
           
           this.modules.set(name, module);
           return module;
         } finally {
           this.loading.delete(name);
         }
       })();
       
       this.loading.set(name, loadPromise);
       return loadPromise;
     }
     
     private async loadFromCache(name: string): Promise<ArrayBuffer | null> {
       // Implementation of IndexedDB cache loading
     }
     
     private async storeInCache(name: string, buffer: ArrayBuffer): Promise<void> {
       // Implementation of IndexedDB cache storage
     }
   }
   ```

10. **Testing and Debugging**
    - Set up Jest for unit testing
    - Configure Cypress for end-to-end testing
    - Implement error handling and logging
    - Create performance monitoring tools
    - Test with various document types and languages

11. **Final Polish**
    - Add loading indicators and progress feedback
    - Implement error recovery mechanisms
    - Add helpful onboarding and empty states
    - Optimize for accessibility
    - Perform final performance audits

#### Detailed Implementation Guidelines

##### Document Processing Pipeline

1. **Upload Handling**:
   - Accept files via drag-and-drop or file picker
   - Support batch uploading
   - Validate file types (PDF, DOCX, XLSX, TXT, MD, HTML)
   - Show progress indicators during upload

2. **Document Parsing**:
   - Use appropriate parser based on file type
   - Extract text, structure, and metadata
   - Preserve formatting where relevant
   - Handle errors gracefully

3. **Text Processing**:
   - Normalize text (handle encoding, special characters)
   - Split into paragraphs and sentences
   - Detect language for multilingual documents
   - Apply language-specific processing

4. **Chunking Strategy**:
   - Create semantically meaningful chunks
   - Maintain hierarchical structure
   - Use headers as section boundaries
   - Ensure overlapping context between chunks

5. **Feature Extraction**:
   - Generate embeddings for each chunk
   - Extract key entities and concepts
   - Identify relationships between concepts
   - Store all features in the database

##### Query Processing Pipeline

1. **Query Preprocessing**:
   - Normalize query text
   - Detect language (English, Hindi, Hinglish)
   - Apply language-specific processing
   - Correct spelling errors and normalize transliteration

2. **Intent Classification**:
   - Determine query type (factual, conceptual, procedural)
   - Identify expected answer format
   - Detect filtering requirements
   - Recognize special query patterns

3. **Search Strategy**:
   - Generate query embedding
   - Perform vector similarity search
   - Execute keyword-based search as fallback
   - Combine results with weighted scoring

4. **Result Processing**:
   - Extract most relevant passages
   - Highlight exact answer spans
   - Provide sufficient context
   - Generate related questions

##### DuckDB Usage Guidelines

1. **Schema Design**:
   - Follow the schema in Section 5.1
   - Create appropriate indices for frequent queries
   - Use appropriate data types for efficiency
   - Consider partitioning for large collections

2. **Query Optimization**:
   - Use prepared statements for repeated queries
   - Limit result sets to necessary columns
   - Implement pagination for large results
   - Use SQL features efficiently

3. **Worker-Based Processing**:
   - Run DuckDB in a dedicated worker
   - Use structured message passing
   - Implement retry mechanisms for failures
   - Handle worker lifecycle properly

4. **Persistence Strategy**:
   - Save database state regularly
   - Implement backup and restore functionality
   - Handle storage limitations gracefully
   - Provide clear storage usage indicators

##### WASM Best Practices

1. **Module Loading**:
   - Load modules asynchronously
   - Cache compiled modules
   - Implement versioning for updates
   - Provide fallbacks where possible

2. **Memory Management**:
   - Clean up resources explicitly
   - Monitor memory usage
   - Implement chunking for large documents
   - Use streaming where appropriate

3. **Error Handling**:
   - Graceful degradation on WASM failures
   - Provide meaningful error messages
   - Implement recovery mechanisms
   - Log detailed diagnostics for debugging

4. **Performance**:
   - Use SIMD where available
   - Implement multi-threading for intensive tasks
   - Profile hot paths and optimize
   - Balance between memory usage and performance

#### Implementation Details

The project will use the following folder structure:

```
src/
├── assets/            # Static assets
├── components/        # UI components
│   ├── search/        # Search-related components
│   ├── documents/     # Document-related components
│   ├── results/       # Results display components
│   └── common/        # Shared components
├── hooks/             # React hooks
├── services/          # Core services
│   ├── db/            # DuckDB-related code
│   ├── document/      # Document processing
│   ├── search/        # Search functionality
│   ├── drive/         # Google Drive integration
│   └── language/      # Language processing
├── wasm/              # WASM module wrappers
│   ├── document/      # Document processing WASM
│   ├── vector/        # Vector search WASM
│   └── language/      # NLP WASM modules
├── workers/           # Web Worker implementations
│   ├── db-worker.js   # DuckDB worker
│   └── process-worker.js # Document processing worker
├── types/             # TypeScript type definitions
├── utils/             # Utility functions
└── lib/               # Third-party library adapters
```

Key files and their responsibilities:

1. `src/services/db/DuckDBService.ts`:
   - Initialize DuckDB instance
   - Execute database operations
   - Handle persistence

2. `src/services/document/DocumentProcessor.ts`:
   - Coordinate document processing pipeline
   - Manage different document formats
   - Handle chunking and feature extraction

3. `src/services/search/SearchEngine.ts`:
   - Implement hybrid search functionality
   - Coordinate vector and keyword search
   - Handle result ranking and processing

4. `src/wasm/vector/VectorStore.ts`:
   - Wrap HNSW implementation
   - Manage vector indexing and search
   - Handle serialization for persistence

5. `src/services/language/MultilingualProcessor.ts`:
   - Implement language detection
   - Handle Hindi and Hinglish processing
   - Generate embeddings for different languages

6. `src/workers/db-worker.js`:
   - Run DuckDB in isolated context
   - Handle database operations
   - Manage background persistence

7. `src/components/search/SearchBar.tsx`:
   - Implement search interface
   - Handle query suggestions
   - Support multilingual input

8. `src/components/results/ResultsList.tsx`:
   - Display search results
   - Highlight relevant content
   - Show document context

#### Additional Resources

1. **Libraries and Tools**:
   - React + TypeScript: https://react.dev/
   - DuckDB-WASM: https://github.com/duckdb/duckdb-wasm
   - Transformers.js: https://huggingface.co/docs/transformers.js/
   - PDF.js: https://mozilla.github.io/pdf.js/
   - HNSW.js: https://github.com/nmslib/hnswlib

2. **References**:
   - Vector similarity search: https://www.pinecone.io/learn/hnsw/
   - WebAssembly best practices: https://developer.mozilla.org/en-US/docs/WebAssembly/JavaScript_interface
   - SQL indexing strategies: https://duckdb.org/docs/sql/indexes

3. **Design Patterns**:
   - Web Workers communication: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers
   - React performance optimization: https://react.dev/learn/react-performance
   - WASM memory management: https://developer.mozilla.org/en-US/docs/WebAssembly/Memory

#### Evaluation Criteria

The implementation will be evaluated based on:

1. **Functionality**: Does it meet all the requirements?
2. **Performance**: Is it fast and responsive, even with large document collections?
3. **Usability**: Is the interface intuitive and accessible?
4. **Code Quality**: Is the code well-structured, maintainable, and documented?
5. **Browser Compatibility**: Does it work across modern browsers?
6. **Error Handling**: Does it gracefully handle edge cases and errors?
7. **Multilingual Support**: Does it effectively support English, Hindi, and Hinglish?
8. **Privacy**: Does it maintain all data client-side without server dependencies?

#### Deliverables

1. Source code repository with complete implementation
2. Documentation of the architecture and implementation details
3. User guide explaining features and usage
4. Test suite covering key functionality
5. Performance benchmarks and analysis
6. Deployment-ready build

This implementation will create a powerful, privacy-focused document search engine that runs entirely in the browser, leveraging modern web technologies to provide semantic search capabilities comparable to server-based solutions.