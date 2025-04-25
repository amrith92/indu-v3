
import { initializeDatabase } from './storage';
import { getMetadata, saveMetadata } from './storage';

interface ShardManifest {
  version: string;
  shards: {
    id: string;
    size: number;
    contentHash: string;
    bloomFilter: string;
    centroids: number[][];
    topTerms: string[];
    documentRange: [string, string];
    lastModified: string;
  }[];
}

interface ShardCache {
  shardId: string;
  data: ArrayBuffer;
  lastAccessed: number;
}

const SHARD_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_CACHE_SIZE = 200 * 1024 * 1024; // 200MB cache

export class ShardedStorageManager {
  private manifest: ShardManifest | null = null;
  private cache: Map<string, ShardCache> = new Map();
  private db: IDBDatabase | null = null;

  async initialize() {
    // Load manifest from IndexedDB
    this.manifest = await getMetadata('shard_manifest') as ShardManifest;
    if (!this.manifest) {
      this.manifest = {
        version: '1.0',
        shards: []
      };
      await saveMetadata('shard_manifest', this.manifest);
    }

    // Initialize IndexedDB for shard caching
    this.db = await initializeDatabase();
  }

  async getRelevantShards(query: string, embeddings?: Float32Array): Promise<string[]> {
    if (!this.manifest) throw new Error('Storage not initialized');
    
    const relevantShards = new Set<string>();

    // Check bloom filters for keyword matches
    const terms = query.toLowerCase().split(/\s+/);
    for (const shard of this.manifest.shards) {
      if (terms.some(term => this.checkBloomFilter(shard.bloomFilter, term))) {
        relevantShards.add(shard.id);
      }
    }

    // Check centroids for vector similarity if embeddings provided
    if (embeddings) {
      const nearestShards = this.findNearestCentroids(embeddings, 3);
      nearestShards.forEach(shardId => relevantShards.add(shardId));
    }

    return Array.from(relevantShards);
  }

  private async loadShard(shardId: string): Promise<ArrayBuffer> {
    // Check cache first
    const cached = this.cache.get(shardId);
    if (cached) {
      cached.lastAccessed = Date.now();
      return cached.data;
    }

    // Load from IndexedDB
    const data = await this.loadFromIndexedDB(shardId);
    if (data) return data;

    // Fetch from remote source
    const response = await fetch(`/api/shards/${shardId}`);
    const buffer = await response.arrayBuffer();

    // Update cache
    await this.updateCache(shardId, buffer);

    return buffer;
  }

  private async updateCache(shardId: string, data: ArrayBuffer) {
    // Remove oldest entries if cache is full
    while (this.getCacheSize() + data.byteLength > MAX_CACHE_SIZE) {
      const oldest = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed)[0];
      if (oldest) {
        this.cache.delete(oldest[0]);
      }
    }

    // Add to cache
    this.cache.set(shardId, {
      shardId,
      data,
      lastAccessed: Date.now()
    });

    // Store in IndexedDB for persistence
    await this.saveToIndexedDB(shardId, data);
  }

  private getCacheSize(): number {
    return Array.from(this.cache.values())
      .reduce((sum, cache) => sum + cache.data.byteLength, 0);
  }

  private async loadFromIndexedDB(shardId: string): Promise<ArrayBuffer | null> {
    if (!this.db) return null;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['shard_cache'], 'readonly');
      const request = transaction.objectStore('shard_cache').get(shardId);
      
      request.onsuccess = () => resolve(request.result?.data || null);
      request.onerror = () => reject(request.error);
    });
  }

  private async saveToIndexedDB(shardId: string, data: ArrayBuffer): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['shard_cache'], 'readwrite');
      const request = transaction.objectStore('shard_cache').put({
        id: shardId,
        data,
        timestamp: Date.now()
      });
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private checkBloomFilter(filter: string, term: string): boolean {
    // Simple bloom filter check implementation
    const hash = this.simpleHash(term);
    return filter.charAt(hash % filter.length) === '1';
  }

  private simpleHash(str: string): number {
    return str.split('').reduce((hash, char) => {
      return ((hash << 5) - hash) + char.charCodeAt(0);
    }, 0);
  }

  private findNearestCentroids(embedding: Float32Array, k: number): string[] {
    if (!this.manifest) return [];

    return this.manifest.shards
      .map(shard => ({
        id: shard.id,
        distance: this.cosineSimilarity(embedding, shard.centroids[0])
      }))
      .sort((a, b) => b.distance - a.distance)
      .slice(0, k)
      .map(result => result.id);
  }

  private cosineSimilarity(a: Float32Array | number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
