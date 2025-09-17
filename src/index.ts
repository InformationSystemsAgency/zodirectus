import { ZodirectusConfig, GeneratedSchema } from './types';
import { DirectusClient } from './utils/directus-client';
import { ZodGenerator } from './generators/zod-generator';
import { TypeGenerator } from './generators/type-generator';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Main Zodirectus class for generating Zod schemas and TypeScript types from Directus collections
 */
export class Zodirectus {
  private config: ZodirectusConfig;
  private client: DirectusClient;
  private zodGenerator: ZodGenerator;
  private typeGenerator: TypeGenerator;

  constructor(config: ZodirectusConfig) {
    this.config = {
      outputDir: './generated',
      generateTypes: true,
      generateSchemas: true,
      schemaFileName: 'schemas.ts',
      typesFileName: 'types.ts',
      includeSystemCollections: false,
      ...config,
    };
    
    this.client = new DirectusClient(this.config);
    this.zodGenerator = new ZodGenerator(this.config);
    this.typeGenerator = new TypeGenerator(this.config);
  }

  /**
   * Generate schemas and types for all configured collections
   */
  async generate(): Promise<GeneratedSchema[]> {
    try {
      // Authenticate with Directus
      await this.client.authenticate();

      // Get collections
      const collections = await this.client.getCollections();
      
      // Filter collections if specific ones are requested
      const targetCollections = this.config.collections 
        ? collections.filter(c => this.config.collections!.includes(c.collection))
        : collections;

      // Filter out system collections if not included
      const filteredCollections = this.config.includeSystemCollections
        ? targetCollections
        : targetCollections.filter(c => !c.collection.startsWith('directus_'));

      const results: GeneratedSchema[] = [];

      // Generate schemas and types for each collection
      for (const collection of filteredCollections) {
        const collectionWithFields = await this.client.getCollectionWithFields(collection.collection);
        
        if (this.config.generateSchemas) {
          const schema = this.zodGenerator.generateSchema(collectionWithFields);
          results.push({
            collectionName: collection.collection,
            schema,
          });
        }

        if (this.config.generateTypes) {
          const type = this.typeGenerator.generateType(collectionWithFields);
          const existingResult = results.find(r => r.collectionName === collection.collection);
          if (existingResult) {
            existingResult.type = type;
          } else {
            results.push({
              collectionName: collection.collection,
              type,
            });
          }
        }
      }

      // Write files to output directory
      await this.writeFiles(results);

      return results;
    } catch (error) {
      throw new Error(`Failed to generate schemas: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate schema for a single collection
   */
  async generateForCollection(collectionName: string): Promise<GeneratedSchema> {
    try {
      await this.client.authenticate();
      const collectionWithFields = await this.client.getCollectionWithFields(collectionName);
      
      const result: GeneratedSchema = {
        collectionName,
      };

      if (this.config.generateSchemas) {
        result.schema = this.zodGenerator.generateSchema(collectionWithFields);
      }

      if (this.config.generateTypes) {
        result.type = this.typeGenerator.generateType(collectionWithFields);
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to generate schema for collection ${collectionName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Write generated files to the output directory
   */
  private async writeFiles(results: GeneratedSchema[]): Promise<void> {
    const outputDir = this.config.outputDir!;
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Group results by type
    const schemas = results.filter(r => r.schema);
    const types = results.filter(r => r.type);

    // Write schema file
    if (schemas.length > 0 && this.config.generateSchemas) {
      const schemaContent = this.zodGenerator.generateSchemaFile(schemas);
      const schemaPath = path.join(outputDir, this.config.schemaFileName!);
      fs.writeFileSync(schemaPath, schemaContent);
    }

    // Write types file
    if (types.length > 0 && this.config.generateTypes) {
      const typeContent = this.typeGenerator.generateTypeFile(types);
      const typePath = path.join(outputDir, this.config.typesFileName!);
      fs.writeFileSync(typePath, typeContent);
    }
  }

  /**
   * Get available collections from Directus
   */
  async getCollections(): Promise<string[]> {
    await this.client.authenticate();
    const collections = await this.client.getCollections();
    return collections.map(c => c.collection);
  }
}

// Export types and utilities
export * from './types';
export * from './generators/zod-generator';
export * from './generators/type-generator';
export * from './utils/directus-client';
