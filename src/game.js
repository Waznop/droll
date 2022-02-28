import { INVALID_MOVE, PlayerView, ActivePlayers } from "boardgame.io/core";

const START_PARTY = 6;
const START_SLOTS = 4;
const START_MANA = 0;
const START_HP = 20;
const START_REROLLS = 2;

const DECK_COPIES = 3;
const DISCOVER_SIZE = 3;

export const SPELL = {
  Recruit: "V", // +1 party
  Rumble: "E", // (nB)A
  Harden: "EV", // BBB
  Ambush: "WV", // G
  Pierce: "WWV", // DDDD
  Fireball: "FVV", // AAAA
  Fireblast: "FFV", // AAAAAA
  Tranquility: "IV", // HH
  Crystallize: "IVVV", // no damage
  Expand: "VVVVVVVV", // +1 slot
};

const DICE = {
  // Warriors
  Fighter: ["X", "AAA", "AA", "AA", "A", "B"],
  Paladin: ["X", "BBB", "BB", "BB", "B", "A"],
  Barbarian: ["X", "A", "CAAA", "CAAA", "A", "AA"],
  Blacksmith: ["X", "UU", "U", "U", "A", "F"], // fire
  Monk: ["X", "AB", "AH", "BH", "B", "W"], // wind
  Commander: ["X", "A", "TA", "TB", "B", "AB"],
  Berserker: ["X", "AAAA", "J", "N", "A", "I"], // ice
  Warden: ["X", "BBBB", "P", "C", "B", "E"], // earth

  // Rogues
  Bandit: ["X", "D", "G", "G", "BB", "E"], // earth
  Hunter: ["X", "DD", "D", "D", "G", "F"], // fire
  Assassin: ["X", "SS", "SSS", "SSS", "A", "W"], // wind
  Pirate: ["X", "D", "CDD", "CDD", "B", "I"], // ice
  Mechanic: ["X", "TD", "D", "D", "BB", "E"], // earth
  Thief: ["X", "P", "G", "G", "A", "I"], // ice
  Ninja: ["X", "QA", "G", "D", "A", "F"], // fire
  Bard: ["X", "QR", "G", "H", "B", "W"], // wind

  // Mages
  Arcanist: ["X", "F", "E", "W", "I", "X"],
  Sorcerer: ["X", "VV", "V", "V", "VV", "X"],
  Cleric: ["X", "HH", "I", "I", "HH", "X"], // ice
  Alchemist: ["X", "AP", "F", "F", "H", "X"], // fire
  Illusionist: ["X", "M", "W", "W", "H", "X"], // wind
  Shaman: ["X", "TH", "E", "E", "AH", "X"], // earth
  Warlock: ["X", "AJ", "F", "W", "AA", "X"], // fire & wind
  Druid: ["X", "QB", "E", "I", "BH", "X"], // earth & ice
};

function InitDeck(ctx) {
  let out = [];
  for (let i = 0; i < DECK_COPIES; i++) {
    out = out.concat(Object.keys(DICE));
  }
  return ctx.random.Shuffle(out);
}

function InitImpact() {
  return {
    attack: 0,
    block: 0,
    deal: 0,
    heal: 0,
    collateral: 0,
    fire: 0,
    earth: 0,
    ice: 0,
    wind: 0,
    void: 0,
    tokens: [],
    debuffs: [],
    immune: false,
  };
}

function InitPlayer() {
  return {
    hp: START_HP,
    mana: START_MANA,
    slots: START_SLOTS,
    party: [],
    tokens: [],
    debuffs: [],
    rank: -1,

    rerolls: START_REROLLS,
    pass: false,
    rolls: [],
    extras: [],
    impact: InitImpact(),
    target: "",
  };
}

function Setup(ctx) {
  let field = {
    discover: [],
    shouldDiscover: false,
  };
  let players = {};
  for (let player of ctx.playOrder) {
    field[player] = InitPlayer();
    players[player] = {
      rolls: [],
    };
  }
  return {
    field: field,
    priority: 0,
    alive: [...ctx.playOrder],
    secret: {
      deck: InitDeck(ctx),
    },
    players: players,
  };
}

