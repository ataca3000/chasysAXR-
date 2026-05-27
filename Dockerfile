# Etapa de construcción
FROM node:20-slim AS builder
WORKDIR /app

COPY package*.json ./
COPY apps/industrial-control/package*.json ./apps/industrial-control/

RUN npm install --include=dev

COPY . .

# Construimos el proyecto
RUN npm run build --workspace=industrial-control

# Etapa de producción
FROM node:20-slim
WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/industrial-control/dist ./apps/industrial-control/dist
COPY --from=builder /app/apps/industrial-control/package*.json ./apps/industrial-control/

# Exponer el puerto que usa Cloud Run (8080 por defecto)
ENV PORT=8080
EXPOSE 8080

# Variables de entorno de producción
ENV NODE_ENV=production

# Comando para iniciar el servidor de Express
CMD ["node", "apps/industrial-control/dist/server/server.js"]