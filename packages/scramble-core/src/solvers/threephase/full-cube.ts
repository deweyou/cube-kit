import type { RandomSource } from '../../random-source.js';
import { Center1 } from './center.js';
import { EdgeCube } from './edge.js';
import {
  B1,
  B3,
  B7,
  B9,
  D1,
  D3,
  D7,
  D9,
  F1,
  F3,
  F7,
  F9,
  L1,
  L3,
  L7,
  L9,
  R1,
  R3,
  R7,
  R9,
  U1,
  U3,
  U7,
  U9,
  dx3,
  move2str,
  parity,
  set8Perm,
  swap,
  toMove,
} from './tables.js';

const u0 = 0x0;
const u1 = 0x1;
const u2 = 0x2;
const u3 = 0x3;
const u4 = 0x4;
const u5 = 0x5;
const u6 = 0x6;
const u7 = 0x7;
const u8 = 0x8;
const u9 = 0x9;
const ua = 0xa;
const ub = 0xb;
const uc = 0xc;
const ud = 0xd;
const ue = 0xe;
const uf = 0xf;
const r0 = 0x10;
const r1 = 0x11;
const r2 = 0x12;
const r3 = 0x13;
const r4 = 0x14;
const r5 = 0x15;
const r6 = 0x16;
const r7 = 0x17;
const r8 = 0x18;
const r9 = 0x19;
const ra = 0x1a;
const rb = 0x1b;
const rc = 0x1c;
const rd = 0x1d;
const re = 0x1e;
const rf = 0x1f;
const f0 = 0x20;
const f1 = 0x21;
const f2 = 0x22;
const f3 = 0x23;
const f4 = 0x24;
const f5 = 0x25;
const f6 = 0x26;
const f7 = 0x27;
const f8 = 0x28;
const f9 = 0x29;
const fa = 0x2a;
const fb = 0x2b;
const fc = 0x2c;
const fd = 0x2d;
const fe = 0x2e;
const ff = 0x2f;
const d0 = 0x30;
const d1 = 0x31;
const d2 = 0x32;
const d3 = 0x33;
const d4 = 0x34;
const d5 = 0x35;
const d6 = 0x36;
const d7 = 0x37;
const d8 = 0x38;
const d9 = 0x39;
const da = 0x3a;
const db = 0x3b;
const dc = 0x3c;
const dd = 0x3d;
const de = 0x3e;
const df = 0x3f;
const l0 = 0x40;
const l1 = 0x41;
const l2 = 0x42;
const l3 = 0x43;
const l4 = 0x44;
const l5 = 0x45;
const l6 = 0x46;
const l7 = 0x47;
const l8 = 0x48;
const l9 = 0x49;
const la = 0x4a;
const lb = 0x4b;
const lc = 0x4c;
const ld = 0x4d;
const le = 0x4e;
const lf = 0x4f;
const b0 = 0x50;
const b1 = 0x51;
const b2 = 0x52;
const b3 = 0x53;
const b4 = 0x54;
const b5 = 0x55;
const b6 = 0x56;
const b7 = 0x57;
const b8 = 0x58;
const b9 = 0x59;
const ba = 0x5a;
const bb = 0x5b;
const bc = 0x5c;
const bd = 0x5d;
const be = 0x5e;
const bf = 0x5f;

export class CenterCube {
  readonly ct = Array.from({ length: 24 }, (_, index) =>
    Math.floor(FullCube.centerFacelet[index]! / 16),
  );

  static random(random: RandomSource): CenterCube {
    const cube = new CenterCube();
    for (let i = 0; i < 23; i += 1) {
      const t = i + random.nextInt(24 - i);
      if (cube.ct[t] !== cube.ct[i]) {
        const value = cube.ct[i]!;
        cube.ct[i] = cube.ct[t]!;
        cube.ct[t] = value;
      }
    }
    return cube;
  }

  copy(center: CenterCube): void {
    for (let i = 0; i < 24; i += 1) this.ct[i] = center.ct[i]!;
  }

