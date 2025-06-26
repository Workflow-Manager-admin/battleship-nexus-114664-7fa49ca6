# Dockerfile for React Frontend (production deployment: nginx/Node multi-stage)

# Build stage
FROM node:18-alpine as build
WORKDIR /app
COPY package.json ./
COPY package-lock.json ./  # if exists
RUN npm install
COPY . ./
# Build with API_URL as build arg if provided
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL
RUN npm run build

# Production server (nginx)
FROM nginx:alpine
WORKDIR /usr/share/nginx/html
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf  # Custom config for SPA routing, to be added below
EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
