FROM node:22-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci
COPY . .
RUN cp .env.example .env.development && npx prisma generate --schema database/schema.prisma
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /usr/src/app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/database ./database
COPY .env.example ./.env.production
EXPOSE 3000
CMD ["node","dist/src/main"]
