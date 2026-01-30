FROM node:20-alpine AS base

WORKDIR /app

COPY package*.json ./

RUN npm install --production=false

COPY . .

RUN npx prisma generate

RUN npm run build

# Compile the migration script separately
RUN npx tsc scripts/auto-migrate-cms.ts --outDir dist/scripts --esModuleInterop --skipLibCheck

FROM node:20-alpine AS production

RUN apk add --no-cache openssl

WORKDIR /app

COPY --from=base /app/dist ./dist
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package*.json ./
COPY --from=base /app/prisma/schema.prisma ./prisma/schema.prisma
COPY --from=base /app/prisma/migrations ./prisma/migrations

EXPOSE 3001

CMD npx prisma migrate deploy && node dist/scripts/auto-migrate-cms.js && node dist/src/main.js
