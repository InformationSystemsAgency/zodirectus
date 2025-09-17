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
        try {
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
        } catch (error) {
          console.log(`Collection '${collection.collection}' skipped due to access error:`, error instanceof Error ? error.message : 'Unknown error');
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

    // Write individual files for each collection
    for (const result of results) {
      const collectionName = this.toKebabCase(result.collectionName);
      const filePath = path.join(outputDir, `${collectionName}.ts`);
      
      let fileContent = '';
      
      // Collect all related collections that need to be imported
      const relatedCollections = new Set<string>();
      
      if (result.schema) {
        // Extract schema references from the generated schema
        const schemaMatches = result.schema.match(/Drx[A-Z][a-zA-Z]*Schema/g);
        if (schemaMatches) {
          schemaMatches.forEach(match => {
            const relatedCollectionName = match.replace('Drx', '').replace('Schema', '');
            // Don't import from self
            if (relatedCollectionName !== this.toPascalCase(result.collectionName)) {
              relatedCollections.add(relatedCollectionName);
            }
          });
        }
      }
      
      if (result.type) {
        // Extract type references from the generated type
        const typeMatches = result.type.match(/Drs[A-Z][a-zA-Z]*/g);
        if (typeMatches) {
          typeMatches.forEach(match => {
            const relatedCollectionName = match.replace('Drs', '');
            // Don't import from self
            if (relatedCollectionName !== this.toPascalCase(result.collectionName)) {
              relatedCollections.add(relatedCollectionName);
            }
          });
        }
      }
      
      // Add imports
      if (result.schema) {
        fileContent += `import { z } from 'zod';\n`;
      }
      
      // Add imports for related collections
      for (const relatedCollectionName of relatedCollections) {
        const relatedFileName = this.toKebabCase(relatedCollectionName);
        const schemaName = `Drx${relatedCollectionName}Schema`;
        const typeName = `Drs${relatedCollectionName}`;
        fileContent += `import { ${schemaName}, ${typeName} } from './${relatedFileName}';\n`;
      }
      
      if (fileContent.includes('import')) {
        fileContent += '\n';
      }
      
      // Add schema
      if (result.schema) {
        fileContent += result.schema + '\n\n';
      }
      
      // Add type
      if (result.type) {
        fileContent += result.type + '\n';
      }
      
      // Write the file
      fs.writeFileSync(filePath, fileContent);
    }
  }

  /**
   * Convert string to kebab-case for file names
   */
  private toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }

  /**
   * Convert string to PascalCase
   */
  private toPascalCase(str: string): string {
    return str
      .split(/[-_\s]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
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
