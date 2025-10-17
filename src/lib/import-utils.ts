import { GeneratedSchema } from '../types';
import { StringUtils } from './string-utils';
import { DependencyUtils } from './dependency-utils';

/**
 * Utilities for generating imports in generated files
 */
export class ImportUtils {
  /**
   * Extract related collections from schema and type content
   */
  static extractRelatedCollections(result: GeneratedSchema): Set<string> {
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
            if (singularName !== StringUtils.toSingular(StringUtils.toPascalCase(result.collectionName)) &&
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
              singularName !== StringUtils.toSingular(StringUtils.toPascalCase(result.collectionName))) {
            relatedCollections.add(singularName);
          }
        });
      }
    }
    
    return relatedCollections;
  }

  /**
   * Generate import statements for related collections
   */
  static generateImportStatements(
    result: GeneratedSchema,
    results: GeneratedSchema[],
    circularDeps: string[][]
  ): string {
    const relatedCollections = this.extractRelatedCollections(result);
    const processedImports = new Set<string>(); // Track processed imports to avoid duplicates
    let importStatements = '';
    
    for (const singularName of relatedCollections) {
      // Find the actual collection name for this schema
      const relatedCollection = results.find(r => {
        const collectionSingular = StringUtils.toSingular(StringUtils.toPascalCase(r.collectionName));
        const collectionNameWithoutPrefix = r.collectionName.replace('directus_', '');
        const collectionSingularWithoutPrefix = StringUtils.toSingular(StringUtils.toPascalCase(collectionNameWithoutPrefix));
        
        return collectionSingular === singularName || 
               collectionSingularWithoutPrefix === singularName;
      });
      
      if (relatedCollection) {
        // Use the actual file name that was generated for this collection
        const relatedFileName = StringUtils.toKebabCase(relatedCollection.collectionName);
        
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
        const currentCollectionName = StringUtils.toSingular(StringUtils.toPascalCase(result.collectionName));
        const isCircular = DependencyUtils.isCircularDependency(currentCollectionName, singularName, circularDeps);
        
        // Create a unique key for this import to avoid duplicates
        const importKey = `${schemaName}:${relatedFileName}`;
        
        if (!processedImports.has(importKey)) {
          processedImports.add(importKey);
          if (isCircular) {
            // Use lazy import for circular dependencies to avoid runtime circular imports
            importStatements += `import { ${schemaName}, type ${typeName} } from './${relatedFileName}';\n`;
          } else {
            // Normal import for non-circular dependencies
            importStatements += `import { ${schemaName}, type ${typeName} } from './${relatedFileName}';\n`;
          }
        }
      }
    }
    
    return importStatements;
  }

  /**
   * Generate file schema import if needed
   */
  static generateFileSchemaImport(result: GeneratedSchema): string {
    if (result.schema && (result.schema.includes('DrxFileSchema') || result.schema.includes('DrxImageFileSchema'))) {
      return `import { DrxFileSchema, DrxImageFileSchema, type DrsFile, type DrsImageFile } from './file-schemas';\n`;
    }
    return '';
  }

  /**
   * Generate zod import if needed
   */
  static generateZodImport(result: GeneratedSchema): string {
    if (result.schema) {
      return `import { z } from 'zod';\n`;
    }
    return '';
  }
}
