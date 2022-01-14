const { Server } = require('boardgame.io/server');
const { Droll } = require('./src/game');
import serve from "koa-static";
import path from "path";

const PORT = process.env.PORT || 8000;
console.log(__dirname);
const server = Server({ games: [Droll] });

const publicPath = path.resolve(__dirname, "./public");
server.app.use(serve(publicPath));

server.run(PORT);
