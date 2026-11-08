# ---- Stage 1: build frontend + generate Prisma client ----
FROM node:20-slim AS build
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY backend/package*.json backend/
COPY frontend/package*.json frontend/
RUN npm --prefix backend install && npm --prefix frontend install
COPY . .
RUN npm --prefix backend run prisma:generate && npm --prefix frontend run build

# ---- Stage 2: runtime ----
FROM node:20-slim
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/backend ./backend
COPY --from=build /app/frontend/dist ./frontend/dist
EXPOSE 5000
CMD ["sh", "-c", "cd backend && npx prisma migrate deploy && node src/server.js"]
