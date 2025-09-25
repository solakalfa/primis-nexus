FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
ENV PORT=8080 NODE_ENV=production
CMD ["node","services/api/server.mjs"]
