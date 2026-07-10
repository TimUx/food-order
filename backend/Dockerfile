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

RUN apk add --no-cache postgresql-client

COPY package*.json ./
COPY prisma ./prisma/
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY modules ./modules/
COPY scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh
RUN mkdir -p plugins uploads backups && addgroup -g 1001 app && adduser -u 1001 -G app -D app && chown -R app:app /app && chmod +x /app/scripts/docker-entrypoint.sh

USER app

EXPOSE 3001

HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
  CMD wget -q --spider http://localhost:3001/api/health || exit 1

ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]
CMD ["start"]
