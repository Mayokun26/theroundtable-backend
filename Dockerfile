# Use Node.js LTS
FROM node:18-alpine

# Install zip
RUN apk add --no-cache zip

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application files
COPY . .

# Build TypeScript
RUN npm run build || true

# Create the lambda zip package manually as a backup in case the npm script fails
RUN mkdir -p dist && cd dist && zip -r lambda.zip * || echo "Backup zip creation failed, continuing anyway"

# Expose port
EXPOSE 5001

# Start the application
CMD ["npm", "start"]