function ResetPass(G, ctx) {
  for (let player of ctx.playOrder) {
    G.field[player].pass = false;
  }
}

function AllPass(G, ctx) {
  for (let player of ctx.playOrder) {
    if (!G.field[player].pass) {
      return false;
    }
  }
  return true;
}

function NextNotPass(G, ctx) {
  for (let i = 0; i < ctx.playOrder.length; i++) {
    let idx = (ctx.playOrderPos + 1 + i) % ctx.playOrder.length;
    let player = ctx.playOrder[idx];
    if (!G.field[player].pass) {
      return idx;
    }
  }
  return (ctx.playOrderPos + 1) % ctx.playOrder.length;
}

function FirstNotPass(G, ctx) {
  for (let i = 0; i < ctx.playOrder.length; i++) {
    let idx = (G.priority + i) % ctx.playOrder.length;
    let player = ctx.playOrder[idx];
    if (!G.field[player].pass) {
      return idx;
    }
  }
  return G.priority;
}

export function Sum(ids) {
  let sum = 0;
  for (let i = 0; i < ids.length; i++) {
    if (ids[i]) {
      sum++;
    }
  }
  return sum;
}

function ApplyExtras(G, ctx) {
  for (let player of ctx.playOrder) {
    for (let token of G.field[player].tokens) {
      G.field[player].extras.push(["Token", token]);
    }

    for (let debuff of G.field[player].debuffs) {
      G.field[player].extras.push(["Debuff", debuff]);
    }
    Resolve(G, ctx, player);
  }
}

function Resolve(G, ctx, player) {
  let impact = InitImpact();
  let sneaks = 0;
  let sneaksValid = true;
  let ganks = 1;
  let upgrades = 0;

  function Process(text) {
    for (let i = 0; i < text.length; i++) {
      switch (text[i]) {
        case "A":
          impact.attack++;
          break;
        case "B":
          impact.block++;
          break;
        case "D":
          impact.deal++;
          break;
        case "H":
          impact.heal++;
          break;
        case "C":
          impact.collateral++;
          break;
        case "W":
          impact.wind++;
          break;
        case "I":
          impact.ice++;
          break;
        case "F":
          impact.fire++;
          break;
        case "E":
          impact.earth++;
          break;
        case "V":
          impact.void++;
          break;

        case "S":
          if (i === 0 && sneaks !== 0) {
            sneaksValid = false;
          } else {
            sneaks++;
          }
          break;
        case "G":
          ganks *= 2;
          break;
        case "U":
          upgrades++;
          break;
        case "N":
          upgrades--;
          break;

        case "Q":
          if (text[i + 1] === "R") {
            G.field[player].rerolls++;
          } else {
            G.field[player].extras.push(["Quick", text[i + 1]]);
          }
          i++;
          break;
        case "O":
          i++;
          break;
        case "T":
          impact.tokens.push(text[i + 1]);
          i++;
          break;
        case "Y":
          impact.debuffs.push(text[i + 1]);
          i++;
          break;
        case "P":
          impact.debuffs.push("C");
          break;
        case "J":
          impact.debuffs.push("N");
          break;
        case "K":
          if (text.substring(i + 1) === "immune") {
            impact.immune = true;
          }
          break;
      }
    }
  }

  for (let roll of G.field[player].rolls) {
    Process(roll[1]);
    roll[1] = roll[1].replace("Q", "O");
  }
  for (let extra of G.field[player].extras) {
    Process(extra[1]);
  }

  if (ganks > 1) {
    impact.attack += ganks;
  }
  if (impact.attack > 0) {
    impact.attack = Math.max(impact.attack + upgrades, 0);
  }
  if (impact.attack > 0) {
    sneaksValid = false;
  }
  if (sneaksValid) {
    impact.deal += sneaks;
  }
  if (impact.deal > 0) {
    impact.deal = Math.max(impact.deal + upgrades, 0);
  }
  if (impact.block > 0) {
    impact.block = Math.max(impact.block + upgrades, 0);
  }

  G.field[player].impact = impact;
}

