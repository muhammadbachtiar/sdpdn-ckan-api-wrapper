# ==========================================
# STAGE 1: Build Environment
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install openssl & libc6-compat yang dibutuhkan Prisma engine di Alpine Linux
RUN apk add --no-cache openssl libc6-compat

# Salin package manifest
COPY package*.json ./
COPY prisma ./prisma/

# Install seluruh dependencies (termasuk devDependencies untuk compile TypeScript)
RUN npm install

# Salin source code & tsconfig
COPY tsconfig.json ./
COPY src ./src/

# Generate Prisma Client khusus arsitektur Alpine Linux
RUN npx prisma generate

# Compile TypeScript ke folder dist/
RUN npm run build

# Hapus devDependencies agar ukuran node_modules ramping
RUN npm prune --omit=dev

# ==========================================
# STAGE 2: Production Runtime
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

# Pasang timezone Asia/Jakarta & openssl untuk Prisma runtime
RUN apk add --no-cache openssl tzdata
ENV TZ=Asia/Jakarta
ENV NODE_ENV=production

# Buat folder & atur kepemilikan user non-root (standar keamanan produksi)
USER node

# Salin dependencies produksi & Prisma Client dari builder
COPY --chown=node:node --from=builder /app/package*.json ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/prisma ./prisma
COPY --chown=node:node --from=builder /app/dist ./dist

# Port aplikasi
EXPOSE 3000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Jalankan server produksi
CMD ["node", "dist/src/server.js"]
