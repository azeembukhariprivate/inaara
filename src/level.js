// A level: a grid of tiles (48 × 48 pixels) and the things placed in it.

export const T = 48;

export const TILE = {
  EMPTY: 0,
  SOLID: 1, // ground: earth with a grassy top
  ROCK: 2, // solid too, drawn as stone or laterite blocks
  PLANK: 3, // a wooden plank you can jump up through and stand on
  THORN: 4, // a thorny bush: hurts
  WATER: 5 // water: not solid; falling in sends you back
};

export class Level {
  /** def: { id, name, theme, width, height, tiles (Uint8Array), entities, autoscroll, music, intro } */
  constructor(def) {
    Object.assign(this, def);
    this.pxWidth = this.width * T;
    this.pxHeight = this.height * T;
  }

  tile(tx, ty) {
    if (tx < 0 || tx >= this.width) return TILE.ROCK; // the sides of a level are walls
    if (ty < 0) return TILE.EMPTY;
    if (ty >= this.height) return TILE.EMPTY; // below the bottom: a pit
    return this.tiles[ty * this.width + tx];
  }

  isSolid(tx, ty) {
    const t = this.tile(tx, ty);
    return t === TILE.SOLID || t === TILE.ROCK;
  }

  isPlank(tx, ty) {
    return this.tile(tx, ty) === TILE.PLANK;
  }

  isWater(tx, ty) {
    return this.tile(tx, ty) === TILE.WATER;
  }

  isThorn(tx, ty) {
    return this.tile(tx, ty) === TILE.THORN;
  }

  find(type) {
    return this.entities.find(e => e.type === type);
  }
}
