# Zodirectus

Generate Zod schemas and TypeScript types from Directus collections automatically.

[![npm version](https://badge.fury.io/js/zodirectus.svg)](https://badge.fury.io/js/zodirectus)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🔄 **Automatic Generation**: Generate Zod schemas and TypeScript types from your Directus collections
- 🎯 **Type Safety**: Full TypeScript support with proper type inference
- 🚀 **CLI Tool**: Easy-to-use command-line interface
- 📦 **Library**: Use as a library in your Node.js applications
- 🔧 **Customizable**: Support for custom field mappings and configurations
- 🏗️ **Build Ready**: Generated files are ready for production use

## Installation

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

// Generate all schemas
const results = await zodirectus.generate();

// Generate for specific collection
const userSchema = await zodirectus.generateForCollection('users');
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
| `schemaFileName` | string | `schemas.ts` | Name of the schema file |
| `typesFileName` | string | `types.ts` | Name of the types file |
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
  -c, --collections <list>     Comma-separated list of collections
  -o, --output <dir>           Output directory (default: ./generated)
  --schemas                    Generate Zod schemas (default: true)
  --no-schemas                 Skip Zod schema generation
  --types                      Generate TypeScript types (default: true)
  --no-types                   Skip TypeScript type generation
  --schema-file <name>         Schema file name (default: schemas.ts)
  --type-file <name>           Type file name (default: types.ts)
  --system                     Include system collections
  -h, --help                   Show help message
  -v, --version                Show version information
```

## Generated Output

### Zod Schemas

```typescript
// schemas.ts
import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  role: z.string().optional(),
  status: z.string().optional(),
  date_created: z.string().datetime().optional(),
  date_updated: z.string().datetime().optional(),
});

export const PostSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  content: z.string().optional(),
  author: z.string().uuid(),
  status: z.string().optional(),
  date_created: z.string().datetime().optional(),
});
```

### TypeScript Types

```typescript
// types.ts
export interface UserType {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  status?: string;
  date_created?: string;
  date_updated?: string;
}

export interface PostType {
  id: string;
  title: string;
  content?: string;
  author: string;
  status?: string;
  date_created?: string;
}
```

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

export async function generateDirectusTypes() {
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
import { UserSchema } from '../generated/schemas';
import { UserType } from '../generated/types';

app.post('/api/users', async (req, res) => {
  try {
    const userData = UserSchema.parse(req.body);
    // userData is now fully typed and validated
    const user = await createUser(userData);
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
