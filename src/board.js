import React from "react";
import Divider from "@mui/material/Divider";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import {
  SPELL,
  AfterCast,
  CanMimic,
  CanTarget,
  GetDamage,
  GetRecovery,
} from "./game";

export class DrollBoard extends React.Component {
  constructor(props) {
    super(props);
    this.state = this._getEmptyState(this.props.ctx.numPlayers);
  }

  componentDidUpdate(prevProps) {
    if (this.props.ctx.phase !== prevProps.ctx.phase) {
      this.setState((state, props) => {
        return this._getEmptyState(props.ctx.numPlayers);
      });
    }
  }

  _getEmptyState(numPlayers) {
    let state = { spell: null, target: null };
    for (let i = 0; i < numPlayers; i++) {
      state[i] = [];
      state["excl" + i] = null;
      state["token" + i] = [];
      state["debuff" + i] = [];
    }
    return state;
  }

  _onSelectDice(playerID) {
    return (event, newSelected) => {
      this.setState((state, props) => {
        return { ...state, [playerID]: newSelected };
      });
    };
  }

  _onSelectDie(playerID) {
    return (event, newSelected) => {
      this.setState((state, props) => {
        return { ...state, ["excl" + playerID]: newSelected };
      });
    };
  }

  _onSelectTokens(playerID) {
    return (event, newSelected) => {
      this.setState((state, props) => {
        return { ...state, ["token" + playerID]: newSelected };
      });
    };
  }

  _onSelectDebuffs(playerID) {
    return (event, newSelected) => {
      this.setState((state, props) => {
        return { ...state, ["debuff" + playerID]: newSelected };
      });
    };
  }

  _onSelectSpell() {
    return (event, newSelected) => {
      this.setState({ spell: newSelected });
    };
  }

  _onSelectTarget() {
    return (event, newSelected) => {
      this.setState({ target: newSelected });
    };
  }

  _playerActive(playerID) {
    if (this.props.ctx.phase === "deploy" || this.props.ctx.phase === "idle") {
      let activePlayers = Object.keys(this.props.ctx.activePlayers);
      return activePlayers.indexOf(playerID.toString()) > -1;
    } else if (this.props.ctx.phase === "resolve") {
      if (this.props.ctx.activePlayers === null) {
        return playerID == this.props.ctx.currentPlayer;
      } else {
        let activePlayers = Object.keys(this.props.ctx.activePlayers);
        return activePlayers.indexOf(playerID.toString()) > -1;
      }
    } else {
      return playerID == this.props.ctx.currentPlayer;
    }
  }

  _selfActive(playerID) {
    return playerID == this.props.playerID && this._playerActive(playerID);
  }

  _tokensDisabled(playerID) {
    return (
      this.props.ctx.phase !== "resolve" ||
      this.props.ctx.activePlayers !== null ||
      this.props.playerID === null ||
      this.props.G.field[this.props.playerID].target === "" ||
      this.props.G.field[this.props.playerID].target != playerID
    );
  }

  _debuffsDisabled(playerID) {
    return (
      this.props.ctx.phase !== "resolve" ||
      this.props.ctx.activePlayers === null ||
      !this._selfActive(playerID)
    );
  }

  _availableDamage(playerID) {
    let target = this.props.G.field[playerID].target;
    if (target === "") {
      return 0;
    }

    return GetDamage(this.props.G, this.props.ctx, playerID, target);
  }

  _canDestroyTokens(playerID) {
    let target = this.props.G.field[playerID].target;
    if (target === "") {
      return false;
    }

    let damage = GetDamage(this.props.G, this.props.ctx, playerID, target);
    return this.state["token" + target].length <= damage;
  }

  _availableRecovery(playerID) {
    let target = this.props.G.field[playerID].target;
    return target === ""
      ? GetRecovery(this.props.G, this.props.ctx, playerID)
      : GetDamage(this.props.G, this.props.ctx, target, playerID) * -1;
  }

  _canRecoverDebuffs(playerID) {
    return (
      this.state["debuff" + playerID].length <=
      this._availableRecovery(playerID)
    );
  }

  _onRecruit(id) {
    this.props.moves.Choose(id);
  }