function VariableDiscoverSize(G, ctx) {
  return ctx.playOrder.length + 1;
}

function Discover(G, ctx, size) {
  if (G.secret.deck.length >= size && G.field.discover.length === 0) {
    for (let i = 0; i < size; i++) {
      G.field.discover.push(G.secret.deck.pop());
    }
  }
}

function Undiscover(G, ctx) {
  G.secret.deck = ctx.random.Shuffle(G.secret.deck.concat(G.field.discover));
  G.field.discover = [];
}

export function AfterCast(G, ctx, player, cost) {
  let f = G.field[player].impact.fire;
  let e = G.field[player].impact.earth;
  let i = G.field[player].impact.ice;
  let w = G.field[player].impact.wind;
  let v = G.field[player].impact.void + G.field[player].mana;

  for (let m of cost) {
    switch (m) {
      case "F":
        f--;
        break;
      case "E":
        e--;
        break;
      case "I":
        i--;
        break;
      case "W":
        w--;
        break;
      case "V":
        v--;
    }
  }

  if (f < 0 || e < 0 || i < 0 || w < 0) {
    return -1;
  }

  v += f + e + i + w;
  return v >= 0 ? v : -1;
}

export function GetDamage(G, ctx, offense, defense) {
  let attack = offense === "" ? 0 : G.field[offense].impact.attack;
  let deal = offense === "" ? 0 : G.field[offense].impact.deal;
  let block = G.field[defense].impact.block;
  let heal = G.field[defense].impact.heal;
  let immune = G.field[defense].impact.immune;

  let damage = 0;
  damage -= heal;
  if (!immune) {
    damage += Math.max(attack - block, 0) + deal;
  }
  return damage;
}

function ApplyDamage(G, ctx, offense, defense, damage) {
  if (damage > 0) {
    let debuffs = G.field[offense].impact.debuffs;
    if (debuffs.length > 0) {
      G.field[defense].debuffs = G.field[defense].debuffs.concat(debuffs);
    }
    G.field[defense].hp -= damage;
  }
}

function SendToRecovery(G, ctx, player) {
  let value = ctx.activePlayers === null ? {} : ctx.activePlayers;
  value[player] = {
    stage: "recovery",
  };
  ctx.events.setActivePlayers({
    value: value,
  });
}

function ApplyRecovery(G, ctx, player, recovery) {
  G.field[player].hp = Math.min(START_HP, G.field[player].hp + recovery);
}

function ApplyCollateral(G, ctx, player) {
  if (!G.field[player].impact.immune) {
    G.field[player].hp -= G.field[player].impact.collateral;
  }
}

export function CanMimic(G, ctx, id) {
  let target = G.field[ctx.currentPlayer].rolls[id][1];
  return (
    target[0] !== "M" &&
    target[0] !== "X" &&
    target[0] !== "Q" &&
    target[0] !== "O"
  );
}

function MimicAllowed(G, ctx, player) {
  let mCount = 0;
  let invalid = 0;
  for (let roll of G.field[player].rolls) {
    if (roll[1][0] === "M") {
      mCount++;
    } else if (
      roll[1][0] === "X" ||
      roll[1][0] === "Q" ||
      roll[1][0] === "O"
    ) {
      invalid++;
    }
  }
  return (
    mCount > 0 && mCount + invalid < G.field[ctx.currentPlayer].rolls.length
  );
}

function SpellsAllowed(G, ctx, player) {
  for (let cost of Object.values(SPELL)) {
    if (AfterCast(G, ctx, player, cost) >= 0) {
      return true;
    }
  }
  return false;
}

export function CanTarget(G, ctx, player) {
  return (
    ctx.currentPlayer !== player &&
    G.field[player].target === "" &&
    G.field[ctx.currentPlayer].target === "" &&
    G.field[player].rank === -1 &&
    G.field[ctx.currentPlayer].rank === -1
  );
}