  fill333Facelet(facelet: string[]): void {
    const center333Map = [0, 4, 2, 1, 5, 3] as const;
    for (let i = 0; i < 6; i += 1) {
      const idx = center333Map[i]! << 2;
      if (
        this.ct[idx] !== this.ct[idx + 1] ||
        this.ct[idx + 1] !== this.ct[idx + 2] ||
        this.ct[idx + 2] !== this.ct[idx + 3]
      ) {
        throw new Error('@cubekit/scramble-core: unsolved 4x4 centers after reduction');
      }
      facelet[4 + i * 9] = 'URFDLB'[this.ct[idx]!]!;
    }
  }

  move(move: number): void {
    const key = move % 3;
    const face = Math.floor(move / 3);
    switch (face) {
      case 0:
        swap(this.ct, 0, 1, 2, 3, key);
        break;
      case 1:
        swap(this.ct, 16, 17, 18, 19, key);
        break;
      case 2:
        swap(this.ct, 8, 9, 10, 11, key);
        break;
      case 3:
        swap(this.ct, 4, 5, 6, 7, key);
        break;
      case 4:
        swap(this.ct, 20, 21, 22, 23, key);
        break;
      case 5:
        swap(this.ct, 12, 13, 14, 15, key);
        break;
      case 6:
        swap(this.ct, 0, 1, 2, 3, key);
        swap(this.ct, 8, 20, 12, 16, key);
        swap(this.ct, 9, 21, 13, 17, key);
        break;
      case 7:
        swap(this.ct, 16, 17, 18, 19, key);
        swap(this.ct, 1, 15, 5, 9, key);
        swap(this.ct, 2, 12, 6, 10, key);
        break;
      case 8:
        swap(this.ct, 8, 9, 10, 11, key);
        swap(this.ct, 2, 19, 4, 21, key);
        swap(this.ct, 3, 16, 5, 22, key);
        break;
      case 9:
        swap(this.ct, 4, 5, 6, 7, key);
        swap(this.ct, 10, 18, 14, 22, key);
        swap(this.ct, 11, 19, 15, 23, key);
        break;
      case 10:
        swap(this.ct, 20, 21, 22, 23, key);
        swap(this.ct, 0, 8, 4, 14, key);
        swap(this.ct, 3, 11, 7, 13, key);
        break;
      case 11:
        swap(this.ct, 12, 13, 14, 15, key);
        swap(this.ct, 1, 20, 7, 18, key);
        swap(this.ct, 0, 23, 6, 17, key);
        break;
    }
  }
}

export class CornerCube {
  private static readonly moveCube = Array.from(
    { length: 18 },
    (): CornerCube | null => null,
  );
  private static readonly cornerFacelet = [
    [U9, R1, F3],
    [U7, F1, L3],
    [U1, L1, B3],
    [U3, B1, R3],
    [D3, F9, R7],
    [D1, L9, F7],
    [D7, B9, L7],
    [D9, R9, B7],
  ] as const;

  readonly cp = [0, 1, 2, 3, 4, 5, 6, 7];
  readonly co = [0, 0, 0, 0, 0, 0, 0, 0];
  private temp: CornerCube | null = null;

  constructor(initMoves = true) {
    if (initMoves) CornerCube.initMove();
  }

  static random(random: RandomSource): CornerCube {
    return new CornerCube().setFromCoords(random.nextInt(40_320), random.nextInt(2187));
  }

  static initMove(): void {
    if (CornerCube.moveCube[0] !== null) return;

    CornerCube.moveCube[0] = new CornerCube(false).setFromCoords(15_120, 0);
    CornerCube.moveCube[3] = new CornerCube(false).setFromCoords(21_021, 1494);
    CornerCube.moveCube[6] = new CornerCube(false).setFromCoords(8064, 1236);
    CornerCube.moveCube[9] = new CornerCube(false).setFromCoords(9, 0);
    CornerCube.moveCube[12] = new CornerCube(false).setFromCoords(1230, 412);
    CornerCube.moveCube[15] = new CornerCube(false).setFromCoords(224, 137);
    for (let axis = 0; axis < 18; axis += 3) {
      for (let power = 0; power < 2; power += 1) {
        const cube = new CornerCube(false);
        CornerCube.cornerMult(CornerCube.moveCube[axis + power]!, CornerCube.moveCube[axis]!, cube);
        CornerCube.moveCube[axis + power + 1] = cube;
      }
    }
  }

