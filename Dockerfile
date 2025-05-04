# -------- dependencies stage --------
FROM node:23-alpine AS deps
WORKDIR /usr/src/app

# Install dependencies first to leverage cached Docker layers
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# -------- builder stage --------
FROM deps AS builder
# Copy source code and build the TypeScript project
COPY . .
RUN npm run build

# -------- production runtime stage --------
FROM node:23-alpine AS runner
WORKDIR /usr/src/app
ENV NODE_ENV=production

# Copy the compiled app and production deps only
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY --from=deps /usr/src/app/package*.json ./

EXPOSE 3000
CMD ["node", "dist/server.js"]