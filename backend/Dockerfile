FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
RUN npm install

COPY tsconfig.json ./
COPY src ./src/
COPY modules ./modules/

RUN npm run prisma:generate
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV MODULES_DIR=/app/modules
ENV PLUGINS_DIR=/app/plugins

COPY package*.json ./
COPY prisma ./prisma/
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY modules ./modules/
RUN mkdir -p plugins

RUN mkdir -p uploads

EXPOSE 3001

CMD ["sh", "-c", "npx prisma db push && node dist/src/index.js"]
