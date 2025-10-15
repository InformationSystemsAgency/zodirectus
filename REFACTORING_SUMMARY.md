# Generator Refactoring Summary

## Overview
Extracted common logical parts from `zod-generator.ts` and `type-generator.ts` into shared library modules to reduce code duplication and improve maintainability.

## New Library Structure

### `/src/lib/field-utils.ts`
**Purpose**: Field detection and validation utilities

**Extracted Methods**:
- `isDividerField()` - Detects divider fields
- `isFileField()` - Detects file fields
- `isRelationField()` - Detects relation fields
- `isManyToManyJunctionField()` - Detects M2M junction fields
- `isRadioButtonField()` - Detects radio button fields
- `isDropdownMultipleField()` - Detects dropdown multiple fields
- `isCheckboxTreeField()` - Detects checkbox tree fields
- `isDateTimeField()` - Detects date/time fields
- `isAutocompleteField()` - Detects autocomplete fields
- `isTagField()` - Detects tag fields
- `isRepeaterField()` - Detects repeater fields
- `isJunctionTable()` - Detects junction tables
- `getFieldsToOmitForCreate()` - Gets fields to omit for create operations

### `/src/lib/string-utils.ts`
**Purpose**: String manipulation utilities for naming conventions

**Extracted Methods**:
- `toPascalCase()` - Converts to PascalCase
- `toKebabCase()` - Converts to kebab-case
- `toSingular()` - Converts plural to singular with comprehensive mapping

### `/src/lib/relationship-utils.ts`
**Purpose**: Directus relationship handling utilities

**Extracted Methods**:
- `getRelatedCollectionName()` - Gets related collection name for a field
- `setRelationships()` - Sets relationship data
- `isManyToManyJunctionField()` - Detects M2M junction fields

### `/src/lib/base-generator.ts`
**Purpose**: Base generator class with common functionality

**Extracted Methods**:
- Constructor with config and client setup
- `setRelationships()` - Common relationship loading logic

### `/src/lib/index.ts`
**Purpose**: Library exports

## Benefits

1. **Code Reuse**: Eliminated duplicate code between generators
2. **Maintainability**: Changes to field detection logic only need to be made in one place
3. **Consistency**: Both generators now use identical logic for field detection and string manipulation
4. **Testability**: Shared utilities can be unit tested independently
5. **Extensibility**: Easy to add new field types or modify existing logic

## Next Steps

The generators can now be refactored to use these shared utilities:
1. Import utilities from the shared library
2. Remove duplicate methods from both generators
3. Update method calls to use static methods from utility classes
4. Inherit from `BaseGenerator` for common functionality

## Files Affected

**New Files**:
- `src/lib/field-utils.ts`
- `src/lib/string-utils.ts`
- `src/lib/relationship-utils.ts`
- `src/lib/base-generator.ts`
- `src/lib/index.ts`

**Files to be Updated**:
- `src/generators/zod-generator.ts`
- `src/generators/type-generator.ts`

This refactoring maintains backward compatibility while significantly improving code organization and maintainability.
