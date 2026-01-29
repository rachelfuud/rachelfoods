FROM node:20-alpine AS base

WORKDIR /app

COPY package*.json ./

RUN npm install --production=false

COPY . .

RUN npx prisma generate

RUN npm run build

FROM node:20-alpine AS production

RUN apk add --no-cache openssl

WORKDIR /app

COPY --from=base /app/dist ./dist
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package*.json ./
COPY --from=base /app/prisma ./prisma
COPY --from=base /app/scripts ./scripts

EXPOSE 3001

CMD npx prisma migrate deploy && npx ts-node scripts/auto-migrate-cms.ts && node dist/src/main.js
