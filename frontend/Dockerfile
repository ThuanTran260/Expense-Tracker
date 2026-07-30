# Stage 1: Build static files
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve via nginx
FROM nginx:alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html

# nginx config để hỗ trợ SPA routing
RUN echo 'server { \
  listen 80; \
  root /usr/share/nginx/html; \
  index index.html; \
  location / { try_files $uri $uri/ /index.html; } \
  location /api { proxy_pass http://backend:5000; } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
