import { ZodGenerator } from '../generators/zod-generator';
import { DirectusCollectionWithFields, ZodirectusConfig } from '../types';

describe('ZodGenerator', () => {
  let generator: ZodGenerator;
  let config: ZodirectusConfig;

  beforeEach(() => {
    config = {
      directusUrl: 'https://test.example.com',
      token: 'test-token',
    };
    generator = new ZodGenerator(config);
  });

  describe('generateSchema', () => {
    it('should generate a valid Zod schema for a collection', () => {
      const collection: DirectusCollectionWithFields = {
        collection: 'users',
        fields: [
          {
            field: 'id',
            type: 'uuid',
            schema: {
              name: 'id',
              table: 'users',
              data_type: 'uuid',
              is_nullable: false,
              is_unique: true,
              is_primary_key: true,
              has_auto_increment: false,
            },
            meta: {
              id: 1,
              collection: 'users',
              field: 'id',
              required: true,
              readonly: false,
              hidden: false,
            },
          },
          {
            field: 'email',
            type: 'varchar',
            schema: {
              name: 'email',
              table: 'users',
              data_type: 'varchar',
              max_length: 255,
              is_nullable: false,
              is_unique: true,
              is_primary_key: false,
              has_auto_increment: false,
            },
            meta: {
              id: 2,
              collection: 'users',
              field: 'email',
              required: true,
              readonly: false,
              hidden: false,
            },
          },
          {
            field: 'first_name',
            type: 'varchar',
            schema: {
              name: 'first_name',
              table: 'users',
              data_type: 'varchar',
              max_length: 100,
              is_nullable: true,
              is_unique: false,
              is_primary_key: false,
              has_auto_increment: false,
            },
            meta: {
              id: 3,
              collection: 'users',
              field: 'first_name',
              required: false,
              readonly: false,
              hidden: false,
            },
          },
        ],
      };

      const result = generator.generateSchema(collection);

      expect(result).toContain('export const UsersSchema = z.object({');
      expect(result).toContain('id: z.string().uuid()');
      expect(result).toContain('email: z.string()');
      expect(result).toContain('first_name: z.string().nullable().optional()');
    });

    it('should handle different field types correctly', () => {
      const collection: DirectusCollectionWithFields = {
        collection: 'test_types',
        fields: [
          {
            field: 'integer_field',
            type: 'integer',
            schema: {
              name: 'integer_field',
              table: 'test_types',
              data_type: 'integer',
              is_nullable: false,
              is_unique: false,
              is_primary_key: false,
              has_auto_increment: false,
            },
            meta: {
              id: 1,
              collection: 'test_types',
              field: 'integer_field',
              required: true,
              readonly: false,
              hidden: false,
            },
          },
          {
            field: 'boolean_field',
            type: 'boolean',
            schema: {
              name: 'boolean_field',
              table: 'test_types',
              data_type: 'boolean',
              is_nullable: false,
              is_unique: false,
              is_primary_key: false,
              has_auto_increment: false,
            },
            meta: {
              id: 2,
              collection: 'test_types',
              field: 'boolean_field',
              required: true,
              readonly: false,
              hidden: false,
            },
          },
          {
            field: 'json_field',
            type: 'json',
            schema: {
              name: 'json_field',
              table: 'test_types',
              data_type: 'json',
              is_nullable: true,
              is_unique: false,
              is_primary_key: false,
              has_auto_increment: false,
            },
            meta: {
              id: 3,
              collection: 'test_types',
              field: 'json_field',
              required: false,
              readonly: false,
              hidden: false,
            },
          },
        ],
      };

      const result = generator.generateSchema(collection);

      expect(result).toContain('integer_field: z.number().int()');
      expect(result).toContain('boolean_field: z.boolean()');
      expect(result).toContain('json_field: z.any().nullable().optional()');
    });

    it('should exclude hidden fields', () => {
      const collection: DirectusCollectionWithFields = {
        collection: 'test_hidden',
        fields: [
          {
            field: 'visible_field',
            type: 'varchar',
            schema: {
              name: 'visible_field',
              table: 'test_hidden',
              data_type: 'varchar',
              is_nullable: false,
              is_unique: false,
              is_primary_key: false,
              has_auto_increment: false,
            },
            meta: {
              id: 1,
              collection: 'test_hidden',
              field: 'visible_field',
              required: true,
              readonly: false,
              hidden: false,
            },
          },
          {
            field: 'hidden_field',
            type: 'varchar',
            schema: {
              name: 'hidden_field',
              table: 'test_hidden',
              data_type: 'varchar',
              is_nullable: false,
              is_unique: false,
              is_primary_key: false,
              has_auto_increment: false,
            },
            meta: {
              id: 2,
              collection: 'test_hidden',
              field: 'hidden_field',
              required: true,
              readonly: false,
              hidden: true,
            },
          },
        ],
      };

      const result = generator.generateSchema(collection);

      expect(result).toContain('visible_field: z.string()');
      expect(result).not.toContain('hidden_field');
    });
  });

  describe('generateSchemaFile', () => {
    it('should generate a complete schema file', () => {
      const schemas = [
        {
          collectionName: 'users',
          schema: 'export const UsersSchema = z.object({ id: z.string().uuid() });',
        },
        {
          collectionName: 'posts',
          schema: 'export const PostsSchema = z.object({ title: z.string() });',
        },
      ];

      const result = generator.generateSchemaFile(schemas);

      expect(result).toContain("import { z } from 'zod';");
      expect(result).toContain('export const UsersSchema = z.object({ id: z.string().uuid() });');
      expect(result).toContain('export const PostsSchema = z.object({ title: z.string() });');
    });
  });
});
