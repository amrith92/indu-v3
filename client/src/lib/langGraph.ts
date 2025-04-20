import { SearchResult } from '@/types';
import { keywordSearch } from './duckdb';
import { search as vectorSearch } from './vectorStore';
import { detectLanguage, extractKeywords, generateEmbeddings } from './languageProcessing';

// Define the graph nodes and types
type Context = {
  query: string;
  originalQuery: string;
  language: string;
  isDualSearch: boolean;
  vectorResults: SearchResult[];
  keywordResults: SearchResult[];
  combinedResults: SearchResult[];
  keywords: string[];
  errorMessage?: string;
};

type NodeFunction = (context: Context) => Promise<Context>;

type Node = {
  id: string;
  process: NodeFunction;
  next: string[];
};

// Graph nodes
const nodes: Record<string, Node> = {
  // Start node
  start: {
    id: 'start',
    process: async (context) => {
      // Store original query
      context.originalQuery = context.query;
      return context;
    },
    next: ['detectLanguage'],
  },
  
  // Detect language of the query
  detectLanguage: {
    id: 'detectLanguage',
    process: async (context) => {
      try {
        const detection = await detectLanguage(context.query);
        context.language = detection.isHinglish ? 'hinglish' : 
                          detection.isHindi ? 'hindi' : 'english';
      } catch (error) {
        console.error('Language detection error:', error);
        context.language = 'english'; // Default to English
      }
      return context;
    },
    next: ['extractKeywords'],
  },
  
  // Extract keywords from the query
  extractKeywords: {
    id: 'extractKeywords',
    process: async (context) => {
      try {
        context.keywords = await extractKeywords(context.query);
      } catch (error) {
        console.error('Keyword extraction error:', error);
        context.keywords = context.query.split(/\s+/).filter(w => w.length > 2);
      }
      return context;
    },
    next: ['executeVectorSearch', 'executeKeywordSearch'],
  },
  
  // Execute vector search
  executeVectorSearch: {
    id: 'executeVectorSearch',
    process: async (context) => {
      try {
        context.vectorResults = await vectorSearch(context.query, 20);
      } catch (error) {
        console.error('Vector search error:', error);
        context.vectorResults = [];
        context.errorMessage = 'Vector search failed';
      }
      return context;
    },
    next: ['waitForDualSearch'],
  },
  
  // Execute keyword search
  executeKeywordSearch: {
    id: 'executeKeywordSearch',
    process: async (context) => {
      try {
        context.keywordResults = await keywordSearch(context.query, 20);
      } catch (error) {
        console.error('Keyword search error:', error);
        context.keywordResults = [];
      }
      return context;
    },
    next: ['waitForDualSearch'],
  },
  
  // Wait for both searches to complete and combine results
  waitForDualSearch: {
    id: 'waitForDualSearch',
    process: async (context) => {
      // This node will be executed twice (once for each search)
      // Only proceed when both results are available
      if (!context.isDualSearch && 
          context.vectorResults && 
          context.keywordResults) {
        context.isDualSearch = true;
        
        // Combine and rank results
        context.combinedResults = rankAndCombineResults(
          context.vectorResults, 
          context.keywordResults
        );
      }
      
      return context;
    },
    next: ['end'],
  },
  
  // End node
  end: {
    id: 'end',
    process: async (context) => {
      return context;
    },
    next: [],
  },
};

