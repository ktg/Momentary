FROM node:alpine

RUN mkdir /server

COPY ../package.json .

RUN npm install

COPY ../server ./server

RUN mkdir /logs
COPY ./logs ./logs

CMD npm run express