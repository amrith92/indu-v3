import kuzu from "kuzu-wasm";
import { pipeline } from "@xenova/transformers";
import { Document } from "@/types";

let db: any = null;
let connection: any = null;
// Initialize NER pipeline at module level
const nerPipeline = pipeline("token-classification", "Xenova/bert-base-NER");
let nerPipelineInstance: any = null;

// Initialize KuzuDB
export async function initKnowledgeGraph() {
  if (!nerPipelineInstance) {
    nerPipelineInstance = await nerPipeline;
    console.log("NER pipeline loaded.");
  }

  if (!db || !connection) {
    await kuzu.FS.mkdir("/database");
    await kuzu.FS.mountIdbfs("/database");
    console.log("IDBFS mounted.");

    db = new kuzu.Database("/database");
    connection = new kuzu.Connection(db);

    try {
      // Create schema
      await connection.query(`
        CREATE NODE TABLE IF NOT EXISTS Entity (
          id STRING PRIMARY KEY,
          type STRING,
          name STRING,
          documentId STRING,
          chunkId STRING
        )`);

      await connection.query(`
        CREATE REL TABLE IF NOT EXISTS Relationship (
          FROM Entity TO Entity,
          type STRING,
          weight DOUBLE
        )`);
    } catch (error) {
      console.error("Error initializing KuzuDB schema:", error);
      throw error;
    }
  }
}

// Extract entities from text using transformers.js
async function extractEntities(
  text: string,
): Promise<Array<{ type: string; name: string }>> {
  const result = await nerPipelineInstance(text);
  return result.map((entity: any) => ({
    type: entity.entity_group,
    name: entity.word,
  }));
}

// Add document to knowledge graph
export async function addDocumentToGraph(document: Document) {
  await initKnowledgeGraph();

  for (const chunk of document.content.chunks) {
    try {
      // Extract entities
      const entities = await extractEntities(chunk.text);

      // Add entities to graph
      for (const entity of entities) {
        const entityId = `${entity.name}-${crypto.randomUUID()}`;
        await connection.query(
          `
          CREATE (e:Entity {id: '${entityId}', type: '${entity.type}', name: '${document.name}', documentId: '${document.id}', chunkId: '${chunk.id}'});
        `,
        );
      }

      // Create relationships between co-occurring entities
      for (let i = 0; i < entities.length; i++) {
        for (let j = i + 1; j < entities.length; j++) {
          await connection.query(
            `
            MATCH (e1:Entity), (e2:Entity)
            WHERE e1.name = '${entities[i].name}' AND e2.name = '${entities[j].name}' AND e1.chunkId = '${chunk.id}' AND e2.chunkId = '${chunk.id}'
            WITH e1, e2
            CREATE (e1)-[r:Relationship {type: 'co_occurs', weight: 1.0}]->(e2)
          `,
          );
        }
      }
    } catch (error) {
      console.error("Error processing document chunk:", error);
      throw error;
    }
  }
}

// Search knowledge graph
export async function searchGraph(
  query: string,
): Promise<Array<{ chunkId: string; score: number }>> {
  await initKnowledgeGraph();

  try {
    // Extract entities from query
    const queryEntities = await extractEntities(query);

    // Find relevant chunks through entity relationships
    const results = await connection.query(
      `
      MATCH (e:Entity)-[r:Relationship*1..2]-(related:Entity)
      WHERE e.name IN $names
      RETURN related.chunkId as chunkId, COUNT(*) as relevance
      ORDER BY relevance DESC
      LIMIT 20
    `,
      { names: queryEntities.map((e) => e.name) },
    );

    return results.map((row: any) => ({
      chunkId: row.chunkId,
      score: row.relevance / queryEntities.length,
    }));
  } catch (error) {
    console.error("Error searching knowledge graph:", error);
    throw error;
  }
}
