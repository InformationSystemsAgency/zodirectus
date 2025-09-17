import { Zodirectus } from '../index';

async function generate() {
  console.log('Starting generation...');
  const zodirectus = new Zodirectus({
    directusUrl: 'http://localhost:8055',
    token: 'OM81Do6DiEU5KCd12QnKpeb9AkSmWrVD',
    // collections: ['applications'], // Only generate for applications collection
  });

  console.log('Generating schemas and types...');
  const results = await zodirectus.generate();
  console.log('Generation completed!');
  console.log('Results:', results.length, 'collections processed');
}

generate().catch((err) => {
  console.error('Failed to generate types:', err);
  process.exit(1);
});