const { Server } = require('boardgame.io/server');
const { Droll } = require('./src/game');
const fs = require('fs');
import serve from "koa-static";
import path from "path";

const PORT = process.env.PORT || 8000;
console.log(__dirname);
const server = Server({
  games: [Droll],
  // https: {
  //   cert: fs.readFileSync('./cert/certificate.crt'),
  //   key: fs.readFileSync('./cert/private.key'),
  // },
});

const publicPath = path.resolve(__dirname, "./public");
server.app.use(serve(publicPath));

server.run(PORT);
