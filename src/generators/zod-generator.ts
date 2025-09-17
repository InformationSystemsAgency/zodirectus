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
    const singularName = this.toSingular(collectionName);
    const schemaName = `Drx${singularName}Schema`;
    
    const fields = collection.fields
      .filter(field => !field.meta?.hidden && !this.isDividerField(field))
      .map(field => this.generateFieldSchema(field))
      .join(',\n    ');

    return `export const ${schemaName} = z.object({
    ${fields}
});`;
  }

  /**
   * Check if a field is a divider field that should be excluded
   */
  private isDividerField(field: DirectusField): boolean {
    // Check if field name starts with 'divider-'
    if (field.field.startsWith('divider-')) {
      return true;
    }
    
    // Check if field interface is 'divider'
    if (field.meta?.interface === 'divider') {
      return true;
    }
    
    // Check if field type is 'divider'
    if (field.type === 'divider') {
      return true;
    }
    
    return false;
  }

  /**
   * Check if a field is a relation field
   */
  private isRelationField(field: DirectusField): boolean {
    const special = field.meta?.special || [];
    const interface_ = field.meta?.interface || '';
    
    return special.includes('m2o') || 
           special.includes('o2m') || 
           special.includes('m2a') ||
           interface_.includes('m2o') ||
           interface_.includes('o2m') ||
           interface_.includes('m2a');
  }

  /**
   * Get the related collection name for a relation field
   */
  private getRelatedCollectionName(field: DirectusField): string | null {
    const special = field.meta?.special || [];
    
    // For M2O relations, get the foreign key table
    if (special.includes('m2o') && field.schema?.foreign_key_table) {
      return field.schema.foreign_key_table;
    }
    
    // For O2M relations, we need to infer from the field name or options
    if (special.includes('o2m')) {
      // For O2M, the field name usually indicates the related collection
      // e.g., 'activity_logs' field in 'audit_sessions' relates to 'audit_activity_logs'
      const fieldName = field.field;
      if (fieldName === 'activity_logs') {
        return 'audit_activity_logs';
      }
      // Add more patterns as needed
    }
    
    return null;
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
    const options = field.meta?.options || {};

    // Handle relation fields
    if (this.isRelationField(field)) {
      const relatedCollection = this.getRelatedCollectionName(field);
      if (relatedCollection) {
        const relatedSchemaName = `Drx${this.toSingular(this.toPascalCase(relatedCollection))}Schema`;
        
        // M2O relations are single objects
        if (special.includes('m2o')) {
          return relatedSchemaName;
        }
        
        // O2M relations are arrays
        if (special.includes('o2m')) {
          return `z.array(${relatedSchemaName})`;
        }
        
        // M2A relations are arrays
        if (special.includes('m2a')) {
          return `z.array(${relatedSchemaName})`;
        }
      }
    }

    // Handle enum/choice fields with predefined values
    if (options.choices && Array.isArray(options.choices) && options.choices.length > 0) {
      const choices = options.choices.map((choice: any) => {
        if (typeof choice === 'string') {
          return `"${choice}"`;
        } else if (choice && typeof choice === 'object' && choice.value) {
          return `"${choice.value}"`;
        }
        return `"${choice}"`;
      }).join(', ');
      
      return `z.enum([${choices}])`;
    }

    // Handle dropdown/select fields with options
    if (options.options && Array.isArray(options.options) && options.options.length > 0) {
      const choices = options.options.map((option: any) => {
        if (typeof option === 'string') {
          return `"${option}"`;
        } else if (option && typeof option === 'object' && option.value) {
          return `"${option.value}"`;
        } else if (option && typeof option === 'object' && option.text) {
          return `"${option.text}"`;
        }
        return `"${option}"`;
      }).join(', ');
      
      return `z.enum([${choices}])`;
    }

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
      case 'character varying':
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

    return imports + schemaDefinitions;
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
    const pluralToSingular: Record<string, string> = {
      'Applications': 'Application',
      'Banks': 'Bank',
      'Clerks': 'Clerk',
      'Languages': 'Language',
      'Globals': 'Global',
      'AuditAccountabilityLogs': 'AuditAccountabilityLog',
      'AuditActivityLogs': 'AuditActivityLog',
      'AuditSessions': 'AuditSession',
      'GlobalsTranslations': 'GlobalsTranslation'
    };

    if (pluralToSingular[word]) {
      return pluralToSingular[word];
    }

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
