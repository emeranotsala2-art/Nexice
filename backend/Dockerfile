FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
ENV NODE_ENV=production
# Les migrations sont appliquées au démarrage (DB_MIGRATIONS_RUN=true)
EXPOSE 3000
CMD ["node", "dist/main.js"]