// MOVES

function Choose(G, ctx, id) {
  if (id < 0 || id >= G.field.discover.length) {
    return INVALID_MOVE;
  }
  G.field[ctx.currentPlayer].party.push(G.field.discover[id]);
  G.field.discover.splice(id, 1);
  Pass(G, ctx);
}

function Deploy(G, ctx, ids) {
  if (ids.length !== G.field[ctx.playerID].party.length) {
    return INVALID_MOVE;
  }
  let sum = Sum(ids);
  if (sum > G.field[ctx.playerID].slots || sum < 1) {
    return INVALID_MOVE;
  }
  for (let i = 0; i < ids.length; i++) {
    if (ids[i]) {
      let dice = G.field[ctx.playerID].party[i];
      let face = DICE[dice][ctx.random.D6() - 1];
      G.players[ctx.playerID].rolls.push([dice, face]);
    }
  }
}

function Reroll(G, ctx, ids) {
  if (ids.length !== G.field[ctx.currentPlayer].rolls.length) {
    return INVALID_MOVE;
  }
  if (G.field[ctx.currentPlayer].rerolls <= 0) {
    return INVALID_MOVE;
  }
  if (Sum(ids) < 1) {
    return INVALID_MOVE;
  }
  G.field[ctx.currentPlayer].rerolls--;
  for (let i = 0; i < ids.length; i++) {
    if (ids[i]) {
      let dice = G.field[ctx.currentPlayer].rolls[i][0];
      let face = DICE[dice][ctx.random.D6() - 1];
      G.field[ctx.currentPlayer].rolls[i][1] = face;
    }
  }
  Resolve(G, ctx, ctx.currentPlayer);
  for (let player of ctx.playOrder) {
    G.field[player].pass = G.field[player].rerolls <= 0;
  }
  ctx.events.endTurn();
}

function Pass(G, ctx) {
  G.field[ctx.currentPlayer].pass = true;
  ctx.events.endTurn();
}

function Ready(G, ctx) {}

function NoCast(G, ctx) {
  G.field[ctx.currentPlayer].mana = AfterCast(G, ctx, ctx.currentPlayer, "");
  Pass(G, ctx);
}

function Mimic(G, ctx, id) {
  if (id < 0 || id >= G.field[ctx.currentPlayer].rolls.length) {
    return INVALID_MOVE;
  }

  if (!CanMimic(G, ctx, id)) {
    return INVALID_MOVE;
  }

  let ms = [];
  for (let i = 0; i < G.field[ctx.currentPlayer].rolls.length; i++) {
    let roll = G.field[ctx.currentPlayer].rolls[i][1];
    if (roll[0] === "M") {
      ms.push(i);
    }
  }
  if (ms.length === 0) {
    return INVALID_MOVE;
  }

  G.field[ctx.currentPlayer].rolls[ms[0]][1] =
    G.field[ctx.currentPlayer].rolls[id][1];
  Resolve(G, ctx, ctx.currentPlayer);

  if (ms.length === 1) {
    Pass(G, ctx);
  } else {
    ctx.events.endTurn();
  }
}

