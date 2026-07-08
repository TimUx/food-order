FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
RUN npm install

COPY tsconfig.json ./
COPY src ./src/

RUN npm run prisma:generate
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY prisma ./prisma/
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

RUN mkdir -p uploads

EXPOSE 3001

CMD ["sh", "-c", "npx prisma db push && node dist/index.js"]
