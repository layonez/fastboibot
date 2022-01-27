FROM node:alpine AS build

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install forever -g
RUN npm i

COPY . .

CMD [ "npm", "start" ]