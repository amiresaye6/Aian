FROM node:22-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the application
COPY . .

# Build the Next.js application
RUN npm run build

EXPOSE 3000

# Start the application
CMD ["npm", "start"]
