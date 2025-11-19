// Type declarations for React when node_modules is not available locally
// This allows TypeScript to work in VS Code even when dependencies are only in Docker

declare module 'react' {
  export * from '@types/react';
}

declare module 'react-dom' {
  export * from '@types/react-dom';
}