  static cornerMult(first: CornerCube, second: CornerCube, product: CornerCube): void {
    for (let corner = 0; corner < 8; corner += 1) {
      product.cp[corner] = first.cp[second.cp[corner]!]!;
      const oriA = first.co[second.cp[corner]!]!;
      const oriB = second.co[corner]!;
      let ori = oriA;
      ori += oriA < 3 ? oriB : 6 - oriB;
      ori %= 3;
      if ((oriA >= 3) !== (oriB >= 3)) ori += 3;
      product.co[corner] = ori;
    }
  }

  copy(corner: CornerCube): void {
    for (let i = 0; i < 8; i += 1) {
      this.cp[i] = corner.cp[i]!;
      this.co[i] = corner.co[i]!;
    }
  }

  getParity(): number {
    return parity(this.cp);
  }

  fill333Facelet(facelet: string[]): void {
    for (let corner = 0; corner < 8; corner += 1) {
      const cubie = this.cp[corner]!;
      const orientation = this.co[corner]!;
      for (let n = 0; n < 3; n += 1) {
        facelet[CornerCube.cornerFacelet[corner]![(n + orientation) % 3]!] =
          'URFDLB'[Math.floor(CornerCube.cornerFacelet[cubie]![n]! / 9)]!;
      }
    }
  }

  move(move: number): void {
    this.temp ??= new CornerCube(false);
    CornerCube.cornerMult(this, CornerCube.moveCube[move]!, this.temp);
    this.copy(this.temp);
  }

  private setFromCoords(cperm: number, twist: number): CornerCube {
    this.setCPerm(cperm);
    this.setTwist(twist);
    return this;
  }

  private setTwist(index: number): void {
    let twist = 0;
    for (let i = 6; i >= 0; i -= 1) {
      this.co[i] = index % 3;
      twist += this.co[i]!;
      index = Math.floor(index / 3);
    }
    this.co[7] = (15 - twist) % 3;
  }

  private setCPerm(index: number): void {
    set8Perm(this.cp, index);
  }
}

export class FullCube {
  static readonly centerFacelet = [
    u5,
    u6,
    ua,
    u9,
    d5,
    d6,
    da,
    d9,
    f5,
    f6,
    fa,
    f9,
    b5,
    b6,
    ba,
    b9,
    r5,
    r6,
    ra,
    r9,
    l5,
    l6,
    la,
    l9,
  ] as const;
  static readonly edgeFacelet = [
    [ud, f1],
    [u4, l1],
    [u2, b1],
    [ub, r1],
    [dd, be],
    [d4, le],
    [d2, fe],
    [db, re],
    [lb, f8],
    [l4, b7],
    [rb, b8],
    [r4, f7],
    [f2, ue],
    [l2, u8],
    [b2, u1],
    [r2, u7],
    [bd, de],
    [ld, d8],
    [fd, d1],
    [rd, d7],
    [f4, l7],
    [bb, l8],
    [b4, r7],
    [fb, r8],
  ] as const;
  static readonly cornerFacelet = [
    [uf, r0, f3],
    [uc, f0, l3],
    [u0, l0, b3],
    [u3, b0, r3],
    [d3, ff, rc],
    [d0, lf, fc],
    [dc, bf, lc],
    [df, rf, bc],
  ] as const;

  value = 0;
  add1 = false;
  length1 = 0;
  length2 = 0;
  length3 = 0;
  sym = 0;

  private edge: EdgeCube;
  private center: CenterCube;
  private corner: CornerCube;
  private readonly moveBuffer = Array.from({ length: 80 }, () => 0);
  private moveLength = 0;
  private edgeAvail = 0;
  private centerAvail = 0;
  private cornerAvail = 0;

  constructor(source?: FullCube) {
    this.edge = new EdgeCube();
    this.center = new CenterCube();
    this.corner = new CornerCube();
    if (source !== undefined) this.copy(source);
  }

  static random(random: RandomSource): FullCube {
    const cube = new FullCube();
    cube.edge = EdgeCube.random(random);
    cube.center = CenterCube.random(random);
    cube.corner = CornerCube.random(random);
    return cube;
  }

  static fromMoves(moves: readonly number[] | string): FullCube {
    const cube = new FullCube();
    const sequence = typeof moves === 'string' ? toMove(moves) : moves;
    for (const move of sequence) cube.doMove(move);
    return cube;
  }

