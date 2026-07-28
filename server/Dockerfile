FROM node:22-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the application
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the NestJS application
RUN npm run build

EXPOSE 1234

# Start the application in production mode
CMD ["npm", "run", "start:prod"]