  _onDeploy(playerID) {
    let ids = [];
    for (let i = 0; i < this.props.G.field[playerID].party.length; i++) {
      ids.push(this.state[playerID].indexOf(i) > -1 ? 1 : 0);
    }
    this.props.moves.Deploy(ids);
  }

  _onReroll(playerID) {
    if (this.state[playerID].length === 0) {
      this.props.moves.Pass();
      return;
    }

    let ids = [];
    for (let i = 0; i < this.props.G.field[playerID].rolls.length; i++) {
      ids.push(this.state[playerID].indexOf(i) > -1 ? 1 : 0);
    }
    this.props.moves.Reroll(ids);
  }

  _onMimic(playerID) {
    if (this.state["excl" + playerID] === null) {
      this.props.moves.Pass();
    } else {
      this.props.moves.Mimic(this.state["excl" + playerID]);
    }
  }

  _onCast() {
    if (this.state.spell === null) {
      this.props.moves.NoCast();
    } else {
      this.props.moves.Cast(this.state.spell);
    }
  }

  _onTarget() {
    this.props.moves.SelectTarget(this.state.target);
  }

  _onDestroyTokens(playerID) {
    let target = this.props.G.field[playerID].target;
    let ids = [];
    for (let i = 0; i < this.props.G.field[target].tokens.length; i++) {
      ids.push(this.state["token" + target].indexOf(i) > -1 ? 1 : 0);
    }
    this.props.moves.AssignDamage(ids);
  }

  _onRecoverDebuffs(playerID) {
    let ids = [];
    for (let i = 0; i < this.props.G.field[playerID].debuffs.length; i++) {
      ids.push(this.state["debuff" + playerID].indexOf(i) > -1 ? 1 : 0);
    }
    this.props.moves.AssignRecovery(ids);
  }

  _onReady() {
    this.props.moves.Ready();
  }

  _renderField() {
    let dice = [];
    this.props.G.field.discover.forEach((die, i) => {
      dice.push(
        <Chip
          label={die}
          key={i}
          onClick={() => this._onRecruit(i)}
          variant="outlined"
          disabled={!this._playerActive(this.props.playerID)}
        />
      );
    });

    return (
      <Grid sx={{ my: 2, mx: 2 }}>
        <Typography textAlign="center" variant="h4">
          Field
        </Typography>
        <Stack direction="row" spacing={1}>
          {dice}
        </Stack>
      </Grid>
    );
  }

  _renderTargets() {
    let targets = [];
    for (let target of this.props.ctx.playOrder) {
      targets.push(
        <ToggleButton
          size="small"
          value={target}
          key={target}
          disabled={!CanTarget(this.props.G, this.props.ctx, target)}
        >
          Player {Number(target) + 1}
        </ToggleButton>
      );
    }

    return (
      <Grid sx={{ my: 2, mx: 2 }}>
        <Typography textAlign="center" variant="h4">
          Target
        </Typography>
        <Stack direction="row" spacing={1}>
          <ToggleButtonGroup
            value={this.state.target}
            exclusive
            onChange={this._onSelectTarget()}
          >
            {targets}
          </ToggleButtonGroup>
        </Stack>
      </Grid>
    );
  }

  _renderSpells() {
    let spells = [];
    Object.keys(SPELL).forEach((spell, i) => {
      spells.push(
        <ToggleButton
          size="small"
          value={i}
          key={i}
          disabled={AfterCast(this.props.G, this.props.ctx, SPELL[spell]) < 0}
        >
          {spell}
        </ToggleButton>
      );
    });

    return (
      <Grid sx={{ my: 2, mx: 2 }}>
        <Typography textAlign="center" variant="h4">
          Spells
        </Typography>
        <Stack direction="row" spacing={1}>
          <ToggleButtonGroup
            value={this.state.spell}
            exclusive
            onChange={this._onSelectSpell()}
          >
            {spells}
          </ToggleButtonGroup>
        </Stack>
      </Grid>
    );
  }

