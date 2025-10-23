# ================================
# Stage 1: Build React App
# ================================
FROM node:20-alpine AS build
WORKDIR /app

# Copy dependency manifests first (for better layer caching)
COPY package*.json ./

# Improve reliability for slow networks / emulated builds
RUN npm config set fetch-retries 5 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 120000 \
 && npm config set registry https://registry.npmjs.org/ \
 && npm install --prefer-offline --no-audit --progress=false

# Copy source code and build
COPY . .
RUN npm run build

# ================================
# Stage 2: Serve via Nginx
# ================================
FROM nginx:stable-alpine

WORKDIR /app

# Copy built React app
COPY --from=build /app/build /usr/share/nginx/html

# Copy custom Nginx config
COPY ../../nginx/default.conf /etc/nginx/conf.d/default.conf

# Expose web port
EXPOSE 80