# Contributing to Zodirectus

Thank you for your interest in contributing to Zodirectus! This document provides guidelines and information for contributors.

## Getting Started

### Prerequisites

- Node.js 16 or higher
- pnpm
- Git

### Development Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/yourusername/zodirectus.git
   cd zodirectus
   ```
3. Install dependencies:
   ```bash
   pnpm install
   ```
4. Build the project:
   ```bash
   pnpm run build
   ```

## Development Workflow

### Available Scripts

- `pnpm run build` - Build the TypeScript project
- `pnpm run dev` - Build in watch mode
- `pnpm test` - Run tests
- `pnpm run test:watch` - Run tests in watch mode
- `pnpm run lint` - Run ESLint
- `pnpm run lint:fix` - Fix ESLint issues
- `pnpm run format` - Format code with Prettier

### Code Style

- Use TypeScript with strict mode enabled
- Follow ESLint rules defined in `.eslintrc.json`
- Use Prettier for code formatting
- Write meaningful commit messages
- Add tests for new features

### Testing

- Write unit tests for new functionality
- Ensure all tests pass before submitting PR
- Aim for good test coverage
- Use descriptive test names

## Submitting Changes

### Pull Request Process

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make your changes
3. Add tests if applicable
4. Run tests and linting:
   ```bash
   pnpm test
   pnpm run lint
   ```
5. Commit your changes:
   ```bash
   git commit -m "Add: your feature description"
   ```
6. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
7. Create a Pull Request

### Commit Message Format

Use conventional commits format:
- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `test:` for test additions/changes
- `refactor:` for code refactoring
- `chore:` for maintenance tasks

Examples:
- `feat: add support for custom field mappings`
- `fix: handle nullable fields correctly`
- `docs: update README with new examples`

## Issue Reporting

### Bug Reports

When reporting bugs, please include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details (Node.js version, OS, etc.)
- Error messages or logs if applicable

### Feature Requests

For feature requests, please include:
- Clear description of the feature
- Use case and motivation
- Any implementation ideas if you have them

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Respect different viewpoints and experiences

## License

By contributing to Zodirectus, you agree that your contributions will be licensed under the MIT License.

## Questions?

Feel free to open an issue or start a discussion if you have questions about contributing!
