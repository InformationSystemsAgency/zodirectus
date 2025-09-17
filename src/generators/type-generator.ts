import { DirectusCollectionWithFields, DirectusField, ZodirectusConfig, GeneratedSchema } from '../types';

/**
 * TypeScript Type Generator for Directus collections
 */
export class TypeGenerator {
  private config: ZodirectusConfig;

  constructor(config: ZodirectusConfig) {
    this.config = config;
  }

  /**
   * Generate TypeScript type for a collection
   */
  generateType(collection: DirectusCollectionWithFields): string {
    const collectionName = this.toPascalCase(collection.collection);
    const typeName = `Drs${collectionName}`;
    
    const fields = collection.fields
      .filter(field => !field.meta?.hidden && !this.isDividerField(field))
      .map(field => this.generateFieldType(field))
      .join(';\n  ');

    return `export interface ${typeName} {
  ${fields};
}`;
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
   * Generate TypeScript type for a field
   */
  private generateFieldType(field: DirectusField): string {
    const fieldName = field.field;
    const tsType = this.getTypeScriptType(field);
    const isRequired = field.meta?.required ?? false;
    // const isNullable = field.schema?.is_nullable ?? true; // Currently not used

    let type = fieldName;
    
    // Handle optional fields
    if (!isRequired) {
      type += '?';
    }
    
    type += `: ${tsType}`;

    return type;
  }

  /**
   * Get TypeScript type for a Directus field
   */
  private getTypeScriptType(field: DirectusField): string {
    const directusType = field.schema?.data_type || field.type;
    const special = field.meta?.special || [];

    // Handle special field types first
    if (special.includes('uuid')) {
      return 'string';
    }
    
    if (special.includes('date-created') || special.includes('date-updated')) {
      return 'string';
    }

    if (special.includes('user-created') || special.includes('user-updated')) {
      return 'string';
    }

    if (special.includes('sort')) {
      return 'number';
    }

    // Handle regular field types
    switch (directusType) {
      case 'uuid':
        return 'string';
      
      case 'varchar':
      case 'char':
      case 'text':
      case 'longtext':
      case 'character varying':
        return 'string';
      
      case 'integer':
      case 'bigint':
      case 'smallint':
      case 'tinyint':
        return 'number';
      
      case 'decimal':
      case 'float':
      case 'double':
        return 'number';
      
      case 'boolean':
        return 'boolean';
      
      case 'date':
        return 'string';
      
      case 'datetime':
      case 'timestamp':
        return 'string';
      
      case 'time':
        return 'string';
      
      case 'json':
        return 'any';
      
      case 'geometry':
        return 'any';
      
      case 'binary':
        return 'string';
      
      default:
        // Check for custom field mappings
        if (this.config.customFieldMappings?.[directusType]) {
          return this.config.customFieldMappings[directusType];
        }
        
        // Default to any for unknown types
        return 'any';
    }
  }

  /**
   * Generate complete type file content
   */
  generateTypeFile(types: GeneratedSchema[]): string {
    const typeDefinitions = types
      .map(type => type.type)
      .join('\n\n');

    return typeDefinitions;
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
   * Generate union types for collections
   */
  generateUnionTypes(collections: string[]): string {
    const unionType = collections
      .map(collection => this.toPascalCase(collection) + 'Type')
      .join(' | ');

    return `export type DirectusCollection = ${unionType};`;
  }

  /**
   * Generate index types for easy access
   */
  generateIndexTypes(collections: string[]): string {
    const indexType = collections
      .map(collection => `  ${collection}: ${this.toPascalCase(collection)}Type;`)
      .join('\n');

    return `export interface DirectusCollections {
${indexType}
}`;
  }
}
