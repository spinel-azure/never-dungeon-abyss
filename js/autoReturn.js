import {findKnownPath} from './known-path.js';
import {
  DIRS
} from "./config.js";
import {
  explored,
  getDoorKind,
  getDoorState,
  getExplorationObstacleAt,
  getStartPosition,
  inBounds,
  wallOnCell
} from "./dungeon.js";
import {
  state,
  turn,
  tryMove,
  turnToward,
  openDoorAhead
} from "./player.js";

const options = {
  autoReturnBtn: null,
  say: () => {},
  playArrivalSe: () => {}
};

export function configureAutoReturn(config) {
  Object.assign(options, config);
}

export function getAutoReturnAvailability() {
  const start = getStartPosition();
  if (state.autoReturning) return { accepted: false, reason: "alreadyActive" };
  if (state.anim) return { accepted: false, reason: "moving" };
  if (state.gridX === start.x && state.gridY === start.y) {
    return { accepted: false, reason: "alreadyAtStart" };
  }
  const path = findExploredPathToStart();
  if (!path.length) return { accepted: false, reason: "noPath" };
  return { accepted: true, reason: "", path };
}

export function startAutoReturn({ persistentThroughBattle = false, availability = null } = {}) {
  const resolvedAvailability = availability?.accepted ? availability : getAutoReturnAvailability();
  if (!resolvedAvailability.accepted) {
    if (resolvedAvailability.reason === "alreadyAtStart") options.say("すでにスタート地点にいる。");
    else if (resolvedAvailability.reason === "noPath") options.say("踏破済みの道だけではスタート地点へ戻れない。");
    return false;
  }
  const path = [...resolvedAvailability.path];
  if (!path.length) {
    options.say("踏破済みの道だけではスタート地点へ戻れない。");
    return false;
  }
  state.autoReturning = true;
  state.autoWalkerActive = Boolean(persistentThroughBattle);
  state.autoReturnPaused = false;
  state.autoPath = path;
  updateAutoReturnButton();
  options.say("踏破済みの道をたどって帰還する。");
  continueAutoReturn();
  return true;
}

export function continueAutoReturn() {
  const start = getStartPosition();
  if (!state.autoReturning || state.autoReturnPaused || state.anim) return;
  if (state.gridX === start.x && state.gridY === start.y) {
    cancelAutoReturn(true);
    return;
  }
  const nextDirKey = state.autoPath[0];
  if (!nextDirKey) {
    cancelAutoReturn(false);
    options.say("帰還経路を見失った。");
    return;
  }
  const targetDir = DIRS.findIndex(d => d.key === nextDirKey);
  if (targetDir < 0) {
    cancelAutoReturn(false);
    return;
  }
  if (state.dir !== targetDir) {
    turn(turnToward(state.dir, targetDir), true);
    return;
  }
  if (getDoorState(state.gridX, state.gridY, nextDirKey) === "closed") {
    openDoorAhead(true);
    return;
  }
  state.autoPath.shift();
  tryMove(1, true);
}

export function cancelAutoReturn(arrived) {
  if (!state.autoReturning && !state.autoPath.length) return;
  state.autoReturning = false;
  state.autoWalkerActive = false;
  state.autoReturnPaused = false;
  state.autoPath = [];
  updateAutoReturnButton();
  if (arrived) {
    options.say("スタート地点へ戻った。");
    options.playArrivalSe();
  }
}

export function updateAutoReturnButton() {
  if (!options.autoReturnBtn) return;
  options.autoReturnBtn.disabled = state.autoReturning;
  options.autoReturnBtn.textContent = state.autoReturning ? "帰還中..." : "帰還";
}

export function findExploredPathToStart() {
 return findKnownPath({x:state.gridX,y:state.gridY},getStartPosition(),(from,to,dir)=>{
  if(!inBounds(to.x,to.y)||!explored[to.y][to.x]||getExplorationObstacleAt(to.x,to.y))return false;
  const door=getDoorState(from.x,from.y,dir),kind=getDoorKind(from.x,from.y,dir);
  if(door&&['locked','boss','specialLocked'].includes(kind))return false;
  return Boolean(door)||!wallOnCell(from.x,from.y,dir);
 });
}
