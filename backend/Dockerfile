FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source code (will be overridden by volume mount in dev)
COPY src ./src

# Expose port
EXPOSE 3001

# Run in development mode with hot reload
# tsx watch will automatically reload on file changes
CMD ["npm", "run", "dev"]

