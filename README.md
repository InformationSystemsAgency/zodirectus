# Zodirectus

Generate Zod schemas and TypeScript types from Directus collections automatically.

[![npm version](https://badge.fury.io/js/zodirectus.svg)](https://badge.fury.io/js/zodirectus)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Installation

📖 **For detailed and simple installation instructions, see [INSTALLATION.md](./INSTALLATION.md)**

### From GitHub
```bash
# Install directly from GitHub
pnpm add https://github.com/InformationSystemsAgency/zodirectus.git

# Or install globally for CLI usage
pnpm add -g https://github.com/InformationSystemsAgency/zodirectus.git
```

### Alternative: Clone and build locally
```bash
# Clone the repository
git clone https://github.com/InformationSystemsAgency/zodirectus.git
cd zodirectus

# Install dependencies and build
pnpm install
pnpm run build

# Use the CLI locally
node dist/cli.js --help
```

## Quick Start

### CLI Usage

Generate schemas and types for all collections:

```bash
zodirectus --url https://your-directus-instance.com --token your-access-token
```

Generate for specific collections:

```bash
zodirectus --url https://your-directus-instance.com --token your-token --collections users,posts,comments
```

Using email/password authentication:

```bash
zodirectus --url https://your-directus-instance.com --email user@example.com --password your-password
```

### Library Usage

```typescript
import { Zodirectus } from 'zodirectus';

const zodirectus = new Zodirectus({
  directusUrl: 'https://your-directus-instance.com',
  token: 'your-access-token',
  outputDir: './generated',
  generateTypes: true,
  generateSchemas: true,
});

// Generate all schemas and types
const results = await zodirectus.generate();

// Generate for specific collections only
const zodirectusSpecific = new Zodirectus({
  directusUrl: 'https://your-directus-instance.com',
  token: 'your-access-token',
  collections: ['users', 'posts'], // Only generate for these collections
  outputDir: './generated',
});

const specificResults = await zodirectusSpecific.generate();
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `directusUrl` | string | - | **Required.** Your Directus instance URL |
| `token` | string | - | Authentication token (alternative to email/password) |
| `email` | string | - | Email for authentication |
| `password` | string | - | Password for authentication |
| `collections` | string[] | - | Specific collections to generate (default: all) |
| `outputDir` | string | `./generated` | Output directory for generated files |
| `generateTypes` | boolean | `true` | Generate TypeScript types |
| `generateSchemas` | boolean | `true` | Generate Zod schemas |
| `includeSystemCollections` | boolean | `false` | Include Directus system collections |
| `customFieldMappings` | object | `{}` | Custom field type mappings |

## CLI Options

```bash
zodirectus [options]

Options:
  -u, --url <url>              Directus instance URL (required)
  -t, --token <token>          Authentication token
  -e, --email <email>          Email for authentication
  -p, --password <password>    Password for authentication
  -c, --collections <list>     Comma-separated list of collections to generate
  -o, --output <dir>           Output directory (default: ./generated)
  --schemas                    Generate Zod schemas (default: true)
  --no-schemas                 Skip Zod schema generation
  --types                      Generate TypeScript types (default: true)
  --no-types                   Skip TypeScript type generation
  --system                     Include system collections
  -h, --help                   Show this help message
  -v, --version                Show version information

Examples:
  zodirectus --url https://api.example.com --token your-token
  zodirectus --url https://api.example.com --email user@example.com --password pass123
  zodirectus --url https://api.example.com --collections users,posts --output ./types
```

## Generated Output

Zodirectus generates individual files for each collection in the output directory. Each file contains both Zod schemas and TypeScript types for that collection.

### File Structure

```
generated/
├── user.ts
├── post.ts
├── comment.ts
└── ...
```

### Zod Schemas

Each collection file includes multiple Zod schemas:

```typescript
// user.ts
import { z } from 'zod';

export const DrxUserSchema = z.object({
  id: z.string().uuid().optional(),
  email: z.string().email(),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  date_created: z.string().datetime().nullable().optional(),
  date_updated: z.string().datetime().nullable().optional(),
});

export const DrxUserCreateSchema = DrxUserSchema.omit({
  id: true,
  user_created: true,
  date_created: true,
  user_updated: true,
  date_updated: true
});

export const DrxUserUpdateSchema = DrxUserSchema.partial().required({
  id: true
});

export const DrxUserGetSchema = DrxUserSchema;
```

### TypeScript Types

Each collection file includes TypeScript interfaces using utility types:

```typescript
// user.ts
export interface DrsUser {
  id?: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  status?: string;
  date_created?: string;
  date_updated?: string;
}

export type DrsUserCreate = Omit<DrsUser, "id" | "user_created" | "date_created" | "user_updated" | "date_updated">;

export type DrsUserUpdate = Partial<DrsUser> & Required<Pick<DrsUser, "id">>;

export type DrsUserGet = DrsUser;
```

## Naming Conventions

Zodirectus uses consistent naming conventions for generated schemas and types:

### Schema Names
- **Base Schema**: `Drx{CollectionName}Schema` (e.g., `DrxUserSchema`)
- **Create Schema**: `Drx{CollectionName}CreateSchema` (e.g., `DrxUserCreateSchema`)
- **Update Schema**: `Drx{CollectionName}UpdateSchema` (e.g., `DrxUserUpdateSchema`)
- **Get Schema**: `Drx{CollectionName}GetSchema` (e.g., `DrxUserGetSchema`)

### Type Names
- **Base Type**: `Drs{CollectionName}` (e.g., `DrsUser`)
- **Create Type**: `Drs{CollectionName}Create` (e.g., `DrsUserCreate`)
- **Update Type**: `Drs{CollectionName}Update` (e.g., `DrsUserUpdate`)
- **Get Type**: `Drs{CollectionName}Get` (e.g., `DrsUserGet`)

### File Names
- Collection names are converted to kebab-case (e.g., `user.ts`, `user-profile.ts`)

## Features

- 🔄 **Automatic Generation**: Generate Zod schemas and TypeScript types from your Directus collections
- 🎯 **Type Safety**: Full TypeScript support with proper type inference
- 🚀 **CLI Tool**: Easy-to-use command-line interface
- 📦 **Library**: Use as a library in your Node.js applications
- 🔧 **Customizable**: Support for custom field mappings and configurations
- 🏗️ **Build Ready**: Generated files are ready for production use
- 🔗 **Relations Support**: Automatic handling of Directus relations (M2O, O2M, M2A)
- 🔄 **Circular Dependencies**: Smart handling of circular dependencies with lazy schemas
- 📝 **CRUD Schemas**: Generate Create, Update, and Get schemas for each collection
- 🎨 **Utility Types**: Use TypeScript utility types (Omit, Partial, Required) for type safety

## Field Type Mappings

Zodirectus automatically maps Directus field types to appropriate Zod schemas and TypeScript types:

| Directus Type | Zod Schema | TypeScript Type |
|---------------|------------|-----------------|
| `uuid` | `z.string().uuid()` | `string` |
| `varchar`, `text` | `z.string()` | `string` |
| `integer`, `bigint` | `z.number().int()` | `number` |
| `decimal`, `float` | `z.number()` | `number` |
| `boolean` | `z.boolean()` | `boolean` |
| `date` | `z.string().date()` | `string` |
| `datetime` | `z.string().datetime()` | `string` |
| `json` | `z.any()` | `any` |

## Supported Directus Field Types

Zodirectus handles the following Directus field types and interfaces:

### Basic Field Types
- **String Fields**: `varchar`, `text`, `character varying`
- **Numeric Fields**: `integer`, `bigint`, `decimal`, `float`, `numeric`, `real`
- **Boolean Fields**: `boolean`
- **Date/Time Fields**: `date`, `datetime`, `timestamp`, `time`
- **UUID Fields**: `uuid`
- **JSON Fields**: `json`, `jsonb`

### Special Field Types
- **File Fields**: `file` interface → Single file object
- **Image File Fields**: `file-image` interface → Image file object with dimensions
- **Multiple Files**: `files` interface → Array of file objects
- **Repeater Fields**: `repeater` type → Array of objects with sub-fields
- **Tag Fields**: `tag` interface → Array of strings or enums
- **Autocomplete Fields**: `autocomplete` interface → String with suggestions
- **Checkbox Tree Fields**: `select-multiple-checkbox-tree` interface → Array of enums from hierarchical structure
- **Dropdown Multiple Fields**: `select-multiple-dropdown` interface → Array of enums
- **Radio Button Fields**: `select-radio` interface → Single enum value
- **Choice Fields**: Fields with `choices` or `options` → Enum validation

### Relation Fields
- **Many-to-One (M2O)**: References to other collections
- **One-to-Many (O2M)**: Arrays of related collection objects
- **Many-to-Any (M2A)**: Polymorphic relations

### System Fields
- **Hidden Fields**: `user_created`, `user_updated`, `date_created`, `date_updated`, `status`, `sort`
- **ID Fields**: Automatically added if missing from collection
- **Divider Fields**: Automatically excluded from generation

## Custom Field Mappings

You can provide custom field type mappings:

```typescript
const zodirectus = new Zodirectus({
  directusUrl: 'https://your-directus-instance.com',
  token: 'your-token',
  customFieldMappings: {
    'custom_type': 'z.customValidator()',
    'another_type': 'z.string().min(5)',
  },
});
```

## Integration Examples

### With Next.js

```typescript
// lib/directus.ts
import { Zodirectus } from 'zodirectus';

export async function generateDgitirectusTypes() {
  const zodirectus = new Zodirectus({
    directusUrl: process.env.DIRECTUS_URL!,
    token: process.env.DIRECTUS_TOKEN!,
    outputDir: './types',
  });

  await zodirectus.generate();
}
```

### With Express.js

```typescript
// routes/api.ts
import { DrxUserCreateSchema, type DrsUserCreate } from '../generated/user';

app.post('/api/users', async (req, res) => {
  try {
    const userData = DrxUserCreateSchema.parse(req.body);
    // userData is now fully typed and validated as DrsUserCreate
    const user = await createUser(userData);
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: 'Invalid user data' });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const { DrxUserUpdateSchema, type DrsUserUpdate } = await import('../generated/user');
    const userData = DrxUserUpdateSchema.parse({ id: req.params.id, ...req.body });
    // userData is now fully typed and validated as DrsUserUpdate
    const user = await updateUser(userData);
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: 'Invalid user data' });
  }
});
```

### Build Script Integration

```json
{
  "scripts": {
    "generate:types": "zodirectus --url $DIRECTUS_URL --token $DIRECTUS_TOKEN",
    "build": "pnpm run generate:types && pnpm run build:app"
  }
}
```

**Note**: If you installed from GitHub, make sure the `zodirectus` command is available in your PATH, or use the full path to the installed binary.

## Development

### Prerequisites

- Node.js 16+
- pnpm
- Directus instance for testing

### Setup

```bash
git clone https://github.com/InformationSystemsAgency/zodirectus.git
cd zodirectus
pnpm install
pnpm run build
```

### Testing

```bash
pnpm test
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- 📖 [Documentation](https://github.com/InformationSystemsAgency/zodirectus#readme)
- 🐛 [Issue Tracker](https://github.com/InformationSystemsAgency/zodirectus/issues)
- 💬 [Discussions](https://github.com/InformationSystemsAgency/zodirectus/discussions)

## Installation from GitHub

Since this package is currently hosted only on GitHub, you can install it using:

```bash
# Install as a dependency
pnpm add https://github.com/InformationSystemsAgency/zodirectus.git

# Install globally for CLI usage
pnpm add -g https://github.com/InformationSystemsAgency/zodirectus.git
```

## Changelog

### v1.0.0
- Initial release
- CLI tool
- Library support
- Zod schema generation
- TypeScript type generation
- Custom field mappings
