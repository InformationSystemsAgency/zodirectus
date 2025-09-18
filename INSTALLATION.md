# Simple Zodirectus Integration

This project integrates [zodirectus](https://github.com/InformationSystemsAgency/zodirectus) to automatically generate TypeScript types and Zod schemas from your Directus instance.

## Setup

1. **Install required packages:**
   ```bash
   pnpm add zodirectus@github:InformationSystemsAgency/zodirectus dotenv
   ```

2. **Configure environment variables:**
   Edit `.env` with your Directus credentials:
   ```env
   DIRECTUS_URL=http://localhost:8055
   DIRECTUS_TOKEN=your-access-token-here
   ```

3. **Add script:**
   Create `scripts/generate-types.js`:
   ```javascript
   #!/usr/bin/env node

   import { config } from 'dotenv';
   import { execSync } from 'child_process';

   // Load environment variables from .env file
   config();

   const DIRECTUS_URL = process.env.DIRECTUS_URL;
   const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN;

   // Check if required environment variables are set
   if (!DIRECTUS_URL) {
       console.error('Error: DIRECTUS_URL is not set in .env file');
       process.exit(1);
   }

   if (!DIRECTUS_TOKEN || DIRECTUS_TOKEN === 'your-access-token-here') {
       console.error('Error: DIRECTUS_TOKEN is not set or still has placeholder value in .env file');
       console.error('Please update your .env file with a real Directus access token');
       process.exit(1);
   }

   try {
       console.log(`Generating types from Directus at: ${DIRECTUS_URL}`);
       
       // Run zodirectus generate command
       const command = `zodirectus generate --url "${DIRECTUS_URL}" --token "${DIRECTUS_TOKEN}" --output src/types/directus`;
       execSync(command, { stdio: 'inherit' });
       
       console.log('Types generated successfully!');
   } catch (error) {
       console.error('Error generating types:', error.message);
       process.exit(1);
   }
   ```

4. **Config in package json**
   ```json
   {
     "scripts": {
       "generate-types": "node scripts/generate-types.js"
     },
     "dependencies": {
       "zodirectus": "github:InformationSystemsAgency/zodirectus",
       "dotenv": "^17.2.2"
     }
   }
   ```

4. **Run generator**
   ```bash
   pnpm run generate-types
   ```

## Generated Files

The generator creates TypeScript files in `src/types/directus/`:

- **Individual collection files** (e.g., `application.ts`, `bank.ts`) - Contains Zod schemas and TypeScript interfaces for each collection
- **`schemas.ts`** - Consolidated Zod schemas
- **`types.ts`** - Consolidated TypeScript types
- **`file-schemas.ts`** - File-related schemas

## Usage in Your Code

```typescript
import { DsxApplicationSchema, type DsxApplication } from './types/directus/application';
import { zValidator } from '@hono/zod-validator';

// Use in Hono routes
app.post('/applications', zValidator('json', DsxApplicationSchema), (c) => {
  const applicationData = c.req.valid('json');
  // applicationData is fully typed as DsxApplication
  return c.json(applicationData);
});
```

## Troubleshooting
- **Authentication errors**: Check your `DIRECTUS_TOKEN` in `.env`
- **Connection errors**: Verify `DIRECTUS_URL` is correct and accessible
- **Type errors**: The generated files use `z.lazy()` for circular references - this is normal

```

## Support

- 📖 [Documentation](README.md)
- 🐛 [Issues](https://github.com/InformationSystemsAgency/zodirectus/issues)
- 💬 [Discussions](https://github.com/InformationSystemsAgency/zodirectus/discussions)