function Cast(G, ctx, id) {
  if (id < 0 || id >= Object.keys(SPELL).length) {
    return INVALID_MOVE;
  }
  let spell = Object.keys(SPELL)[id];
  let cost = SPELL[spell];
  let remaining = AfterCast(G, ctx, ctx.currentPlayer, cost);
  if (remaining < 0) {
    return INVALID_MOVE;
  }

  G.field[ctx.currentPlayer].mana = remaining;
  switch (spell) {
    case "Rumble":
      let blockCount = G.field[ctx.currentPlayer].impact.block;
      G.field[ctx.currentPlayer].extras.push(
        [spell, blockCount > 0 ? "A".repeat(blockCount) : "X"]);
      Resolve(G, ctx, ctx.currentPlayer);
      Pass(G, ctx);
      break;
    case "Harden":
      G.field[ctx.currentPlayer].extras.push([spell, "BBB"]);
      Resolve(G, ctx, ctx.currentPlayer);
      Pass(G, ctx);
      break;
    case "Ambush":
      G.field[ctx.currentPlayer].extras.push([spell, "G"]);
      Resolve(G, ctx, ctx.currentPlayer);
      Pass(G, ctx);
      break;
    case "Pierce":
      G.field[ctx.currentPlayer].extras.push([spell, "DDDD"]);
      Resolve(G, ctx, ctx.currentPlayer);
      Pass(G, ctx);
      break;
    case "Fireball":
      G.field[ctx.currentPlayer].extras.push([spell, "AAAA"]);
      Resolve(G, ctx, ctx.currentPlayer);
      Pass(G, ctx);
      break;
    case "Fireblast":
      G.field[ctx.currentPlayer].extras.push([spell, "AAAAAA"]);
      Resolve(G, ctx, ctx.currentPlayer);
      Pass(G, ctx);
      break;
    case "Tranquility":
      G.field[ctx.currentPlayer].extras.push([spell, "HH"]);
      Resolve(G, ctx, ctx.currentPlayer);
      Pass(G, ctx);
      break;
    case "Crystallize":
      G.field[ctx.currentPlayer].extras.push([spell, "Kimmune"]);
      Resolve(G, ctx, ctx.currentPlayer);
      Pass(G, ctx);
      break;
    case "Recruit":
      G.field[ctx.currentPlayer].extras.push([spell, "K+1 unit"]);
      G.field.shouldDiscover = true;
      ctx.events.setStage({
        stage: "recruit",
      });
      break;
    case "Expand":
      G.field[ctx.currentPlayer].extras.push([spell, "K+1 PT"]);
      G.field[ctx.currentPlayer].slots++;
      Pass(G, ctx);
      break;
  }
}

function SelectTarget(G, ctx, player) {
  if (!CanTarget(G, ctx, player)) {
    return INVALID_MOVE;
  }

  G.field[player].target = ctx.currentPlayer;
  G.field[ctx.currentPlayer].target = player;
  Pass(G, ctx);
}

function DefaultTarget(G, ctx) {
  let available = [];
  for (let player of ctx.playOrder) {
    if (G.field[player].target !== "") {
      G.field[player].pass = true;
    } else {
      available.push(player);
    }
  }
  if (available.length === 2) {
    G.field[available[0]].target = available[1];
    G.field[available[1]].target = available[0];
    G.field[available[0]].pass = true;
    G.field[available[1]].pass = true;
  } else if (available.length === 1) {
    G.field[available[0]].pass = true;
  }
}

function AssignDamage(G, ctx, ids) {
  let target = G.field[ctx.currentPlayer].target;
  if (ids.length !== G.field[target].tokens.length) {
    return INVALID_MOVE;
  }

  let damage = GetDamage(G, ctx, ctx.currentPlayer, target);
  if (damage <= 0) {
    return INVALID_MOVE;
  }

  let sum = Sum(ids);
  if (sum > damage) {
    return INVALID_MOVE;
  }

  let tokens = [];
  for (let i = 0; i < G.field[target].tokens.length; i++) {
    if (!ids[i]) {
      tokens.push(G.field[target].tokens[i]);
    }
  }
  G.field[target].tokens = tokens;

  ApplyDamage(G, ctx, ctx.currentPlayer, target, damage - sum);
  Pass(G, ctx);
}

function AssignRecovery(G, ctx, ids) {
  if (ids.length !== G.field[ctx.playerID].debuffs.length) {
    return INVALID_MOVE;
  }

  let target = G.field[ctx.playerID].target;
  let recovery = -1 * GetDamage(G, ctx, target, ctx.playerID);
  if (recovery <= 0) {
    return INVALID_MOVE;
  }

  let sum = Sum(ids);
  if (sum > recovery) {
    return INVALID_MOVE;
  }

  let debuffs = [];
  for (let i = 0; i < G.field[ctx.playerID].debuffs.length; i++) {
    if (!ids[i]) {
      debuffs.push(G.field[ctx.playerID].debuffs[i]);
    }
  }
  G.field[ctx.playerID].debuffs = debuffs;

  ApplyRecovery(G, ctx, ctx.playerID, recovery - sum);

  G.field[target === "" ? ctx.playerID : target].pass = true;
  ctx.events.endTurn();
}

