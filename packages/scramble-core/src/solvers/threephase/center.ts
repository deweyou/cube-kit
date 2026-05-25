import { Cnk, bx3, dx2, dx3, fx1, lx3, move2std, rx1, swap, ux1, ux2 } from './tables.js';

interface CenterLike {
  ct: number[];
}

export class Center1 {
  static ctsmv: number[][] = [];
  static sym2raw: number[] = [];
  static csprun: number[] = [];
  static symmult: number[][] = [];
  static symmove: number[][] = [];
  static syminv: number[] = [];
  static finish: number[] = [];
  static readonly rot2str = [
    '',
    'y2',
    'x',
    'x y2',
    'x2',
    'z2',
    "x'",
    "x' y2",
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'y z',
    "y' z'",
    'y2 z',
    "z'",
    "y' z",
    "y z'",
    'z',
    'z y2',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    "y' x'",
    'y x',
    "y'",
    'y',
    "y' x",
    "y x'",
    'y z2',
    "y' z2",
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
  ] as const;

  static raw2sym: number[] | null = null;

  readonly ct: number[] = Array.from({ length: 24 }, (_, index) => (index < 8 ? 1 : 0));

  constructor(center?: CenterLike | readonly number[], urf?: number) {
    if (center === undefined) return;

    const source = 'ct' in center ? center.ct : center;
    for (let i = 0; i < 24; i += 1) {
      this.ct[i] = urf === undefined ? source[i]! : source[i]! % 3 === urf ? 1 : 0;
    }
  }

  private static ensureTables(): void {
    if (Center1.ctsmv.length !== 0) return;

    Center1.ctsmv = Array.from({ length: 15_582 }, () => Array.from({ length: 36 }, () => 0));
    Center1.sym2raw = Array.from({ length: 15_582 }, () => 0);
    Center1.csprun = Array.from({ length: 15_582 }, () => -1);
    Center1.symmult = Array.from({ length: 48 }, () => Array.from({ length: 48 }, () => 0));
    Center1.symmove = Array.from({ length: 48 }, () => Array.from({ length: 36 }, () => 0));
    Center1.syminv = Array.from({ length: 48 }, () => 0);
    Center1.finish = Array.from({ length: 48 }, () => 0);
  }

  static initSym2Raw(): void {
    Center1.ensureTables();

    const center = new Center1();
    const occ = Array.from({ length: Math.floor(735_471 / 32) + 1 }, () => 0);
    let count = 0;

    for (let i = 0; i < 735_471; i += 1) {
      if ((occ[i >>> 5]! & (1 << (i & 0x1f))) !== 0) continue;

      center.set(i);
      for (let j = 0; j < 48; j += 1) {
        const idx = center.get();
        occ[idx >>> 5] = occ[idx >>> 5]! | (1 << (idx & 0x1f));
        if (Center1.raw2sym !== null) {
          Center1.raw2sym[idx] = (count << 6) | Center1.syminv[j]!;
        }
        center.rot(0);
        if (j % 2 === 1) center.rot(1);
        if (j % 8 === 7) center.rot(2);
        if (j % 16 === 15) center.rot(3);
      }
      Center1.sym2raw[count] = i;
      count += 1;
    }
  }

  static createMoveTable(): void {
    Center1.ensureTables();

    const center = new Center1();
    const base = new Center1();

    for (let i = 0; i < 15_582; i += 1) {
      base.set(Center1.sym2raw[i]!);
      for (let move = 0; move < 36; move += 1) {
        center.copyFrom(base);
        center.move(move);
        Center1.ctsmv[i]![move] = center.getsym();
      }
    }
  }

  static createPrun(): void {
    Center1.ensureTables();

    Center1.csprun.fill(-1);
    Center1.csprun[0] = 0;
    let depth = 0;
    let done = 1;

    while (done !== 15_582) {
      const inv = depth > 4;
      const select = inv ? -1 : depth;
      const check = inv ? depth : -1;
      depth += 1;

      for (let i = 0; i < 15_582; i += 1) {
        if (Center1.csprun[i] !== select) continue;

        for (let move = 0; move < 27; move += 1) {
          const idx = Center1.ctsmv[i]![move]! >>> 6;
          if (Center1.csprun[idx] !== check) continue;

          done += 1;
          if (inv) {
            Center1.csprun[i] = depth;
            break;
          }
          Center1.csprun[idx] = depth;
        }
      }
    }
  }

