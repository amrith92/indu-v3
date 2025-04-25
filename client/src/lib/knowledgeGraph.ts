
import kuzu from 'kuzu-wasm';
import { Document, DocumentChunk } from '@/types';

// Initialize KuzuDB
export async function initKnowledgeGraph() {
  if (!kuzu) {
    await init();
    kuzu = new Kuzu();
    
    // Create schema
    await kuzu.run(`
      CREATE NODE TABLE Entity (
        id STRING PRIMARY KEY,
        type STRING,
        name STRING,
        documentId STRING,
        chunkId STRING
      );
      
      CREATE REL TABLE Relationship (
        FROM Entity TO Entity,
        type STRING,
        weight FLOAT32
      );
    `);
  }
}

// Extract entities from text using transformers.js
async function extractEntities(text: string): Promise<Array<{type: string, name: string}>> {
  const pipeline = await import('@xenova/transformers').then(m => 
    m.pipeline('token-classification', 'Xenova/bert-base-NER')
  );
  
  const result = await pipeline(text);
  return result.map((entity: any) => ({
    type: entity.entity_group,
    name: entity.word
  }));
}

// Add document to knowledge graph
export async function addDocumentToGraph(document: Document) {
  if (!kuzu) await initKnowledgeGraph();
  
  for (const chunk of document.content.chunks) {
    // Extract entities
    const entities = await extractEntities(chunk.text);
    
    // Add entities to graph
    for (const entity of entities) {
      const entityId = `${entity.name}-${crypto.randomUUID()}`;
      await kuzu!.run(`
        INSERT INTO Entity (id, type, name, documentId, chunkId)
        VALUES (?, ?, ?, ?, ?)
      `, [entityId, entity.type, entity.name, document.id, chunk.id]);
    }
    
    // Create relationships between co-occurring entities
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        await kuzu!.run(`
          MATCH (e1:Entity), (e2:Entity)
          WHERE e1.name = ? AND e2.name = ? AND e1.chunkId = ? AND e2.chunkId = ?
          CREATE (e1)-[r:CO_OCCURS {type: 'co_occurs', weight: 1.0}]->(e2)
        `, [entities[i].name, entities[j].name, chunk.id, chunk.id]);
      }
    }
  }
}

// Search knowledge graph
export async function searchGraph(query: string): Promise<Array<{chunkId: string, score: number}>> {
  if (!kuzu) await initKnowledgeGraph();
  
  // Extract entities from query
  const queryEntities = await extractEntities(query);
  
  // Find relevant chunks through entity relationships
  const results = await kuzu!.run(`
    MATCH (e:Entity)-[r:CO_OCCURS*1..2]-(related:Entity)
    WHERE e.name IN $names
    RETURN related.chunkId as chunkId, COUNT(*) as relevance
    ORDER BY relevance DESC
    LIMIT 20
  `, { names: queryEntities.map(e => e.name) });
  
  return results.map((row: any) => ({
    chunkId: row.chunkId,
    score: row.relevance / queryEntities.length
  }));
}