// Execute the search graph
export async function executeSearchGraph(query: string): Promise<SearchResult[]> {
  let context: Context = {
    query,
    originalQuery: query,
    language: '',
    isDualSearch: false,
    vectorResults: [],
    keywordResults: [],
    combinedResults: [],
    keywords: [],
  };
  
  let currentNodeId = 'start';
  const visitedNodes = new Set<string>();
  
  // Execute the graph
  while (currentNodeId) {
    const node = nodes[currentNodeId];
    
    if (!node) {
      console.error(`Node ${currentNodeId} not found`);
      break;
    }
    
    try {
      // Process the current node
      context = await node.process(context);
      visitedNodes.add(currentNodeId);
      
      // Determine next node
      let nextNodeId: string | null = null;
      
      if (currentNodeId === 'waitForDualSearch') {
        // Special case for wait node - only proceed when both searches complete
        if (context.isDualSearch) {
          nextNodeId = 'end';
        } else {
          // Wait for other branch to complete
          break;
        }
      } else if (node.next.length === 1) {
        // Single next node
        nextNodeId = node.next[0];
      } else if (node.next.length > 1) {
        // Multiple branches - execute all branches in parallel
        
        for (const branchNodeId of node.next) {
          if (!visitedNodes.has(branchNodeId)) {
            // Start a new execution branch
            executeNodeBranch(branchNodeId, {...context})
              .then(branchContext => {
                // Merge results back to main context
                context = {
                  ...context,
                  ...branchContext,
                };
                
                // Continue graph execution from wait node
                if (visitedNodes.has('executeVectorSearch') && 
                    visitedNodes.has('executeKeywordSearch') && 
                    !visitedNodes.has('waitForDualSearch')) {
                  executeNodeBranch('waitForDualSearch', context);
                }
              });
          }
        }
        
        // Break the main execution since we've spawned parallel branches
        break;
      }
      
      currentNodeId = nextNodeId || '';
    } catch (error) {
      console.error(`Error executing node ${currentNodeId}:`, error);
      context.errorMessage = `Error in ${currentNodeId}: ${error}`;
      currentNodeId = 'end';
    }
  }
  
  // If execution finished with combined results, return them
  if (context.combinedResults && context.combinedResults.length > 0) {
    return context.combinedResults;
  }
  
  // Otherwise, return vector results if available
  if (context.vectorResults && context.vectorResults.length > 0) {
    return context.vectorResults;
  }
  
  // Fall back to keyword results
  return context.keywordResults || [];
}

// Execute a single branch of the graph
async function executeNodeBranch(startNodeId: string, context: Context): Promise<Context> {
  let currentNodeId = startNodeId;
  let currentContext = {...context};
  
  while (currentNodeId) {
    const node = nodes[currentNodeId];
    
    if (!node) {
      console.error(`Node ${currentNodeId} not found`);
      break;
    }
    
    try {
      // Process the current node
      currentContext = await node.process(currentContext);
      
      // Move to next node if it's a linear path
      if (node.next.length === 1 && node.next[0] !== 'waitForDualSearch') {
        currentNodeId = node.next[0];
      } else {
        break;
      }
    } catch (error) {
      console.error(`Error executing branch node ${currentNodeId}:`, error);
      break;
    }
  }
  
  return currentContext;
}

// Combine and rank results from vector and keyword searches
function rankAndCombineResults(
  vectorResults: SearchResult[],
  keywordResults: SearchResult[]
): SearchResult[] {
  // Create a map to deduplicate by chunkId
  const resultMap = new Map<string, SearchResult>();
  
  // Add vector results with a weight of 0.7
  vectorResults.forEach(result => {
    resultMap.set(result.chunkId, {
      ...result,
      score: result.score * 0.7,
    });
  });
  
  // Add or blend in keyword results with a weight of 0.3
  keywordResults.forEach(result => {
    if (resultMap.has(result.chunkId)) {
      // Blend scores
      const existing = resultMap.get(result.chunkId)!;
      existing.score = existing.score + (result.score * 0.3);
      existing.matchPercentage = Math.round(existing.score * 100);
      resultMap.set(result.chunkId, existing);
    } else {
      resultMap.set(result.chunkId, {
        ...result,
        score: result.score * 0.3,
        matchPercentage: Math.round(result.score * 30),
      });
    }
  });
  
  // Convert to array and sort by score
  return Array.from(resultMap.values())
    .sort((a, b) => b.score - a.score);
}
