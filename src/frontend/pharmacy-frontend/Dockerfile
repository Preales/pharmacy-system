# Stage 1 — Build
FROM node:22-alpine AS build
WORKDIR /app

COPY src/frontend/pharmacy-frontend/package.json src/frontend/pharmacy-frontend/package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY src/frontend/pharmacy-frontend/ .
RUN npm run build -- --configuration production

# Stage 2 — Serve via nginx
FROM nginx:alpine AS production
COPY --from=build /app/dist/pharmacy-frontend/browser /usr/share/nginx/html
COPY src/frontend/pharmacy-frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
