FROM node:18-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files first for caching
COPY package.json pnpm-lock.yaml ./

# Install all dependencies including dev
RUN pnpm install

# Copy the rest of your source code
COPY . .

# Install nodemon for live-reload
RUN pnpm add nodemon -D

# Expose app port
EXPOSE 9999

# Start dev server with nodemon
CMD ["pnpm", "dev"]
