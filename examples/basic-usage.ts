// Example usage of Zodirectus library
// 
// To use this example, install Zodirectus from GitHub:
// pnpm add https://github.com/InformationSystemsAgency/zodirectus.git

import { Zodirectus } from 'zodirectus';

async function example() {
  // Initialize Zodirectus with your Directus configuration
  const zodirectus = new Zodirectus({
    directusUrl: 'https://your-directus-instance.com',
    token: 'your-access-token', // or use email/password
    outputDir: './generated',
    generateTypes: true,
    generateSchemas: true,
    collections: ['users', 'posts'], // optional: specific collections
    includeSystemCollections: false,
  });

  try {
    // Generate schemas and types for all collections
    const results = await zodirectus.generate();
    
    console.log('Generated schemas for collections:', results.map(r => r.collectionName));
    
    // Generate for a specific collection
    const userSchema = await zodirectus.generateForCollection('users');
    console.log('User schema:', userSchema.schema);
    
    // Get available collections
    const collections = await zodirectus.getCollections();
    console.log('Available collections:', collections);
    
  } catch (error) {
    console.error('Error generating schemas:', error);
  }
}

// Example with custom field mappings
async function exampleWithCustomMappings() {
  const zodirectus = new Zodirectus({
    directusUrl: 'https://your-directus-instance.com',
    token: 'your-access-token',
    customFieldMappings: {
      'custom_uuid': 'z.string().uuid()',
      'custom_email': 'z.string().email()',
      'custom_phone': 'z.string().regex(/^\\+?[1-9]\\d{1,14}$/)',
    },
  });

  await zodirectus.generate();
}

// Example integration with Express.js
import express from 'express';
import { UserSchema } from './generated/schemas';
import { UserType } from './generated/types';

const app = express();
app.use(express.json());

app.post('/api/users', async (req, res) => {
  try {
    // Validate and parse request body using generated Zod schema
    const userData: UserType = UserSchema.parse(req.body);
    
    // userData is now fully typed and validated
    console.log('Creating user:', userData);
    
    // Your business logic here
    // const user = await createUser(userData);
    
    res.json({ success: true, user: userData });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Example with Next.js API route
export default async function handler(req: any, res: any) {
  if (req.method === 'POST') {
    try {
      const userData = UserSchema.parse(req.body);
      // Process user data
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(400).json({ error: 'Invalid data' });
    }
  }
}

// Run example
if (require.main === module) {
  example().catch(console.error);
}