  _renderPlayer(id) {
    let dice = [];
    if (this.props.ctx.phase === "draft" || this.props.ctx.phase === "deploy") {
      this.props.G.field[id].party.forEach((die, i) => {
        dice.push(
          <ToggleButton size="small" value={i} key={i}>
            {die}
          </ToggleButton>
        );
      });
    } else {
      this.props.G.field[id].rolls.forEach(([die, roll], i) => {
        dice.push(
          <ToggleButton
            size="small"
            value={i}
            key={i}
            disabled={
              this.props.ctx.phase === "mimic" &&
              !CanMimic(this.props.G, this.props.ctx, i)
            }
          >
            {die}: {roll[0] === "O" ? "Q" + roll.substring(1) : roll}
          </ToggleButton>
        );
      });

      let lastId = 0;
      let newId = this.props.G.field[id].rolls.length;
      for (let die of this.props.G.field[id].party) {
        if (
          lastId < this.props.G.field[id].rolls.length &&
          die === this.props.G.field[id].rolls[lastId][0]
        ) {
          lastId++;
        } else {
          dice.push(
            <ToggleButton
              size="small"
              value={newId}
              key={newId}
              disabled={true}
            >
              {die}
            </ToggleButton>
          );
          newId++;
        }
      }
    }

    let diceList = null;
    if (this.props.ctx.phase === "mimic") {
      diceList = (
        <ToggleButtonGroup
          orientation="vertical"
          value={this.state["excl" + id]}
          exclusive
          onChange={this._onSelectDie(id)}
          disabled={id != this.props.playerID || !this._selfActive(id)}
        >
          {dice}
        </ToggleButtonGroup>
      );
    } else if (
      this.props.ctx.phase === "deploy" ||
      this.props.ctx.phase === "reroll"
    ) {
      diceList = (
        <ToggleButtonGroup
          orientation="vertical"
          value={this.state[id]}
          onChange={this._onSelectDice(id)}
          disabled={id != this.props.playerID || !this._selfActive(id)}
        >
          {dice}
        </ToggleButtonGroup>
      );
    } else {
      diceList = (
        <ToggleButtonGroup
          orientation="vertical"
          value={this.state[id]}
          disabled={true}
        >
          {dice}
        </ToggleButtonGroup>
      );
    }

    let tokens = [];
    this.props.G.field[id].tokens.forEach((token, i) => {
      tokens.push(
        <ToggleButton size="small" value={i} key={i}>
          {token}
        </ToggleButton>
      );
    });

    let debuffs = [];
    this.props.G.field[id].debuffs.forEach((debuff, i) => {
      debuffs.push(
        <ToggleButton size="small" value={i} key={i}>
          {debuff}
        </ToggleButton>
      );
    });

    let button = null;
    if (id != this.props.playerID) {
    } else if (this.props.ctx.phase === "deploy") {
      button = (
        <Grid container justifyContent="center" direction="row">
          <Button
            variant="contained"
            sx={{ my: 2 }}
            onClick={() => this._onDeploy(id)}
            disabled={
              this.state[id].length !== this.props.G.field[id].slots ||
              !this._selfActive(id) ||
              this.props.G.players[id] === undefined
            }
          >
            Deploy ({this.props.G.field[id].slots})
          </Button>
        </Grid>
      );
    } else if (this.props.ctx.phase === "reroll") {
      button = (
        <Grid container justifyContent="center" direction="row">
          <Button
            variant="contained"
            sx={{ mt: 2 }}
            onClick={() => this._onReroll(id)}
            disabled={!this._selfActive(id)}
          >
            {this.state[id].length === 0 ? "Pass" : "Reroll"}
          </Button>
        </Grid>
      );
    } else if (this.props.ctx.phase === "mimic") {
      button = (
        <Grid container justifyContent="center" direction="row">
          <Button
            variant="contained"
            sx={{ mt: 2 }}
            onClick={() => this._onMimic(id)}
            disabled={!this._selfActive(id) || this.state["excl" + id] === null}
          >
            Mimic
          </Button>
        </Grid>
      );
    } else if (this.props.ctx.phase === "spells") {
      button = (
        <Grid container justifyContent="center" direction="row">
          <Button
            variant="contained"
            sx={{ mt: 2 }}
            onClick={() => this._onCast()}
            disabled={!this._selfActive(id)}
          >
            {this.state.spell === null ? "Pass" : "Cast"}
          </Button>
        </Grid>
      );
    } else if (this.props.ctx.phase === "target") {
      button = (
        <Grid container justifyContent="center" direction="row">
          <Button
            variant="contained"
            sx={{ mt: 2 }}
            onClick={() => this._onTarget()}
            disabled={!this._selfActive(id) || this.state.target === null}
          >
            Target
          </Button>
        </Grid>
      );
    } else if (this.props.ctx.phase === "resolve") {
      if (this.props.ctx.activePlayers === null) {
        button = (
          <Grid container justifyContent="center" direction="row">
            <Button
              variant="contained"
              sx={{ mt: 2 }}
              onClick={() => this._onDestroyTokens(id)}
              disabled={!this._selfActive(id) || !this._canDestroyTokens(id)}
            >
              Damage ({this._availableDamage(id)})
            </Button>
          </Grid>
        );
      } else {
        button = (
          <Grid container justifyContent="center" direction="row">
            <Button
              variant="contained"
              sx={{ mt: 2 }}
              onClick={() => this._onRecoverDebuffs(id)}
              disabled={!this._selfActive(id) || !this._canRecoverDebuffs(id)}
            >
              Recover ({this._availableRecovery(id)})
            </Button>
          </Grid>
        );
      }
    } else if (this.props.ctx.phase === "idle") {
      button = (
        <Grid container justifyContent="center" direction="row">
          <Button
            variant="contained"
            sx={{ mt: 2 }}
            onClick={() => this._onReady()}
            disabled={!this._selfActive(id)}
          >
            Ready
          </Button>
        </Grid>
      );
    }

    let fontWeight =
      id == this.props.ctx.playOrder[this.props.G.priority]
        ? "bold"
        : "regular";
    let playerText =
      id == this.props.playerID
        ? "[Player " + (id + 1) + "]"
        : "Player " + (id + 1);
    let title = this._playerActive(id) ? (
      <Typography
        sx={{ color: "primary.main" }}
        textAlign="center"
        variant="h4"
        fontWeight={fontWeight}
      >
        {playerText}
      </Typography>
    ) : (
      <Typography textAlign="center" variant="h4" fontWeight={fontWeight}>
        {playerText}
      </Typography>
    );

    let extraText = "";
    for (let [desc, effect] of this.props.G.field[id].extras) {
      if (SPELL[desc] !== undefined) {
        extraText += "Casted " + desc + " for " + SPELL[desc] + "\n";
      }
      let redacted = effect[0] === "K" ? effect.substring(1) : effect;
      extraText += desc + ": " + redacted + "\n";
    }

    let rank = (
      <Grid container direction="row">
        <Grid item xs>
          <Typography textAlign="center" color="text.secondary" variant="body2">
            Rank: {this.props.G.field[id].rank}
          </Typography>
        </Grid>
      </Grid>
    );

    let target = (
      <Grid container direction="row">
        <Grid item xs>
          <Typography textAlign="center" color="text.secondary" variant="body2">
            Target:{" "}
            {this.props.G.field[id].target === ""
              ? "none"
              : "player " + (Number(this.props.G.field[id].target) + 1)}
          </Typography>
        </Grid>
      </Grid>
    );

    return (
      <Grid sx={{ my: 2, mx: 2 }} key={id}>
        {title}

        <Grid container direction="row">
          <Grid item xs>
            <Typography
              textAlign="center"
              color="text.secondary"
              variant="body2"
            >
              HP: {this.props.G.field[id].hp}
            </Typography>
          </Grid>

          <Grid item xs>
            <Typography
              textAlign="center"
              color="text.secondary"
              variant="body2"
            >
              MP: {this.props.G.field[id].mana}
            </Typography>
          </Grid>

          <Grid item xs>
            <Typography
              textAlign="center"
              color="text.secondary"
              variant="body2"
            >
              PT: {this.props.G.field[id].slots}
            </Typography>
          </Grid>
        </Grid>

        {this.props.G.field[id].rank !== -1 ? rank : null}
        {this.props.ctx.phase === "target" ||
        this.props.ctx.phase === "resolve" ||
        this.props.ctx.phase === "idle" ||
        this.props.ctx.gameover
          ? target
          : null}

        <Stack direction="column" spacing={1}>
          {diceList}
        </Stack>

        {button}

        <Grid container direction="row" sx={{ my: 2 }}>
          <Grid item xs>
            <Typography textAlign="center" variant="h6">
              Tokens
            </Typography>

            <Stack direction="row" justifyContent="center" spacing={1}>
              <ToggleButtonGroup
                value={this.state["token" + id]}
                onChange={this._onSelectTokens(id)}
                disabled={this._tokensDisabled(id)}
              >
                {tokens}
              </ToggleButtonGroup>
            </Stack>
          </Grid>

          <Grid item xs>
            <Typography textAlign="center" variant="h6">
              Debuffs
            </Typography>

            <Stack direction="row" justifyContent="center" spacing={1}>
              <ToggleButtonGroup
                value={this.state["debuff" + id]}
                onChange={this._onSelectDebuffs(id)}
                disabled={this._debuffsDisabled(id)}
              >
                {debuffs}
              </ToggleButtonGroup>
            </Stack>
          </Grid>
        </Grid>

        <Divider variant="middle" />

        <Typography textAlign="center" variant="h6" sx={{ my: 2 }}>
          Rerolls: {this.props.G.field[id].rerolls}
        </Typography>

        <Grid container direction="row" sx={{ my: 2 }}>
          <Grid item xs>
            <Typography textAlign="center" variant="h6">
              A
            </Typography>
            <Typography textAlign="center" variant="h6">
              {this.props.G.field[id].impact.attack}
            </Typography>
          </Grid>
          <Grid item xs>
            <Typography textAlign="center" variant="h6">
              B
            </Typography>
            <Typography textAlign="center" variant="h6">
              {this.props.G.field[id].impact.block}
            </Typography>
          </Grid>
          <Grid item xs>
            <Typography textAlign="center" variant="h6">
              D
            </Typography>
            <Typography textAlign="center" variant="h6">
              {this.props.G.field[id].impact.deal}
            </Typography>
          </Grid>
          <Grid item xs>
            <Typography textAlign="center" variant="h6">
              H
            </Typography>
            <Typography textAlign="center" variant="h6">
              {this.props.G.field[id].impact.heal}
            </Typography>
          </Grid>
          <Grid item xs>
            <Typography textAlign="center" variant="h6">
              C
            </Typography>
            <Typography textAlign="center" variant="h6">
              {this.props.G.field[id].impact.collateral}
            </Typography>
          </Grid>
          <Grid item xs>
            <Typography textAlign="center" variant="h6">
              F
            </Typography>
            <Typography textAlign="center" variant="h6">
              {this.props.G.field[id].impact.fire}
            </Typography>
          </Grid>
          <Grid item xs>
            <Typography textAlign="center" variant="h6">
              E
            </Typography>
            <Typography textAlign="center" variant="h6">
              {this.props.G.field[id].impact.earth}
            </Typography>
          </Grid>
          <Grid item xs>
            <Typography textAlign="center" variant="h6">
              I
            </Typography>
            <Typography textAlign="center" variant="h6">
              {this.props.G.field[id].impact.ice}
            </Typography>
          </Grid>
          <Grid item xs>
            <Typography textAlign="center" variant="h6">
              W
            </Typography>
            <Typography textAlign="center" variant="h6">
              {this.props.G.field[id].impact.wind}
            </Typography>
          </Grid>
          <Grid item xs>
            <Typography textAlign="center" variant="h6">
              V
            </Typography>
            <Typography textAlign="center" variant="h6">
              {this.props.G.field[id].impact.void}
            </Typography>
          </Grid>
        </Grid>

        <Typography
          component={"span"}
          textAlign="center"
          color="text.secondary"
          variant="body2"
        >
          <pre style={{ fontFamily: "inherit" }}>{extraText}</pre>
        </Typography>
      </Grid>
    );
  }

  render() {
    let players = [];
    for (let i = 0; i < this.props.ctx.numPlayers; i++) {
      players.push(this._renderPlayer(i));
    }

    return (
      <Grid
        container
        justifyContent="center"
        sx={{ width: "100%", bgcolor: "background.paper" }}
      >
        {this.props.ctx.phase === "draft" ||
        (this.props.ctx.phase === "spells" &&
          this.props.ctx.activePlayers !== null)
          ? this._renderField()
          : null}
        {this.props.ctx.phase === "spells" &&
        this.props.ctx.activePlayers === null
          ? this._renderSpells()
          : null}
        {this.props.ctx.phase === "target" ? this._renderTargets() : null}
        <Grid container justifyContent="center" direction="row" sx={{ my: 2 }}>
          {players}
        </Grid>
      </Grid>
    );
  }
}