  static raw2symIndex(raw: number): number {
    Center1.ensureTables();

    let low = 0;
    let high = Center1.sym2raw.length - 1;

    while (low <= high) {
      const mid = (low + high) >>> 1;
      const value = Center1.sym2raw[mid]!;
      if (value === raw) return mid;
      if (value < raw) low = mid + 1;
      else high = mid - 1;
    }

    return -1;
  }

  static getSolvedSym(cube: CenterLike): number {
    const center = new Center1(cube.ct);

    for (let j = 0; j < 48; j += 1) {
      let isSolved = true;
      for (let i = 0; i < 24; i += 1) {
        if (center.ct[i] !== Math.floor(CENTER_FACELET[i]! / 16)) {
          isSolved = false;
          break;
        }
      }
      if (isSolved) return j;

      center.rot(0);
      if (j % 2 === 1) center.rot(1);
      if (j % 8 === 7) center.rot(2);
      if (j % 16 === 15) center.rot(3);
    }

    return -1;
  }

  static initSym(): void {
    Center1.ensureTables();

    const center = new Center1();
    for (let i = 0; i < 24; i += 1) center.ct[i] = i;

    const base = new Center1(center.ct);
    const moveBase = new Center1(center.ct);
    const moved = new Center1(center.ct);

    for (let i = 0; i < 48; i += 1) {
      for (let j = 0; j < 48; j += 1) {
        for (let k = 0; k < 48; k += 1) {
          if (center.equals(base)) {
            Center1.symmult[i]![j] = k;
            if (k === 0) Center1.syminv[i] = j;
          }
          base.rot(0);
          if (k % 2 === 1) base.rot(1);
          if (k % 8 === 7) base.rot(2);
          if (k % 16 === 15) base.rot(3);
        }
        center.rot(0);
        if (j % 2 === 1) center.rot(1);
        if (j % 8 === 7) center.rot(2);
        if (j % 16 === 15) center.rot(3);
      }
      center.rot(0);
      if (i % 2 === 1) center.rot(1);
      if (i % 8 === 7) center.rot(2);
      if (i % 16 === 15) center.rot(3);
    }

    for (let i = 0; i < 48; i += 1) {
      center.copyFrom(moveBase);
      center.rotate(Center1.syminv[i]!);
      for (let j = 0; j < 36; j += 1) {
        base.copyFrom(center);
        base.move(j);
        base.rotate(i);
        for (let k = 0; k < 36; k += 1) {
          moved.copyFrom(moveBase);
          moved.move(k);
          if (moved.equals(base)) {
            Center1.symmove[i]![j] = k;
            break;
          }
        }
      }
    }

    center.set(0);
    for (let i = 0; i < 48; i += 1) {
      Center1.finish[Center1.syminv[i]!] = center.get();
      center.rot(0);
      if (i % 2 === 1) center.rot(1);
      if (i % 8 === 7) center.rot(2);
      if (i % 16 === 15) center.rot(3);
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

  set(index: number): void {
    let remaining = 8;
    for (let i = 23; i >= 0; i -= 1) {
      this.ct[i] = 0;
      if (index >= Cnk[i]![remaining]!) {
        index -= Cnk[i]![remaining]!;
        remaining -= 1;
        this.ct[i] = 1;
      }
    }
  }

  get(): number {
    let index = 0;
    let remaining = 8;
    for (let i = 23; i >= 0; i -= 1) {
      if (this.ct[i] === 1) {
        index += Cnk[i]![remaining]!;
        remaining -= 1;
      }
    }
    return index;
  }

  getsym(): number {
    if (Center1.raw2sym !== null) return Center1.raw2sym[this.get()]!;

    for (let j = 0; j < 48; j += 1) {
      const coord = Center1.raw2symIndex(this.get());
      if (coord !== -1) return coord * 64 + j;
      this.rot(0);
      if (j % 2 === 1) this.rot(1);
      if (j % 8 === 7) this.rot(2);
      if (j % 16 === 15) this.rot(3);
    }

    throw new Error('@cubekit/scramble-core: invalid center symmetry coordinate');
  }

  copyFrom(center: Center1): void {
    for (let i = 0; i < 24; i += 1) this.ct[i] = center.ct[i]!;
  }

  rot(rotation: number): void {
    switch (rotation) {
      case 0:
        this.move(ux2);
        this.move(dx2);
        break;
      case 1:
        this.move(rx1);
        this.move(lx3);
        break;
      case 2:
        swap(this.ct, 0, 3, 1, 2, 1);
        swap(this.ct, 8, 11, 9, 10, 1);
        swap(this.ct, 4, 7, 5, 6, 1);
        swap(this.ct, 12, 15, 13, 14, 1);
        swap(this.ct, 16, 19, 21, 22, 1);
        swap(this.ct, 17, 18, 20, 23, 1);
        break;
      case 3:
        this.move(ux1);
        this.move(dx3);
        this.move(fx1);
        this.move(bx3);
        break;
    }
  }

  rotate(rotation: number): void {
    for (let j = 0; j < rotation; j += 1) {
      this.rot(0);
      if (j % 2 === 1) this.rot(1);
      if (j % 8 === 7) this.rot(2);
      if (j % 16 === 15) this.rot(3);
    }
  }

  equals(other: Center1): boolean {
    for (let i = 0; i < 24; i += 1) {
      if (this.ct[i] !== other.ct[i]) return false;
    }
    return true;
  }
}

export class Center2 {
  static rlmv: number[][] = [];
  static ctmv: number[][] = [];
  static rlrot: number[][] = [];
  static ctprun: number[] = [];

  private static readonly pmv = [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0,
    1, 0, 0, 0,
  ] as const;

  readonly rl = Array.from({ length: 8 }, () => 0);
  readonly ct = Array.from({ length: 16 }, () => 0);
  parity = 0;

  private static ensureTables(): void {
    if (Center2.rlmv.length !== 0) return;

    Center2.rlmv = Array.from({ length: 70 }, () => Array.from({ length: 28 }, () => 0));
    Center2.ctmv = Array.from({ length: 6435 }, () => Array.from({ length: 28 }, () => 0));
    Center2.rlrot = Array.from({ length: 70 }, () => Array.from({ length: 16 }, () => 0));
    Center2.ctprun = Array.from({ length: 6435 * 35 * 2 }, () => -1);
  }

  static init(): void {
    Center2.ensureTables();

    const center = new Center2();

    for (let i = 0; i < 35 * 2; i += 1) {
      for (let move = 0; move < 28; move += 1) {
        center.setrl(i);
        center.move(move2std[move]!);
        Center2.rlmv[i]![move] = center.getrl();
      }
    }

    for (let i = 0; i < 70; i += 1) {
      center.setrl(i);
      for (let j = 0; j < 16; j += 1) {
        Center2.rlrot[i]![j] = center.getrl();
        center.rot(0);
        if (j % 2 === 1) center.rot(1);
        if (j % 8 === 7) center.rot(2);
      }
    }

    for (let i = 0; i < 6435; i += 1) {
      for (let move = 0; move < 28; move += 1) {
        center.setct(i);
        center.move(move2std[move]!);
        Center2.ctmv[i]![move] = center.getct();
      }
    }

    Center2.ctprun.fill(-1);
    Center2.ctprun[0] = 0;
    Center2.ctprun[18] = 0;
    Center2.ctprun[28] = 0;
    Center2.ctprun[46] = 0;
    Center2.ctprun[54] = 0;
    Center2.ctprun[56] = 0;
    let depth = 0;
    let done = 6;

    while (done !== 6435 * 35 * 2) {
      for (let i = 0; i < 6435 * 35 * 2; i += 1) {
        if (Center2.ctprun[i] !== depth) continue;

        const ct = Math.floor(i / 70);
        const rl = i % 70;
        for (let move = 0; move < 23; move += 1) {
          const nextCt = Center2.ctmv[ct]![move]!;
          const nextRl = Center2.rlmv[rl]![move]!;
          const idx = nextCt * 70 + nextRl;
          if (Center2.ctprun[idx] === -1) {
            Center2.ctprun[idx] = depth + 1;
            done += 1;
          }
        }
      }
      depth += 1;
    }
  }

  set(center: CenterLike, edgeParity: number): void {
    for (let i = 0; i < 16; i += 1) this.ct[i] = center.ct[i]! % 3;
    for (let i = 0; i < 8; i += 1) this.rl[i] = center.ct[i + 16]!;
    this.parity = edgeParity;
  }

  getrl(): number {
    let idx = 0;
    let remaining = 4;
    for (let i = 6; i >= 0; i -= 1) {
      if (this.rl[i] !== this.rl[7]) {
        idx += Cnk[i]![remaining]!;
        remaining -= 1;
      }
    }
    return idx * 2 + this.parity;
  }

  setrl(index: number): void {
    this.parity = index & 1;
    index >>>= 1;
    let remaining = 4;
    this.rl[7] = 0;
    for (let i = 6; i >= 0; i -= 1) {
      if (index >= Cnk[i]![remaining]!) {
        index -= Cnk[i]![remaining]!;
        remaining -= 1;
        this.rl[i] = 1;
      } else {
        this.rl[i] = 0;
      }
    }
  }

  getct(): number {
    let idx = 0;
    let remaining = 8;
    for (let i = 14; i >= 0; i -= 1) {
      if (this.ct[i] !== this.ct[15]) {
        idx += Cnk[i]![remaining]!;
        remaining -= 1;
      }
    }
    return idx;
  }

  setct(index: number): void {
    let remaining = 8;
    this.ct[15] = 0;
    for (let i = 14; i >= 0; i -= 1) {
      if (index >= Cnk[i]![remaining]!) {
        index -= Cnk[i]![remaining]!;
        remaining -= 1;
        this.ct[i] = 1;
      } else {
        this.ct[i] = 0;
      }
    }
  }

  rot(rotation: number): void {
    switch (rotation) {
      case 0:
        this.move(ux2);
        this.move(dx2);
        break;
      case 1:
        this.move(rx1);
        this.move(lx3);
        break;
      case 2:
        swap(this.ct, 0, 3, 1, 2, 1);
        swap(this.ct, 8, 11, 9, 10, 1);
        swap(this.ct, 4, 7, 5, 6, 1);
        swap(this.ct, 12, 15, 13, 14, 1);
        swap(this.rl, 0, 3, 5, 6, 1);
        swap(this.rl, 1, 2, 4, 7, 1);
        break;
    }
  }

  move(move: number): void {
    this.parity ^= Center2.pmv[move]!;
    const key = move % 3;
    const face = Math.floor(move / 3);

    switch (face) {
      case 0:
        swap(this.ct, 0, 1, 2, 3, key);
        break;
      case 1:
        swap(this.rl, 0, 1, 2, 3, key);
        break;
      case 2:
        swap(this.ct, 8, 9, 10, 11, key);
        break;
      case 3:
        swap(this.ct, 4, 5, 6, 7, key);
        break;
      case 4:
        swap(this.rl, 4, 5, 6, 7, key);
        break;
      case 5:
        swap(this.ct, 12, 13, 14, 15, key);
        break;
      case 6:
        swap(this.ct, 0, 1, 2, 3, key);
        swap(this.rl, 0, 5, 4, 1, key);
        swap(this.ct, 8, 9, 12, 13, key);
        break;
      case 7:
        swap(this.rl, 0, 1, 2, 3, key);
        swap(this.ct, 1, 15, 5, 9, key);
        swap(this.ct, 2, 12, 6, 10, key);
        break;
      case 8:
        swap(this.ct, 8, 9, 10, 11, key);
        swap(this.rl, 0, 3, 6, 5, key);
        swap(this.ct, 3, 2, 5, 4, key);
        break;
      case 9:
        swap(this.ct, 4, 5, 6, 7, key);
        swap(this.rl, 3, 2, 7, 6, key);
        swap(this.ct, 11, 10, 15, 14, key);
        break;
      case 10:
        swap(this.rl, 4, 5, 6, 7, key);
        swap(this.ct, 0, 8, 4, 14, key);
        swap(this.ct, 3, 11, 7, 13, key);
        break;
      case 11:
        swap(this.ct, 12, 13, 14, 15, key);
        swap(this.rl, 1, 4, 7, 2, key);
        swap(this.ct, 1, 0, 7, 6, key);
        break;
    }
  }
}

export class Center3 {
  static ctmove: number[][] = [];
  static prun: number[] = [];
  private static readonly pmove = [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1,
  ] as const;
  private static readonly rl2std = [0, 9, 14, 23, 27, 28, 41, 42, 46, 55, 60, 69];
  private static readonly std2rl = Array.from({ length: 70 }, () => 0);

  readonly ud = Array.from({ length: 8 }, () => 0);
  readonly rl = Array.from({ length: 8 }, () => 0);
  readonly fb = Array.from({ length: 8 }, () => 0);
  parity = 0;

  private static ensureTables(): void {
    if (Center3.ctmove.length !== 0) return;

    Center3.ctmove = Array.from({ length: 35 * 35 * 12 * 2 }, () =>
      Array.from({ length: 20 }, () => 0),
    );
    Center3.prun = Array.from({ length: 35 * 35 * 12 * 2 }, () => -1);
  }

  static init(): void {
    Center3.ensureTables();

    Center3.std2rl.fill(0);
    for (let i = 0; i < 12; i += 1) Center3.std2rl[Center3.rl2std[i]!] = i;

    const center = new Center3();
    for (let i = 0; i < 35 * 35 * 12 * 2; i += 1) {
      for (let move = 0; move < 20; move += 1) {
        center.setct(i);
        center.move(move);
        Center3.ctmove[i]![move] = center.getct();
      }
    }

    Center3.prun.fill(-1);
    Center3.prun[0] = 0;
    let depth = 0;
    let done = 1;
    while (done !== 29_400) {
      for (let i = 0; i < 29_400; i += 1) {
        if (Center3.prun[i] !== depth) continue;
        for (let move = 0; move < 17; move += 1) {
          const next = Center3.ctmove[i]![move]!;
          if (Center3.prun[next] === -1) {
            Center3.prun[next] = depth + 1;
            done += 1;
          }
        }
      }
      depth += 1;
    }
  }

  set(center: CenterLike, edgeCornerParity: number): void {
    const parity =
      (center.ct[0]! % 3 > center.ct[8]! % 3 !== center.ct[8]! % 3 > center.ct[16]! % 3) !==
      center.ct[0]! % 3 > center.ct[16]! % 3
        ? 0
        : 1;
    for (let i = 0; i < 8; i += 1) {
      this.ud[i] = (Math.floor(center.ct[i]! / 3) ^ 1) & 1;
      this.fb[i] = (Math.floor(center.ct[i + 8]! / 3) ^ 1) & 1;
      this.rl[i] = (Math.floor(center.ct[i + 16]! / 3) ^ 1 ^ parity) & 1;
    }
    this.parity = parity ^ edgeCornerParity;
  }

  getct(): number {
    let idx = 0;
    let remaining = 4;
    for (let i = 6; i >= 0; i -= 1) {
      if (this.ud[i] !== this.ud[7]) {
        idx += Cnk[i]![remaining]!;
        remaining -= 1;
      }
    }
    idx *= 35;
    remaining = 4;
    for (let i = 6; i >= 0; i -= 1) {
      if (this.fb[i] !== this.fb[7]) {
        idx += Cnk[i]![remaining]!;
        remaining -= 1;
      }
    }
    idx *= 12;
    const check = this.fb[7]! ^ this.ud[7]!;
    let idxrl = 0;
    remaining = 4;
    for (let i = 7; i >= 0; i -= 1) {
      if (this.rl[i] !== check) {
        idxrl += Cnk[i]![remaining]!;
        remaining -= 1;
      }
    }
    return this.parity + 2 * (idx + Center3.std2rl[idxrl]!);
  }

  setct(index: number): void {
    this.parity = index & 1;
    index >>>= 1;
    let idxrl = Center3.rl2std[index % 12]!;
    index = Math.floor(index / 12);
    let remaining = 4;
    for (let i = 7; i >= 0; i -= 1) {
      this.rl[i] = 0;
      if (idxrl >= Cnk[i]![remaining]!) {
        idxrl -= Cnk[i]![remaining]!;
        remaining -= 1;
        this.rl[i] = 1;
      }
    }
    let idxfb = index % 35;
    index = Math.floor(index / 35);
    remaining = 4;
    this.fb[7] = 0;
    for (let i = 6; i >= 0; i -= 1) {
      if (idxfb >= Cnk[i]![remaining]!) {
        idxfb -= Cnk[i]![remaining]!;
        remaining -= 1;
        this.fb[i] = 1;
      } else {
        this.fb[i] = 0;
      }
    }
    remaining = 4;
    this.ud[7] = 0;
    for (let i = 6; i >= 0; i -= 1) {
      if (index >= Cnk[i]![remaining]!) {
        index -= Cnk[i]![remaining]!;
        remaining -= 1;
        this.ud[i] = 1;
      } else {
        this.ud[i] = 0;
      }
    }
  }

  move(move: number): void {
    this.parity ^= Center3.pmove[move]!;
    switch (move) {
      case 0:
      case 1:
      case 2:
        swap(this.ud, 0, 1, 2, 3, move % 3);
        break;
      case 3:
        swap(this.rl, 0, 1, 2, 3, 1);
        break;
      case 4:
      case 5:
      case 6:
        swap(this.fb, 0, 1, 2, 3, (move - 1) % 3);
        break;
      case 7:
      case 8:
      case 9:
        swap(this.ud, 4, 5, 6, 7, (move - 1) % 3);
        break;
      case 10:
        swap(this.rl, 4, 5, 6, 7, 1);
        break;
      case 11:
      case 12:
      case 13:
        swap(this.fb, 4, 5, 6, 7, (move + 1) % 3);
        break;
      case 14:
        swap(this.ud, 0, 1, 2, 3, 1);
        swap(this.rl, 0, 5, 4, 1, 1);
        swap(this.fb, 0, 5, 4, 1, 1);
        break;
      case 15:
        swap(this.rl, 0, 1, 2, 3, 1);
        swap(this.fb, 1, 4, 7, 2, 1);
        swap(this.ud, 1, 6, 5, 2, 1);
        break;
      case 16:
        swap(this.fb, 0, 1, 2, 3, 1);
        swap(this.ud, 3, 2, 5, 4, 1);
        swap(this.rl, 0, 3, 6, 5, 1);
        break;
      case 17:
        swap(this.ud, 4, 5, 6, 7, 1);
        swap(this.rl, 3, 2, 7, 6, 1);
        swap(this.fb, 3, 2, 7, 6, 1);
        break;
      case 18:
        swap(this.rl, 4, 5, 6, 7, 1);
        swap(this.fb, 0, 3, 6, 5, 1);
        swap(this.ud, 0, 3, 4, 7, 1);
        break;
      case 19:
        swap(this.fb, 4, 5, 6, 7, 1);
        swap(this.ud, 0, 7, 6, 1, 1);
        swap(this.rl, 1, 4, 7, 2, 1);
        break;
    }
  }
}

const CENTER_FACELET = [
  0x5, 0x6, 0xa, 0x9, 0x35, 0x36, 0x3a, 0x39, 0x25, 0x26, 0x2a, 0x29, 0x55, 0x56, 0x5a, 0x59, 0x15,
  0x16, 0x1a, 0x19, 0x45, 0x46, 0x4a, 0x49,
] as const;
