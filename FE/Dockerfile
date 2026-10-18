# syntax=docker/dockerfile:1.7

FROM oven/bun:1.4 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile
COPY . .
RUN bun run build

# Serves the SPA and reverse-proxies /api to the backend, so the browser stays same-origin (no CORS).
FROM nginx:1.31-trixie
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
