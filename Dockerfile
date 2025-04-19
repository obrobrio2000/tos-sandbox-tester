# Dockerfile
FROM node:23-alpine

WORKDIR /usr/src/app

COPY package.json package-lock.json* ./
RUN npm install --production

COPY . .

RUN npm run build

EXPOSE 3000
CMD ["node", "dist/server.js"]