  copy(cube: FullCube): void {
    this.edge.copy(cube.edge);
    this.center.copy(cube.center);
    this.corner.copy(cube.corner);
    this.value = cube.value;
    this.add1 = cube.add1;
    this.length1 = cube.length1;
    this.length2 = cube.length2;
    this.length3 = cube.length3;
    this.sym = cube.sym;
    for (let i = 0; i < this.moveBuffer.length; i += 1) this.moveBuffer[i] = cube.moveBuffer[i]!;
    this.moveLength = cube.moveLength;
    this.edgeAvail = cube.edgeAvail;
    this.centerAvail = cube.centerAvail;
    this.cornerAvail = cube.cornerAvail;
  }

  checkEdge(): boolean {
    return this.getEdge().checkEdge();
  }

  getMoveString(inverse: boolean, rotation: boolean): string {
    const fixedMoves = Array.from({ length: this.moveLength - (this.add1 ? 2 : 0) }, () => 0);
    let idx = 0;
    for (let i = 0; i < this.length1; i += 1) fixedMoves[idx++] = this.moveBuffer[i]!;

    let sym = this.sym;
    for (let i = this.length1 + (this.add1 ? 2 : 0); i < this.moveLength; i += 1) {
      const moved = Center1.symmove[sym]![this.moveBuffer[i]!]!;
      if (moved >= dx3 - 2) {
        fixedMoves[idx++] = moved - 9;
        const rot = MOVE_TO_ROT[moved - (dx3 - 2)]!;
        sym = Center1.symmult[sym]![rot]!;
      } else {
        fixedMoves[idx++] = moved;
      }
    }
    const finishSym = Center1.symmult[Center1.syminv[sym]!]![Center1.getSolvedSym(this.getCenter())]!;
    const tokens: string[] = [];
    sym = finishSym;

    if (inverse) {
      for (let i = idx - 1; i >= 0; i -= 1) {
        let move = fixedMoves[i]!;
        move = Math.floor(move / 3) * 3 + (2 - (move % 3));
        const moved = Center1.symmove[sym]![move]!;
        if (moved >= dx3 - 2) {
          tokens.push(move2str[moved - 9]!);
          const rot = MOVE_TO_ROT[moved - (dx3 - 2)]!;
          sym = Center1.symmult[sym]![rot]!;
        } else {
          tokens.push(move2str[moved]!);
        }
      }
      if (rotation && Center1.rot2str[Center1.syminv[sym]!] !== '') {
        tokens.push(...Center1.rot2str[Center1.syminv[sym]!].split(' '));
      }
    } else {
      for (let i = 0; i < idx; i += 1) tokens.push(move2str[fixedMoves[i]!]!);
      if (rotation && Center1.rot2str[finishSym] !== '') {
        tokens.push(...Center1.rot2str[finishSym].split(' '));
      }
    }

    return tokens.filter((token) => token.length > 0).join(' ');
  }

  to333Facelet(): string {
    const facelet = Array.from({ length: 54 }, () => '');
    this.getEdge().fill333Facelet(facelet);
    this.getCenter().fill333Facelet(facelet);
    this.getCorner().fill333Facelet(facelet);
    return facelet.join('');
  }

  move(move: number): void {
    this.moveBuffer[this.moveLength] = move;
    this.moveLength += 1;
  }

  doMove(move: number): void {
    this.getEdge().move(move);
    this.getCenter().move(move);
    this.getCorner().move(move % 18);
  }

  getEdge(): EdgeCube {
    while (this.edgeAvail < this.moveLength) {
      this.edge.move(this.moveBuffer[this.edgeAvail]!);
      this.edgeAvail += 1;
    }
    return this.edge;
  }

  getCenter(): CenterCube {
    while (this.centerAvail < this.moveLength) {
      this.center.move(this.moveBuffer[this.centerAvail]!);
      this.centerAvail += 1;
    }
    return this.center;
  }

  getCorner(): CornerCube {
    while (this.cornerAvail < this.moveLength) {
      this.corner.move(this.moveBuffer[this.cornerAvail]! % 18);
      this.cornerAvail += 1;
    }
    return this.corner;
  }
}

const MOVE_TO_ROT = [35, 1, 34, 2, 4, 6, 22, 5, 19] as const;
