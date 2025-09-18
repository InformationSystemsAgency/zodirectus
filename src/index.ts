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

    // Build dependency graph and detect circular dependencies
    const dependencyGraph = this.buildDependencyGraph(results);
    const circularDeps = this.detectCircularDependencies(dependencyGraph);

    // Write individual files for each collection
    for (const result of results) {
      const singularName = this.toSingular(this.toPascalCase(result.collectionName));
      const fileName = this.toKebabCase(singularName);
      const filePath = path.join(outputDir, `${fileName}.ts`);
      
      let fileContent = '';
      
      // Collect all related collections that need to be imported
      const relatedCollections = new Set<string>();
      
      if (result.schema) {
        // Extract schema references from the generated schema
        const schemaMatches = result.schema.match(/Drx[A-Z][a-zA-Z]*Schema/g);
        if (schemaMatches) {
          schemaMatches.forEach(match => {
            const singularName = match.replace('Drx', '').replace('Schema', '');
            // Don't import from self
            if (singularName !== this.toSingular(this.toPascalCase(result.collectionName))) {
              relatedCollections.add(singularName);
            }
          });
        }
      }
      
      if (result.type) {
        // Extract type references from the generated type
        const typeMatches = result.type.match(/Drs[A-Z][a-zA-Z]*/g);
        if (typeMatches) {
          typeMatches.forEach(match => {
            const singularName = match.replace('Drs', '');
            // Don't import from self
            if (singularName !== this.toSingular(this.toPascalCase(result.collectionName))) {
              relatedCollections.add(singularName);
            }
          });
        }
      }
      
      // Add imports
      if (result.schema) {
        fileContent += `import { z } from 'zod';\n`;
      }
      
      // Add imports for related collections, handling circular dependencies
      for (const singularName of relatedCollections) {
        // Use singular name directly for file path (no need to map back to plural)
        const relatedFileName = this.toKebabCase(singularName);
        const schemaName = `Drx${singularName}Schema`;
        const typeName = `Drs${singularName}`;
        
        // Check if this import would create a circular dependency
        const currentCollectionName = this.toSingular(this.toPascalCase(result.collectionName));
        const isCircular = this.isCircularDependency(currentCollectionName, singularName, circularDeps);
        
        if (isCircular) {
          // Use lazy import for circular dependencies to avoid runtime circular imports
          fileContent += `import { ${schemaName}, type ${typeName} } from './${relatedFileName}';\n`;
        } else {
          // Normal import for non-circular dependencies
          fileContent += `import { ${schemaName}, type ${typeName} } from './${relatedFileName}';\n`;
        }
      }
      
      if (fileContent.includes('import')) {
        fileContent += '\n';
      }
      
      // Add schema
      if (result.schema) {
        const currentCollectionName = this.toSingular(this.toPascalCase(result.collectionName));
        
        // Check if this schema is part of any circular dependency
        const isPartOfCircularDependency = circularDeps.some(cycle => 
          cycle.includes(currentCollectionName)
        );
        
        if (isPartOfCircularDependency) {
          // Wrap the entire schema definition in z.lazy() for circular dependencies
          const schemaName = `Drx${currentCollectionName}Schema`;
          const schemaBody = result.schema.replace(`export const ${schemaName} =`, '').trim();
          // Remove the trailing semicolon from the original schema body
          const cleanSchemaBody = schemaBody.replace(/;$/, '');
          fileContent += `export const ${schemaName}: z.ZodType<any> = z.lazy(() => ${cleanSchemaBody});\n\n`;
        } else {
          // Normal schema definition for non-circular dependencies
          fileContent += result.schema + '\n\n';
        }
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
   * Build dependency graph from generated results
   */
  private buildDependencyGraph(results: GeneratedSchema[]): Map<string, Set<string>> {
    const graph = new Map<string, Set<string>>();
    
    for (const result of results) {
      const currentCollectionName = this.toSingular(this.toPascalCase(result.collectionName));
      const dependencies = new Set<string>();
      
      // Extract dependencies from schema
      if (result.schema) {
        const schemaMatches = result.schema.match(/Drx[A-Z][a-zA-Z]*Schema/g);
        if (schemaMatches) {
          schemaMatches.forEach(match => {
            const singularName = match.replace('Drx', '').replace('Schema', '');
            if (singularName !== currentCollectionName) {
              dependencies.add(singularName);
            }
          });
        }
      }
      
      // Extract dependencies from type
      if (result.type) {
        const typeMatches = result.type.match(/Drs[A-Z][a-zA-Z]*/g);
        if (typeMatches) {
          typeMatches.forEach(match => {
            const singularName = match.replace('Drs', '');
            if (singularName !== currentCollectionName) {
              dependencies.add(singularName);
            }
          });
        }
      }
      
      graph.set(currentCollectionName, dependencies);
    }
    
    return graph;
  }

  /**
   * Detect circular dependencies using DFS
   */
  private detectCircularDependencies(graph: Map<string, Set<string>>): string[][] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const circularDeps = new Set<string[]>();
    
    const dfs = (node: string, path: string[]): void => {
      visited.add(node);
      recursionStack.add(node);
      path.push(node);
      
      const neighbors = graph.get(node) || new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor, [...path]);
        } else if (recursionStack.has(neighbor)) {
          // Found a cycle
          const cycleStart = path.indexOf(neighbor);
          const cycle = path.slice(cycleStart);
          cycle.push(neighbor); // Complete the cycle
          circularDeps.add(cycle);
        }
      }
      
      recursionStack.delete(node);
    };
    
    for (const node of graph.keys()) {
      if (!visited.has(node)) {
        dfs(node, []);
      }
    }
    
    return Array.from(circularDeps);
  }

  /**
   * Check if two collections have a circular dependency
   */
  private isCircularDependency(collectionA: string, collectionB: string, circularDeps: string[][]): boolean {
    for (const cycle of circularDeps) {
      if (cycle.includes(collectionA) && cycle.includes(collectionB)) {
        return true;
      }
    }
    return false;
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
   * Convert plural word to singular
   */
  private toSingular(word: string): string {
    // Common plural to singular conversions
    // const pluralToSingular: Record<string, string> = {
    //   'Applications': 'Application',
    //   'Banks': 'Bank',
    //   'Clerks': 'Clerk',
    //   'Languages': 'Language',
    //   'Globals': 'Global',
    //   'AuditAccountabilityLogs': 'AuditAccountabilityLog',
    //   'AuditActivityLogs': 'AuditActivityLog',
    //   'AuditSessions': 'AuditSession',
    //   'GlobalsTranslations': 'GlobalsTranslation'
    // };

    // if (pluralToSingular[word]) {
    //   return pluralToSingular[word];
    // }

    // Generic rules for common plural patterns
    if (word.endsWith('ies')) {
      return word.slice(0, -3) + 'y';
    }
    if (word.endsWith('ses') || word.endsWith('shes') || word.endsWith('ches') || word.endsWith('xes') || word.endsWith('zes')) {
      return word.slice(0, -2);
    }
    if (word.endsWith('s') && word.length > 1) {
      return word.slice(0, -1);
    }

    return word;
  }

  /**
   * Convert singular word back to plural (reverse mapping)
   */
  private singularToPlural(word: string): string {
    // Reverse mapping for common conversions
    // const singularToPlural: Record<string, string> = {
    //   'Application': 'Applications',
    //   'Bank': 'Banks',
    //   'Clerk': 'Clerks',
    //   'Language': 'Languages',
    //   'Global': 'Globals',
    //   'AuditAccountabilityLog': 'AuditAccountabilityLogs',
    //   'AuditActivityLog': 'AuditActivityLogs',
    //   'AuditSession': 'AuditSessions',
    //   'GlobalsTranslation': 'GlobalsTranslations'
    // };

    // if (singularToPlural[word]) {
    //   return singularToPlural[word];
    // }

    // Generic rules for common singular patterns
    if (word.endsWith('y')) {
      return word.slice(0, -1) + 'ies';
    }
    if (word.endsWith('s') || word.endsWith('sh') || word.endsWith('ch') || word.endsWith('x') || word.endsWith('z')) {
      return word + 'es';
    }
    
    return word + 's';
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
