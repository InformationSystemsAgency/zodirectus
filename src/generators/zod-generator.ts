// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { z } from 'zod'; // Used in generated code strings
import { DirectusCollectionWithFields, DirectusField, ZodirectusConfig, GeneratedSchema } from '../types';

/**
 * Zod Schema Generator for Directus collections
 */
export class ZodGenerator {
  private config: ZodirectusConfig;

  constructor(config: ZodirectusConfig) {
    this.config = config;
  }

  /**
   * Generate Zod schema for a collection
   */
  generateSchema(collection: DirectusCollectionWithFields): string {
    const collectionName = this.toPascalCase(collection.collection);
    const schemaName = `${collectionName}Schema`;
    
    const fields = collection.fields
      .filter(field => !field.meta?.hidden)
      .map(field => this.generateFieldSchema(field))
      .join(',\n    ');

    return `export const ${schemaName} = z.object({
    ${fields}
});`;
  }

  /**
   * Generate Zod schema for a field
   */
  private generateFieldSchema(field: DirectusField): string {
    const fieldName = field.field;
    const zodType = this.getZodType(field);
    const isRequired = field.meta?.required ?? false;
    const isNullable = field.schema?.is_nullable ?? true;

    let schema = `${fieldName}: ${zodType}`;

    // Handle nullable fields
    if (isNullable && !isRequired) {
      schema += '.nullable()';
    }

    // Handle optional fields
    if (!isRequired) {
      schema += '.optional()';
    }

    return schema;
  }

  /**
   * Get Zod type for a Directus field
   */
  private getZodType(field: DirectusField): string {
    const directusType = field.schema?.data_type || field.type;
    const special = field.meta?.special || [];

    // Handle special field types first
    if (special.includes('uuid')) {
      return 'z.string().uuid()';
    }
    
    if (special.includes('date-created') || special.includes('date-updated')) {
      return 'z.string().datetime()';
    }

    if (special.includes('user-created') || special.includes('user-updated')) {
      return 'z.string()';
    }

    if (special.includes('sort')) {
      return 'z.number().int()';
    }

    // Handle regular field types
    switch (directusType) {
      case 'uuid':
        return 'z.string().uuid()';
      
      case 'varchar':
      case 'char':
      case 'text':
      case 'longtext':
        return 'z.string()';
      
      case 'integer':
      case 'bigint':
      case 'smallint':
      case 'tinyint':
        return 'z.number().int()';
      
      case 'decimal':
      case 'float':
      case 'double':
        return 'z.number()';
      
      case 'boolean':
        return 'z.boolean()';
      
      case 'date':
        return 'z.string().date()';
      
      case 'datetime':
      case 'timestamp':
        return 'z.string().datetime()';
      
      case 'time':
        return 'z.string().time()';
      
      case 'json':
        return 'z.any()';
      
      case 'geometry':
        return 'z.any()';
      
      case 'binary':
        return 'z.string()';
      
      default:
        // Check for custom field mappings
        if (this.config.customFieldMappings?.[directusType]) {
          return this.config.customFieldMappings[directusType];
        }
        
        // Default to string for unknown types
        return 'z.string()';
    }
  }

  /**
   * Generate complete schema file content
   */
  generateSchemaFile(schemas: GeneratedSchema[]): string {
    const imports = `import { z } from 'zod';

`;
    
    const schemaDefinitions = schemas
      .map(schema => schema.schema)
      .join('\n\n');

    const exports = '\n\n' + schemas
      .map(schema => {
        const collectionName = this.toPascalCase(schema.collectionName);
        return `export const ${collectionName}Schema = ${collectionName}Schema;`;
      })
      .join('\n');

    return imports + schemaDefinitions + exports;
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
   * Generate TypeScript types from Zod schemas
   */
  generateTypesFromSchemas(schemas: GeneratedSchema[]): string {
    const typeDefinitions = schemas
      .map(schema => {
        const collectionName = this.toPascalCase(schema.collectionName);
        return `export type ${collectionName} = z.infer<typeof ${collectionName}Schema>;`;
      })
      .join('\n');

    return typeDefinitions;
  }
}
