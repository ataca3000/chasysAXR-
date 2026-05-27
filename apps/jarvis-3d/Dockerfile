FROM node:20-slim

WORKDIR /app

# Copiamos los archivos de dependencias
COPY package*.json ./

# Instalamos solo dependencias de producción
RUN npm install --omit=dev

# Copiamos el archivo compilado
COPY dist/server.cjs ./dist/server.cjs

# Exponemos el puerto que Cloud Run espera (8080 por defecto)
EXPOSE 8080

# Comando para arrancar el servidor
CMD ["node", "dist/server.cjs"]