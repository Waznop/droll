import React from "react";
import { Lobby } from "boardgame.io/react";
import { DrollBoard } from "./board";
import { Droll } from "./game";
import "./lobby.css";

Droll.minPlayers = 2;
Droll.maxPlayers = 4;

const hostname = window.location.hostname;
const importedGames = [{
  game: Droll,
  board: DrollBoard,
}];

const LobbyView = () => (
  <div style={{ padding: 50 }}>
    <Lobby
      gameServer={`https://${hostname}`}
      lobbyServer={`https://${hostname}`}
      gameComponents={importedGames}
    />
  </div>
);

export default LobbyView;
