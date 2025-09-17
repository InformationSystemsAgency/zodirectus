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
    const options = field.meta?.options || {};

    // Handle relation fields
    if (this.isRelationField(field)) {
      const relatedCollection = this.getRelatedCollectionName(field);
      if (relatedCollection) {
        const relatedTypeName = `Drs${this.toPascalCase(relatedCollection)}`;
        
        // M2O relations are single objects
        if (special.includes('m2o')) {
          return relatedTypeName;
        }
        
        // O2M relations are arrays
        if (special.includes('o2m')) {
          return `${relatedTypeName}[]`;
        }
        
        // M2A relations are arrays
        if (special.includes('m2a')) {
          return `${relatedTypeName}[]`;
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
      }).join(' | ');
      
      return choices;
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
      }).join(' | ');
      
      return choices;
    }

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
