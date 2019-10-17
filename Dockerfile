FROM node:10.16.3-jessie

WORKDIR /app

COPY . ./
RUN yarn install && yarn build

