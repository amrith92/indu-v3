import * as duckdb from "@duckdb/duckdb-wasm";

// Initialize DuckDB database
let db: duckdb.AsyncDuckDB | null = null;
let conn: duckdb.AsyncDuckDBConnection | null = null;

// Initialize DuckDB with sharded storage support
export async function initDuckDB(): Promise<void> {
  try {
    if (db) return;

    const shardManager = new ShardedStorageManager();
    await shardManager.initialize();

    // Load the WASM files and worker
    const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();

    // Select the bundle based on browser support
    const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);

    const worker_url = URL.createObjectURL(
      new Blob([`importScripts("${bundle.mainWorker!}");`], {
        type: "text/javascript",
      }),
    );

    // Instantiate the asynchronus version of DuckDB-Wasm
    const worker = new Worker(worker_url);
    const logger = new duckdb.ConsoleLogger();
    db = new duckdb.AsyncDuckDB(logger, worker);
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
    URL.revokeObjectURL(worker_url);

    // Create connection
    conn = await db.connect();

    // Create tables
    await createTables();

    console.log("DuckDB initialized successfully");
  } catch (error) {
    console.error("Error initializing DuckDB:", error);
    // Swallow the error for now to allow the application to continue
  }
}

// Create necessary tables
async function createTables(): Promise<void> {
  if (!conn) throw new Error("Database connection not established");

  try {
    // Create documents table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id VARCHAR PRIMARY KEY,
        name VARCHAR,
        type VARCHAR,
        size BIGINT,
        created_at TIMESTAMP,
        source VARCHAR,
        metadata JSON
      )
    `);

    // Create document_chunks table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS document_chunks (
        id VARCHAR PRIMARY KEY,
        document_id VARCHAR,
        text VARCHAR,
        metadata JSON,
        FOREIGN KEY (document_id) REFERENCES documents(id)
      )
    `);

    // Create search_index table to store statistics about searches
    await conn.query(`
      CREATE TABLE IF NOT EXISTS search_index (
        id VARCHAR PRIMARY KEY,
        document_id VARCHAR,
        chunk_id VARCHAR,
        term VARCHAR,
        frequency INTEGER,
        FOREIGN KEY (document_id) REFERENCES documents(id),
        FOREIGN KEY (chunk_id) REFERENCES document_chunks(id)
      )
    `);

    // Create search_logs table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS search_logs (
        id VARCHAR PRIMARY KEY,
        query VARCHAR,
        language VARCHAR,
        timestamp TIMESTAMP,
        result_count INTEGER
      )
    `);
  } catch (error) {
    console.error("Error creating tables:", error);
    throw error;
  }
}

// Execute a SQL query
export async function executeQuery<T = any>(
  query: string,
  params: any[] = [],
): Promise<T[]> {
  if (!conn) await initDuckDB();
  if (!conn) throw new Error("Database connection not established");

  try {
    let result;
    if (params.length === 0) {
      result = await conn.query(query);
    } else {
      const substitutedQuery = query.replace(/\?/g, () => {
        const param = params.shift();
        return typeof param === "string"
          ? `'${param.replace(/'/g, "''")}'`
          : param;
      });
      result = await conn.query(substitutedQuery);
    }
    return result.toArray() as T[];
  } catch (error) {
    console.error("Error executing query:", error);
    throw error;
  }
}

// Insert a document
export async function insertDocument(document: {
  id: string;
  name: string;
  type: string;
  size: number;
  createdAt: Date;
  source: string;
  metadata: any;
  content: {
    chunks: any[];
  };
}): Promise<void> {
  await executeQuery(
    `INSERT INTO documents (id, name, type, size, created_at, source, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      document.id,
      document.name,
      document.type,
      document.size,
      document.createdAt.toISOString(),
      document.source,
      JSON.stringify(document.metadata),
    ],
  );

  await insertDocumentChunks(document.content.chunks);
}

// Insert document chunks
export async function insertDocumentChunks(
  chunks: Array<{
    id: string;
    documentId: string;
    text: string;
    metadata: any;
  }>,
): Promise<void> {
  if (!conn) await initDuckDB();
  if (!conn) throw new Error("Database connection not established");

  const chunkData = chunks.map((chunk) => [
    chunk.id,
    chunk.documentId,
    chunk.text,
    JSON.stringify(chunk.metadata),
  ]);

  for (const chunk of chunkData) {
    await executeQuery(
      `INSERT INTO document_chunks (id, document_id, text, metadata)
       VALUES (?, ?, ?, ?)`,
      chunk,
    );
  }
}

// Execute a keyword search
export async function keywordSearch(
  query: string,
  limit: number = 10,
): Promise<
  Array<{
    chunkId: string;
    documentId: string;
    documentName: string;
    text: string;
    score: number;
    metadata: any;
    documentType: string;
  }>
> {
  // For MVP, return an empty array since DuckDB is not initialized
  console.log(`Keyword search for: "${query}" (limit: ${limit})`);
  // Prepare search terms
  const searchTerms = query
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((term) => term.length > 2);

  if (searchTerms.length === 0) return [];

  // Create SQL query with LIKE conditions for each term
  const likeConditions = searchTerms
    .map(() => "LOWER(dc.text) LIKE ?")
    .join(" OR ");
  const likeParams = searchTerms.map((term) => `%${term}%`);

  const sql = `
    SELECT
      dc.id as chunk_id,
      dc.document_id,
      d.name as document_name,
      dc.text,
      dc.metadata,
      d.type as document_type
    FROM
      document_chunks dc
    JOIN
      documents d ON dc.document_id = d.id
    WHERE
      ${likeConditions}
    LIMIT ?
  `;

  const results = await executeQuery(sql, [...likeParams, limit]);

  // Simple scoring based on number of terms matched
  return results
    .map((result) => {
      let score = 0;
      const text = result.text.toLowerCase();

      for (const term of searchTerms) {
        if (text.includes(term)) {
          score += 1;
        }
      }

      score = score / searchTerms.length;

      return {
        chunkId: result.chunk_id,
        documentId: result.document_id,
        documentName: result.document_name,
        documentType: result.document_type,
        text: result.text,
        score,
        metadata: JSON.parse(result.metadata),
      };
    })
    .sort((a, b) => b.score - a.score);
}

// Log search query
export async function logSearch(
  query: string,
  language: string,
  resultCount: number,
): Promise<void> {
  // For MVP, just log to console since DuckDB is not initialized
  console.log(
    `Search logged: "${query}" (language: ${language}, results: ${resultCount})`,
  );

  await executeQuery(`INSERT INTO search_logs VALUES (?, ?, ?, ?, ?)`, [
    crypto.randomUUID(),
    query,
    language,
    new Date().toISOString(),
    resultCount,
  ]);
}

// Close DuckDB connection
export async function closeDuckDB(): Promise<void> {
  // For MVP, just log the closure attempt
  console.log("DuckDB connection close skipped for MVP");

  if (conn) {
    await conn.close();
    conn = null;
  }

  if (db) {
    await db.terminate();
    db = null;
  }
}
