# Installation Guide

## GitHub-Only Hosting

Zodirectus is currently hosted only on GitHub. Here are the ways to install and use it:

## Method 1: Install from GitHub (Recommended)

### As a dependency in your project
```bash
pnpm add https://github.com/InformationSystemsAgency/zodirectus.git
```

### Install globally for CLI usage
```bash
pnpm add -g https://github.com/InformationSystemsAgency/zodirectus.git
```

## Method 2: Clone and build locally

### For development or custom builds
```bash
# Clone the repository
git clone https://github.com/InformationSystemsAgency/zodirectus.git
cd zodirectus

# Install dependencies
pnpm install

# Build the project
pnpm run build

# Use the CLI locally
node dist/cli.js --help
```

## Method 3: Use in your project

### Import as a library
```typescript
import { Zodirectus } from 'zodirectus';

const zodirectus = new Zodirectus({
  directusUrl: 'https://your-directus.com',
  token: 'your-token',
});

const results = await zodirectus.generate();
```

### Use the CLI
```bash
# If installed globally
zodirectus --url https://your-directus.com --token your-token

# If installed locally in project
npx zodirectus --url https://your-directus.com --token your-token

# If built locally
node dist/cli.js --url https://your-directus.com --token your-token
```

## Troubleshooting

### Command not found
If you get "command not found" error after global installation:

1. Check if the global bin directory is in your PATH:
   ```bash
   pnpm config get global-bin-dir
   ```

2. Add it to your PATH if needed:
   ```bash
   export PATH="$(pnpm config get global-bin-dir):$PATH"
   ```

### Permission issues
If you get permission errors during global installation:

```bash
# Use sudo (not recommended)
sudo pnpm add -g https://github.com/yourusername/zodirectus.git

# Or configure pnpm to use a different directory
pnpm config set global-bin-dir ~/.local/bin
```

## Future: npm Publishing

When the package is ready for npm publishing, installation will be simpler:

```bash
pnpm add zodirectus
pnpm add -g zodirectus
```

## Support

- 📖 [Documentation](README.md)
- 🐛 [Issues](https://github.com/InformationSystemsAgency/zodirectus/issues)
- 💬 [Discussions](https://github.com/InformationSystemsAgency/zodirectus/discussions)
