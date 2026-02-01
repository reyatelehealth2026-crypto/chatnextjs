# Standalone Inbox System

Modern customer communication management platform built with Next.js 15, TypeScript, and Tailwind CSS.

## Features

- 🚀 Next.js 15 with App Router
- 💎 TypeScript with strict mode
- 🎨 Tailwind CSS for styling
- 🧩 shadcn/ui component library
- ✅ Vitest for testing
- 📏 ESLint and Prettier for code quality
- 🔥 Turbopack for fast development

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm, yarn, or pnpm

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Development

```bash
# Run development server with Turbopack
npm run dev

# Run linter
npm run lint

# Format code
npm run format

# Check formatting
npm run format:check

# Run tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Project Structure

```
.
├── app/                  # Next.js App Router pages
│   ├── layout.tsx       # Root layout
│   ├── page.tsx         # Home page
│   └── globals.css      # Global styles
├── components/          # React components
│   └── ui/             # shadcn/ui components
├── lib/                # Utility functions
├── tests/              # Test files
├── public/             # Static assets
└── .kiro/              # Kiro spec files
```

## Tech Stack

- **Framework**: Next.js 15
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Testing**: Vitest
- **Linting**: ESLint
- **Formatting**: Prettier

## Requirements

This project implements the requirements specified in `.kiro/standalone-inbox-system/requirements.md`.

## License

Private - All rights reserved
