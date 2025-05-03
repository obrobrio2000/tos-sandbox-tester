FROM node:23-alpine

WORKDIR /usr/src/app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000
CMD ["node", "dist/server.js"]

# TODO: multistage build ("from alpine", image size efficiency etc.), implement callback url (tunnel etc.)