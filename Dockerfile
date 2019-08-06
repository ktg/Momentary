FROM node:alpine AS builder

COPY package.json .

RUN mkdir /server
RUN mkdir /src

RUN npm install

COPY ./src ./src

RUN npm run build-client
RUN npm run build-server

RUN ls -al /server/static

FROM node:alpine

RUN mkdir /server
RUN mkdir /logs

COPY package.json .

RUN npm install --production

COPY --from=builder ./server ./server
COPY ./data/logs ./logs

CMD npm run express