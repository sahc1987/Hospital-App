FROM node:20-alpine AS build
WORKDIR /app

ARG VITE_API_URL=http://localhost:8080
ENV VITE_API_URL=$VITE_API_URL
# true: the login page shows the seeded demo credentials
ARG VITE_DEMO=false
ENV VITE_DEMO=$VITE_DEMO

COPY package*.json ./
# --ignore-scripts: no dependency lifecycle scripts run during install (supply-chain hardening)
RUN npm ci --ignore-scripts --silent

COPY . .
RUN npm run build

# Unprivileged image: nginx runs as a non-root user, so it listens on 8080 (not 80)
FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
