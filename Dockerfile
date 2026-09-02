FROM node:18-bullseye-slim

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY . .

EXPOSE 3001

CMD ["node", "server.js"]
