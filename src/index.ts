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
    this.zodGenerator = new ZodGenerator(this.config, this.client);
    this.typeGenerator = new TypeGenerator(this.config, this.client);
  }

  /**
   * Generate schemas and types for all configured collections
   */
  async generate(): Promise<GeneratedSchema[]> {
    try {
      // Authenticate with Directus
      await this.client.authenticate();

      // Load relationships data for proper M2M field resolution
      await this.zodGenerator.setRelationships();
      await this.typeGenerator.setRelationships();

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

      // Filter out folders/groups (they don't have actual data)
      const actualCollections = filteredCollections.filter(c => {
        // Only filter out specific known folders, not based on schema or naming patterns
        const isCommonFolder = ['Dialogues', 'Expert_System', 'Models', 'settings'].includes(c.collection);
        
        // Log what we're filtering out for debugging
        if (isCommonFolder) {
          console.log(`Filtering out folder: ${c.collection}`);
        }
        
        return !isCommonFolder;
      });

      console.log(`Found ${collections.length} total collections`);
      console.log(`After filtering: ${actualCollections.length} collections to process`);
      console.log('Collections to process:', actualCollections.map(c => c.collection));

      const results: GeneratedSchema[] = [];

      // Generate schemas and types for each collection
      for (const collection of actualCollections) {
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

      // After all schemas are generated, detect circular dependencies and regenerate lazy schemas
      const dependencyGraph = this.buildDependencyGraph(results);
      const circularDeps = this.detectCircularDependencies(dependencyGraph);
      
      // Regenerate schemas for collections that are part of circular dependencies
      for (const result of results) {
        if (result.schema) {
          const currentCollectionName = this.toSingular(this.toPascalCase(result.collectionName));
          const isPartOfCircularDependency = circularDeps.some(cycle => 
            cycle.includes(currentCollectionName)
          );
          
          if (isPartOfCircularDependency) {
            // Find the collection and regenerate with lazy schemas
            const collection = actualCollections.find(c => c.collection === result.collectionName);
            if (collection) {
              const collectionWithFields = await this.client.getCollectionWithFields(collection.collection);
              result.schema = this.zodGenerator.generateSchema(collectionWithFields, true);
            }
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
   * Write file schemas to the output directory based on actual Directus file collection structure
   */
  private async writeFileSchemas(outputDir: string): Promise<void> {
    const fileSchemasPath = path.join(outputDir, 'file-schemas.ts');
    
    try {
      // Try to fetch the actual file collection structure from Directus
      const fileCollection = await this.client.getCollectionWithFields('directus_files');
      const fileFields = fileCollection.fields;
      
      // Generate schemas based on actual Directus file collection structure
      const fileSchemaFields = this.generateFileSchemaFields(fileFields);
      const imageFileSchemaFields = this.generateFileSchemaFields(fileFields);
      
      const fileSchemasContent = `import { z } from 'zod';

/**
 * Directus file object schema (generated from actual Directus structure)
 */
export const DrxFileSchema = z.object({
${fileSchemaFields}
});

/**
 * Directus image file object schema (generated from actual Directus structure)
 */
export const DrxImageFileSchema = z.object({
${imageFileSchemaFields}
});

/**
 * TypeScript interfaces for Directus file objects
 */
export interface DrsFile {
${this.generateFileInterfaceFields(fileFields)}
}

export interface DrsImageFile {
${this.generateImageFileInterfaceFields(fileFields)}
}
`;

      fs.writeFileSync(fileSchemasPath, fileSchemasContent);
      console.log(`Generated: ${fileSchemasPath}`);
    } catch (error) {
      console.log('Could not fetch file collection structure, using fallback schema');
      // Fallback to static schema if we can't access the file collection
      const fallbackContent = `import { z } from 'zod';

/**
 * Directus file object schema (fallback)
 */
export const DrxFileSchema = z.object({
  id: z.string().uuid(),
  filename_disk: z.string(),
  filename_download: z.string(),
  title: z.string().optional(),
  type: z.string(),
  folder: z.string().uuid().optional(),
  uploaded_by: z.string().uuid().optional(),
  uploaded_on: z.string().datetime(),
  modified_by: z.string().uuid().optional(),
  modified_on: z.string().datetime(),
  charset: z.string().optional(),
  filesize: z.number().int(),
  description: z.string().optional(),
  location: z.string().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional()
});

/**
 * Directus image file object schema (fallback)
 */
export const DrxImageFileSchema = z.object({
  id: z.string().uuid(),
  filename_disk: z.string(),
  filename_download: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  type: z.string(),
  folder: z.string().uuid().optional(),
  uploaded_by: z.string().uuid().optional(),
  uploaded_on: z.string().datetime(),
  modified_by: z.string().uuid().optional(),
  modified_on: z.string().datetime(),
  charset: z.string().optional(),
  filesize: z.number().int(),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
  duration: z.number().optional(),
  embed: z.string().optional(),
  location: z.string().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional()
});

/**
 * TypeScript interfaces for Directus file objects (fallback)
 */
export interface DrsFile {
  id: string;
  filename_disk: string;
  filename_download: string;
  title?: string;
  type: string;
  folder?: string;
  uploaded_by?: string;
  uploaded_on: string;
  modified_by?: string;
  modified_on: string;
  charset?: string;
  filesize: number;
  description?: string;
  location?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface DrsImageFile {
  id: string;
  filename_disk: string;
  filename_download: string;
  title?: string;
  description?: string;
  type: string;
  folder?: string;
  uploaded_by?: string;
  uploaded_on: string;
  modified_by?: string;
  modified_on: string;
  charset?: string;
  filesize: number;
  width?: number;
  height?: number;
  duration?: number;
  embed?: string;
  location?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}
`;

      fs.writeFileSync(fileSchemasPath, fallbackContent);
      console.log(`Generated: ${fileSchemasPath} (fallback)`);
    }
  }

  /**
   * Generate Zod schema fields for file objects based on actual Directus structure
   */
  private generateFileSchemaFields(fileFields: any[]): string {
    const fields: string[] = [];
    
    for (const field of fileFields) {
      const fieldName = field.field;
      const dataType = field.schema?.data_type || field.type;
      const isNullable = field.schema?.is_nullable;
      const isOptional = !field.schema?.is_nullable && !field.schema?.is_primary_key;
      
      let zodType = '';
      
      switch (dataType) {
        case 'uuid':
          zodType = 'z.string().uuid()';
          break;
        case 'varchar':
        case 'text':
        case 'string':
        case 'character varying':
          zodType = 'z.string()';
          break;
        case 'integer':
        case 'bigint':
        case 'int':
          zodType = 'z.number().int()';
          break;
        case 'float':
        case 'decimal':
        case 'numeric':
        case 'real':
          zodType = 'z.number()';
          break;
        case 'boolean':
          zodType = 'z.boolean()';
          break;
        case 'json':
        case 'jsonb':
          zodType = 'z.record(z.any())';
          break;
        case 'timestamp':
        case 'datetime':
        case 'timestamp with time zone':
          zodType = 'z.string().datetime()';
          break;
        case 'date':
          zodType = 'z.string().date()';
          break;
        case 'time':
          zodType = 'z.string().time()';
          break;
        default:
          zodType = 'z.any()';
      }
      
      if (isOptional) {
        zodType += '.optional()';
      }
      
      fields.push(`  ${fieldName}: ${zodType}`);
    }
    
    return fields.join(',\n');
  }

  /**
   * Generate TypeScript interface fields for file objects based on actual Directus structure
   */
  private generateFileInterfaceFields(fileFields: any[]): string {
    const fields: string[] = [];
    
    for (const field of fileFields) {
      const fieldName = field.field;
      const dataType = field.schema?.data_type || field.type;
      const isNullable = field.schema?.is_nullable;
      const isOptional = !field.schema?.is_nullable && !field.schema?.is_primary_key;
      
      let tsType = '';
      
      switch (dataType) {
        case 'uuid':
          tsType = 'string';
          break;
        case 'varchar':
        case 'text':
        case 'string':
        case 'character varying':
          tsType = 'string';
          break;
        case 'integer':
        case 'bigint':
        case 'int':
          tsType = 'number';
          break;
        case 'float':
        case 'decimal':
        case 'numeric':
        case 'real':
          tsType = 'number';
          break;
        case 'boolean':
          tsType = 'boolean';
          break;
        case 'json':
        case 'jsonb':
          tsType = 'Record<string, any>';
          break;
        case 'timestamp':
        case 'datetime':
        case 'timestamp with time zone':
        case 'date':
        case 'time':
          tsType = 'string';
          break;
        default:
          tsType = 'any';
      }
      
      const optionalMarker = isOptional ? '?' : '';
      fields.push(`  ${fieldName}${optionalMarker}: ${tsType};`);
    }
    
    return fields.join('\n');
  }

  /**
   * Generate TypeScript interface fields for image file objects (same as file but with image-specific fields)
   */
  private generateImageFileInterfaceFields(fileFields: any[]): string {
    // For now, use the same fields as regular files
    // In a real implementation, we might want to add image-specific fields
    return this.generateFileInterfaceFields(fileFields);
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

    // Write file schemas first
    await this.writeFileSchemas(outputDir);

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
        // Extract schema references from field definitions only (not from export statements)
        // Look for Drx*Schema references in the z.object() part only
        const objectMatch = result.schema.match(/z\.object\(\{[\s\S]*?\}\)/);
        if (objectMatch) {
          const fieldDefinitions = objectMatch[0];
          const schemaMatches = fieldDefinitions.match(/Drx[A-Z][a-zA-Z]*Schema/g);
          if (schemaMatches) {
            schemaMatches.forEach(match => {
              const singularName = match.replace('Drx', '').replace('Schema', '');
              // Don't import from self and skip file schemas
              if (singularName !== this.toSingular(this.toPascalCase(result.collectionName)) &&
                  singularName !== 'File' && 
                  singularName !== 'ImageFile') {
                relatedCollections.add(singularName);
              }
            });
          }
        }
      }
      
      if (result.type) {
        // Extract type references from the generated type (only base types, not Create/Update/Get)
        const typeMatches = result.type.match(/Drs[A-Z][a-zA-Z]*/g);
        if (typeMatches) {
          typeMatches.forEach(match => {
            const singularName = match.replace('Drs', '');
            // Skip Create, Update, Get types, file types, and don't import from self
            if (!singularName.endsWith('Create') && 
                !singularName.endsWith('Update') && 
                !singularName.endsWith('Get') && 
                singularName !== 'File' && 
                singularName !== 'ImageFile' &&
                singularName !== this.toSingular(this.toPascalCase(result.collectionName))) {
              relatedCollections.add(singularName);
            }
          });
        }
      }
      
      // Add imports
      if (result.schema) {
        fileContent += `import { z } from 'zod';\n`;
      }
      
      // Add file schemas import if file fields are present
      if (result.schema && (result.schema.includes('DrxFileSchema') || result.schema.includes('DrxImageFileSchema'))) {
        fileContent += `import { DrxFileSchema, DrxImageFileSchema, type DrsFile, type DrsImageFile } from './file-schemas';\n`;
      }
      
      // Add imports for related collections, handling circular dependencies
      const processedImports = new Set<string>(); // Track processed imports to avoid duplicates
      for (const singularName of relatedCollections) {
        // Find the actual collection name for this schema
        const relatedCollection = results.find(r => {
          const collectionSingular = this.toSingular(this.toPascalCase(r.collectionName));
          const collectionNameWithoutPrefix = r.collectionName.replace('directus_', '');
          const collectionSingularWithoutPrefix = this.toSingular(this.toPascalCase(collectionNameWithoutPrefix));
          
          return collectionSingular === singularName || 
                 collectionSingularWithoutPrefix === singularName;
        });
        
        if (relatedCollection) {
          // Use the actual file name that was generated for this collection
          const relatedFileName = this.toKebabCase(this.toSingular(this.toPascalCase(relatedCollection.collectionName)));
          
          // Determine if this is a system collection and use appropriate schema names
          const isSystemCollection = relatedCollection.collectionName.startsWith('directus_');
          
          // Avoid double "Directus" prefix - if singularName already contains "Directus", don't add it again
          const baseSingularName = singularName.replace('Directus', '');
          const schemaName = isSystemCollection 
            ? `DrxDirectus${baseSingularName}Schema` 
            : `Drx${baseSingularName}Schema`;
          const typeName = isSystemCollection 
            ? `DrsDirectus${baseSingularName}` 
            : `Drs${baseSingularName}`;
          
          // Check if this import would create a circular dependency
          const currentCollectionName = this.toSingular(this.toPascalCase(result.collectionName));
          const isCircular = this.isCircularDependency(currentCollectionName, singularName, circularDeps);
          
          // Create a unique key for this import to avoid duplicates
          const importKey = `${schemaName}:${relatedFileName}`;
          
          if (!processedImports.has(importKey)) {
            processedImports.add(importKey);
            if (isCircular) {
              // Use lazy import for circular dependencies to avoid runtime circular imports
              fileContent += `import { ${schemaName}, type ${typeName} } from './${relatedFileName}';\n`;
            } else {
              // Normal import for non-circular dependencies
              fileContent += `import { ${schemaName}, type ${typeName} } from './${relatedFileName}';\n`;
            }
          }
        }
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
            // Skip Create, Update, Get schemas
            if (!singularName.endsWith('Create') && !singularName.endsWith('Update') && !singularName.endsWith('Get') && singularName !== currentCollectionName) {
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
            // Skip Create, Update, Get types
            if (!singularName.endsWith('Create') && !singularName.endsWith('Update') && !singularName.endsWith('Get') && singularName !== currentCollectionName) {
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