export const Droll = {
  name: "droll",

  setup: Setup,

  playerView: PlayerView.STRIP_SECRETS,

  phases: {
    draft: {
      moves: {
        Choose,
      },
      turn: {
        onBegin: (G, ctx) => {
          Discover(G, ctx, VariableDiscoverSize(G, ctx));
        },
        onEnd: (G, ctx) => {
          if (
            G.field.discover.length ===
            VariableDiscoverSize(G, ctx) - ctx.playOrder.length
          ) {
            Undiscover(G, ctx);
            G.priority = (G.priority + 1) % ctx.playOrder.length;
          }
        },
        order: {
          first: (G, ctx) => G.priority,
          next: (G, ctx) =>
            G.field.discover.length === 0
              ? G.priority
              : (ctx.playOrderPos + 1) % ctx.playOrder.length,
          playOrder: (G, ctx) => [...G.alive],
        },
      },
      endIf: (G, ctx) => {
        for (let player of ctx.playOrder) {
          if (G.field[player].party.length < START_PARTY) {
            return false;
          }
        }
        return true;
      },
      onEnd: (G, ctx) => {
        G.priority = 0;
      },
      next: "deploy",
      start: true,
    },
    deploy: {
      moves: {
        Deploy,
      },
      turn: {
        activePlayers: ActivePlayers.ALL_ONCE,
        onMove: (G, ctx) => {
          if (ctx.activePlayers === null) {
            ctx.events.endPhase();
          }
        },
        order: {
          first: (G, ctx) => G.priority,
          next: (G, ctx) => (ctx.playOrderPos + 1) % ctx.playOrder.length,
          playOrder: (G, ctx) => [...G.alive],
        },
      },
      onBegin: ApplyExtras,
      onEnd: (G, ctx) => {
        for (let player of ctx.playOrder) {
          G.field[player].rolls = G.players[player].rolls;
          G.players[player].rolls = [];
          G.field[player].rerolls = START_REROLLS;
          G.field[player].pass = false;
          Resolve(G, ctx, player);
        }
      },
      next: "reroll",
    },
    reroll: {
      moves: {
        Reroll,
        Pass,
      },
      turn: {
        order: {
          first: FirstNotPass,
          next: NextNotPass,
          playOrder: (G, ctx) => [...G.alive],
        },
      },
      endIf: AllPass,
      onEnd: ResetPass,
      next: "mimic",
    },
    mimic: {
      moves: {
        Mimic,
        Pass,
      },
      turn: {
        order: {
          first: FirstNotPass,
          next: NextNotPass,
          playOrder: (G, ctx) => [...G.alive],
        },
      },
      endIf: AllPass,
      onBegin: (G, ctx) => {
        for (let player of ctx.playOrder) {
          if (!MimicAllowed(G, ctx, player)) {
            G.field[player].pass = true;
          }
        }
      },
      onEnd: ResetPass,
      next: "spells",
    },
    spells: {
      moves: {
        Cast,
        NoCast,
      },
      turn: {
        stages: {
          recruit: {
            moves: {
              Choose,
            },
          },
        },
        onMove: (G, ctx) => {
          if (G.field.shouldDiscover) {
            Discover(G, ctx, DISCOVER_SIZE);
            G.field.shouldDiscover = false;
          }
        },
        onEnd: (G, ctx) => {
          if (G.field.discover.length > 0) {
            Undiscover(G, ctx);
          }
        },
        order: {
          first: FirstNotPass,
          next: NextNotPass,
          playOrder: (G, ctx) => [...G.alive],
        },
      },
      endIf: AllPass,
      onBegin: (G, ctx) => {
        for (let player of ctx.playOrder) {
          if (!SpellsAllowed(G, ctx, player)) {
            G.field[player].mana = AfterCast(G, ctx, player, "");
            G.field[player].pass = true;
          }
        }
      },
      onEnd: (G, ctx) => {
        for (let player of ctx.playOrder) {
          G.field[player].tokens = G.field[player].tokens.concat(
            G.field[player].impact.tokens
          );
          G.field[player].pass = false;
        }
      },
      next: "target",
    },
    target: {
      moves: {
        SelectTarget,
      },
      turn: {
        onMove: DefaultTarget,
        order: {
          first: FirstNotPass,
          next: NextNotPass,
          playOrder: (G, ctx) => [...G.alive],
        },
      },
      endIf: AllPass,
      onBegin: DefaultTarget,
      onEnd: ResetPass,
      next: "resolve",
    },
    resolve: {
      moves: {
        AssignDamage,
      },
      turn: {
        stages: {
          recovery: {
            moves: {
              AssignRecovery,
            },
          },
        },
        order: {
          first: FirstNotPass,
          next: NextNotPass,
          playOrder: (G, ctx) => [...G.alive],
        },
      },
      endIf: AllPass,
      onBegin: (G, ctx) => {
        for (let player of ctx.playOrder) {
            ApplyCollateral(G, ctx, player);
        }
        for (let player of ctx.playOrder) {
          let target = G.field[player].target;
          if (target === "") {
            let recovery = -1 * GetDamage(G, ctx, "", player);
            if (recovery > 0) {
              if (G.field[player].debuffs.length === 0) {
                ApplyRecovery(G, ctx, player, recovery);
                G.field[player].pass = true;
              } else {
                SendToRecovery(G, ctx, player);
              }
            } else {
              G.field[player].pass = true;
            }
          } else {
            let damage = GetDamage(G, ctx, player, target);
            if (damage > 0) {
              if (G.field[target].tokens.length === 0) {
                ApplyDamage(G, ctx, player, target, damage);
                G.field[player].pass = true;
              }
            } else if (damage < 0) {
              if (G.field[target].debuffs.length === 0) {
                ApplyRecovery(G, ctx, target, -1 * damage);
                G.field[player].pass = true;
              } else {
                SendToRecovery(G, ctx, target);
              }
            } else {
              G.field[player].pass = true;
            }
          }
        }
      },
      onEnd: (G, ctx) => {
        let alive = [];
        let justDied = [];
        for (let player of ctx.playOrder) {
          if (G.field[player].hp > 0) {
            alive.push(player);
          } else {
            justDied.push(player);
          }
        }
        for (let player of justDied) {
          G.field[player].rank = alive.length + 1;
        }
        if (alive.length === 1) {
          G.field[alive[0]].rank = 1;
          ctx.events.endGame();
        } else if (alive.length === 0) {
          ctx.events.endGame();
        }
        G.alive = [...alive];
      },
      next: "idle",
    },
    idle: {
      moves: {
        Ready,
      },
      turn: {
        activePlayers: ActivePlayers.ALL_ONCE,
        onMove: (G, ctx) => {
          if (ctx.activePlayers === null) {
            ctx.events.endPhase();
          }
        },
        order: {
          first: (G, ctx) => G.priority,
          next: (G, ctx) => (ctx.playOrderPos + 1) % ctx.playOrder.length,
          playOrder: (G, ctx) => [...G.alive],
        },
      },
      onEnd: (G, ctx) => {
        G.priority = (G.priority + 1) % G.alive.length;

        for (let player of ctx.playOrder) {
          if (G.field[player].rank === -1) {
            G.field[player].rolls = [];
            G.field[player].rerolls = START_REROLLS;
            G.field[player].pass = false;
            G.field[player].extras = [];
            G.field[player].target = "";
            Resolve(G, ctx, player);
          }
        }
      },
      next: "deploy",
    },
  },
};
