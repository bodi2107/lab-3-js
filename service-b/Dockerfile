FROM node:20-alpine
WORKDIR /usr/src/app

# copy package files then install production deps
COPY package.json package-lock.json* ./
RUN npm install --production

# copy service and data
COPY service-b ./service-b
COPY movies.json ./movies.json

WORKDIR /usr/src/app/service-b
EXPOSE 3000
CMD ["node", "index.js"]
