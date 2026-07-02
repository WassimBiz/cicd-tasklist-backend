FROM node:22-alpine AS build
WORKDIR /app
ENV DATABASE_URL="mysql://placeholder:3306/tasklist"
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY prisma ./prisma
RUN npx prisma generate
COPY src ./src
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV DATABASE_URL="mysql://placeholder:3306/tasklist"
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY prisma ./prisma
RUN npx prisma generate
COPY --from=build /app/dist ./dist
EXPOSE 3000
USER node
CMD ["node", "dist/server.js"]
