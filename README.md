# EduPro Suite - Next.js Application

A minimal, production-ready Next.js application displaying "EduPro Suite is coming soon!" message.

## Features

- **Next.js 15.5.3** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **ESLint** for code quality
- **Production-optimized Docker container**
- **Responsive design** with centered message

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn
- Docker (for containerized deployment)

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

Build the application for production:
```bash
npm run build
npm start
```

## Docker Deployment

### Build Docker Image

```bash
docker build -t edupro-suite .
```

### Run Docker Container

```bash
docker run -p 3000:3000 edupro-suite
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Docker Configuration

The Dockerfile uses a multi-stage build process for optimization:

1. **Dependencies stage**: Installs npm dependencies
2. **Builder stage**: Builds the Next.js application
3. **Runner stage**: Creates minimal production image

Key optimizations:
- Uses Alpine Linux for smaller image size
- Leverages Next.js standalone output for minimal runtime
- Runs as non-root user for security
- Optimized layer caching

## Project Structure

```
edupro-suite/
├── app/
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Main page component
├── public/                  # Static assets
├── .dockerignore           # Docker ignore rules
├── .gitignore              # Git ignore rules
├── Dockerfile              # Production Docker configuration
├── eslint.config.mjs       # ESLint configuration
├── next.config.ts          # Next.js configuration
├── package.json            # Dependencies and scripts
├── postcss.config.mjs      # PostCSS configuration
├── tailwind.config.ts      # Tailwind CSS configuration
└── tsconfig.json           # TypeScript configuration
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Configuration

### Next.js Configuration

The application is configured with:
- `output: 'standalone'` for Docker optimization
- App Router for modern React patterns

### Tailwind CSS

Responsive design with:
- Gradient background
- Dark mode support
- Centered layout
- Typography scaling

## Deployment

The application is ready for deployment on:
- Docker containers
- Vercel
- Netlify
- Any Node.js hosting platform

## License

This project is created for educational purposes.
