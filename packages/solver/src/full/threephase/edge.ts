import type { RandomSource } from '../../random-source.js';
import {
  B,
  B2,
  B4,
  B6,
  B8,
  D,
  D2,
  D4,
  D6,
  D8,
  F,
  F2,
  F4,
  F6,
  F8,
  L,
  L2,
  L4,
  L6,
  L8,
  R,
  R2,
  R4,
  R6,
  R8,
  U,
  U2,
  U4,
  U6,
  U8,
  parity,
  swap,
} from './tables.js';

export class EdgeCube {
  static readonly edgeColor = [
    [F, U],
    [L, U],
    [B, U],
    [R, U],
    [B, D],
    [L, D],
    [F, D],
    [R, D],
    [F, L],
    [B, L],
    [B, R],
    [F, R],
  ] as const;
  static readonly edgeMap = [
    F2,
    L2,
    B2,
    R2,
    B8,
    L8,
    F8,
    R8,
    F4,
    B6,
    B4,
    F6,
    U8,
    U4,
    U2,
    U6,
    D8,
    D4,
    D2,
    D6,
    L6,
    L4,
    R6,
    R4,
  ] as const;

  readonly ep = Array.from({ length: 24 }, (_, index) => index);

  static random(random: RandomSource): EdgeCube {
    const cube = new EdgeCube();
    for (let i = 0; i < 23; i += 1) {
      const t = i + random.nextInt(24 - i);
      if (t !== i) {
        const value = cube.ep[i]!;
        cube.ep[i] = cube.ep[t]!;
        cube.ep[t] = value;
      }
    }
    return cube;
  }

  copy(edge: EdgeCube): void {
    for (let i = 0; i < 24; i += 1) this.ep[i] = edge.ep[i]!;
  }

  getParity(): number {
    return parity(this.ep);
  }

  fill333Facelet(facelet: string[]): void {
    for (let i = 0; i < 24; i += 1) {
      facelet[EdgeCube.edgeMap[i]!] = 'URFDLB'[
        EdgeCube.edgeColor[this.ep[i]! % 12]![Math.floor(this.ep[i]! / 12)]!
      ]!;
    }
  }

  checkEdge(): boolean {
    let check = 0;
    let edgeParity = false;
    for (let i = 0; i < 12; i += 1) {
      check |= 1 << this.ep[i]!;
      edgeParity = edgeParity !== this.ep[i]! >= 12;
    }
    check &= check >> 12;
    return check === 0 && !edgeParity;
  }

  move(move: number): void {
    const key = move % 3;
    const face = Math.floor(move / 3);
    switch (face) {
      case 0:
        swap(this.ep, 0, 1, 2, 3, key);
        swap(this.ep, 12, 13, 14, 15, key);
        break;
      case 1:
        swap(this.ep, 11, 15, 10, 19, key);
        swap(this.ep, 23, 3, 22, 7, key);
        break;
      case 2:
        swap(this.ep, 0, 11, 6, 8, key);
        swap(this.ep, 12, 23, 18, 20, key);
        break;
      case 3:
        swap(this.ep, 4, 5, 6, 7, key);
        swap(this.ep, 16, 17, 18, 19, key);
        break;
      case 4:
        swap(this.ep, 1, 20, 5, 21, key);
        swap(this.ep, 13, 8, 17, 9, key);
        break;
      case 5:
        swap(this.ep, 2, 9, 4, 10, key);
        swap(this.ep, 14, 21, 16, 22, key);
        break;
      case 6:
        swap(this.ep, 0, 1, 2, 3, key);
        swap(this.ep, 12, 13, 14, 15, key);
        swap(this.ep, 9, 22, 11, 20, key);
        break;
      case 7:
        swap(this.ep, 11, 15, 10, 19, key);
        swap(this.ep, 23, 3, 22, 7, key);
        swap(this.ep, 2, 16, 6, 12, key);
        break;
      case 8:
        swap(this.ep, 0, 11, 6, 8, key);
        swap(this.ep, 12, 23, 18, 20, key);
        swap(this.ep, 3, 19, 5, 13, key);
        break;
      case 9:
        swap(this.ep, 4, 5, 6, 7, key);
        swap(this.ep, 16, 17, 18, 19, key);
        swap(this.ep, 8, 23, 10, 21, key);
        break;
      case 10:
        swap(this.ep, 1, 20, 5, 21, key);
        swap(this.ep, 13, 8, 17, 9, key);
        swap(this.ep, 14, 0, 18, 4, key);
        break;
      case 11:
        swap(this.ep, 2, 9, 4, 10, key);
        swap(this.ep, 14, 21, 16, 22, key);
        swap(this.ep, 7, 15, 1, 17, key);
        break;
    }
  }
}

export class Edge3 {
  static readonly N_SYM = 1538;
  static readonly N_RAW = 20_160;
  static readonly N_EPRUN = Edge3.N_SYM * Edge3.N_RAW;
  static readonly MAX_DEPTH = 10;
  static readonly prunValues = [
    1, 4, 16, 55, 324, 1922, 12_275, 77_640, 485_359, 2_778_197, 11_742_425, 27_492_416, 31_002_941,
    31_006_080,
  ] as const;
  static eprun: number[] = [];
  static sym2raw: number[] = [];
  static symstate: number[] = [];
  static raw2sym: number[] = [];
  static readonly syminv = [0, 1, 6, 3, 4, 5, 2, 7] as const;
  static mvrot: number[][] = [];
  static mvroto: number[][] = [];
  static readonly factX = [
    1, 1, 1, 3, 12, 60, 360, 2520, 20_160, 181_440, 1_814_400, 19_958_400, 239_500_800,
  ] as const;
  static done = 0;
  private static readonly fullEdgeMap = [0, 2, 4, 6, 1, 3, 7, 5, 8, 9, 10, 11] as const;
  private static popcount: number[] = [];
  private static selectUnused: number[][] = [];

  readonly edge = Array.from({ length: 12 }, () => 0);
  readonly edgeo = Array.from({ length: 12 }, () => 0);
  private readonly temp = Array.from({ length: 12 }, () => 0);
  private isStd = true;

  static initStatus(): number {
    return Edge3.done / Edge3.prunValues[Edge3.MAX_DEPTH - 1]!;
  }

  private static ensureTables(): void {
    if (Edge3.eprun.length !== 0) return;

    Edge3.eprun = Array.from({ length: Math.floor(Edge3.N_EPRUN / 16) }, () => 0);
    Edge3.sym2raw = Array.from({ length: Edge3.N_SYM }, () => 0);
    Edge3.symstate = Array.from({ length: Edge3.N_SYM }, () => 0);
    Edge3.raw2sym = Array.from({ length: 11_880 }, () => 0);
    Edge3.mvrot = Array.from({ length: 20 * 8 }, () => Array.from({ length: 12 }, () => 0));
    Edge3.mvroto = Array.from({ length: 20 * 8 }, () => Array.from({ length: 12 }, () => 0));
  }

  private static ensureCoordinateTables(): void {
    if (Edge3.popcount.length !== 0) return;

    Edge3.popcount = Array.from({ length: 1 << 12 }, () => 0);
    for (let mask = 1; mask < Edge3.popcount.length; mask += 1) {
      Edge3.popcount[mask] = Edge3.popcount[mask >> 1]! + (mask & 1);
    }

    Edge3.selectUnused = Array.from({ length: 1 << 12 }, () =>
      Array.from({ length: 12 }, () => -1),
    );
    for (let used = 0; used < Edge3.selectUnused.length; used += 1) {
      let rank = 0;
      for (let value = 0; value < 12; value += 1) {
        if ((used & (1 << value)) !== 0) continue;
        Edge3.selectUnused[used]![rank] = value;
        rank += 1;
      }
    }
  }

  static initMvrot(): void {
    Edge3.ensureTables();

    const edge = new Edge3();
    for (let move = 0; move < 20; move += 1) {
      for (let rotation = 0; rotation < 8; rotation += 1) {
        edge.set(0);
        edge.move(move);
        edge.rotate(rotation);
        for (let i = 0; i < 12; i += 1) Edge3.mvrot[(move << 3) | rotation]![i] = edge.edge[i]!;
        edge.std();
        for (let i = 0; i < 12; i += 1) Edge3.mvroto[(move << 3) | rotation]![i] = edge.temp[i]!;
      }
    }
  }

  static initRaw2Sym(): void {
    Edge3.ensureTables();

    Edge3.sym2raw.fill(0);
    Edge3.symstate.fill(0);
    Edge3.raw2sym.fill(0);
    const edge = new Edge3();
    const occ = Array.from({ length: Math.floor(11_880 / 8) }, () => 0);
    let count = 0;

    for (let i = 0; i < 11_880; i += 1) {
      if ((occ[i >>> 3]! & (1 << (i & 7))) !== 0) continue;
      if (count >= Edge3.N_SYM) {
        throw new Error('@cubegin/solver: Edge3 raw symmetry table overflow');
      }

      edge.set(i * Edge3.factX[8]!);
      for (let j = 0; j < 8; j += 1) {
        const idx = edge.get(4);
        if (idx === i) Edge3.symstate[count] = Edge3.symstate[count]! | (1 << j);
        occ[idx >> 3] = occ[idx >> 3]! | (1 << (idx & 7));
        Edge3.raw2sym[idx] = (count << 3) | Edge3.syminv[j]!;
        edge.rot(0);
        if (j % 2 === 1) {
          edge.rot(1);
          edge.rot(2);
        }
      }
      Edge3.sym2raw[count] = i;
      count += 1;
    }

    if (count !== Edge3.N_SYM) {
      throw new Error(`@cubegin/solver: Edge3 raw symmetry table initialized ${count} classes`);
    }
  }

  static setPruning(table: number[], index: number, value: number): void {
    table[index >> 4] = table[index >> 4]! ^ ((0x3 ^ value) << ((index & 0xf) << 1));
  }

  static getPruning(table: readonly number[], index: number): number {
    return (table[index >> 4]! >>> ((index & 0xf) << 1)) & 0x3;
  }

  static getprun(edge: number, prun?: number): number {
    if (prun !== undefined) {
      const depm3 = Edge3.getPruning(Edge3.eprun, edge);
      if (depm3 === 0x3) return Edge3.MAX_DEPTH;
      return ((depm3 - prun + 16) % 3) + prun - 1;
    }

    const temp = new Edge3();
    let depth = 0;
    let depm3 = Edge3.getPruning(Edge3.eprun, edge);
    if (depm3 === 0x3) return Edge3.MAX_DEPTH;

    while (edge !== 0) {
      depm3 = depm3 === 0 ? 2 : depm3 - 1;
      const symcord1 = Math.floor(edge / Edge3.N_RAW);
      const cord1 = Edge3.sym2raw[symcord1]!;
      const cord2 = edge % Edge3.N_RAW;
      temp.set(cord1 * Edge3.N_RAW + cord2);

      for (let move = 0; move < 17; move += 1) {
        const cord1x = Edge3.getmvrot(temp.edge, move << 3, 4);
        let symcord1x = Edge3.raw2sym[cord1x]!;
        const symx = symcord1x & 0x7;
        symcord1x >>>= 3;
        const cord2x = Edge3.getmvrot(temp.edge, (move << 3) | symx, 10) % Edge3.N_RAW;
        const idx = symcord1x * Edge3.N_RAW + cord2x;
        if (Edge3.getPruning(Edge3.eprun, idx) === depm3) {
          depth += 1;
          edge = idx;
          break;
        }
      }
    }

    return depth;
  }

  static createPrun(): void {
    Edge3.ensureTables();

    const edge = new Edge3();
    const first = new Edge3();
    const second = new Edge3();

    Edge3.eprun.fill(-1);
    let depth = 0;
    Edge3.done = 1;
    Edge3.setPruning(Edge3.eprun, 0, 0);

    while (Edge3.done !== Edge3.N_EPRUN) {
      const inv = depth > 9;
      const depm3 = depth % 3;
      const dep1m3 = (depth + 1) % 3;
      const find = inv ? 0x3 : depm3;
      const check = inv ? depm3 : 0x3;

      if (depth >= Edge3.MAX_DEPTH - 1) break;

      for (let base = 0; base < Edge3.N_EPRUN; base += 16) {
        let value = Edge3.eprun[base >> 4]!;
        if (!inv && value === -1) continue;

        for (let i = base, end = base + 16; i < end; i += 1, value >>= 2) {
          if ((value & 0x3) !== find) continue;

          const symcord1 = Math.floor(i / Edge3.N_RAW);
          const cord1 = Edge3.sym2raw[symcord1]!;
          const cord2 = i % Edge3.N_RAW;
          edge.set(cord1 * Edge3.N_RAW + cord2);

          for (let move = 0; move < 17; move += 1) {
            const cord1x = Edge3.getmvrot(edge.edge, move << 3, 4);
            let symcord1x = Edge3.raw2sym[cord1x]!;
            const symx = symcord1x & 0x7;
            symcord1x >>>= 3;
            const cord2x = Edge3.getmvrot(edge.edge, (move << 3) | symx, 10) % Edge3.N_RAW;
            const idx = symcord1x * Edge3.N_RAW + cord2x;
            if (Edge3.getPruning(Edge3.eprun, idx) !== check) continue;

            Edge3.setPruning(Edge3.eprun, inv ? i : idx, dep1m3);
            Edge3.done += 1;
            if (inv) break;

            let symState = Edge3.symstate[symcord1x]!;
            if (symState === 1) continue;

            first.setEdge(edge);
            first.move(move);
            first.rotate(symx);
            for (let j = 1; (symState >>= 1) !== 0; j += 1) {
              if ((symState & 1) !== 1) continue;
              second.setEdge(first);
              second.rotate(j);
              const idxx = symcord1x * Edge3.N_RAW + (second.get(10) % Edge3.N_RAW);
              if (Edge3.getPruning(Edge3.eprun, idxx) === check) {
                Edge3.setPruning(Edge3.eprun, idxx, dep1m3);
                Edge3.done += 1;
              }
            }
          }
        }
      }
      depth += 1;
    }

    if (Edge3.done !== Edge3.prunValues[Edge3.MAX_DEPTH - 1]) {
      throw new Error(`@cubegin/solver: Edge3 pruning table initialized ${Edge3.done} states`);
    }
  }

  getsym(): number {
    const cord1x = this.get(4);
    let symcord1x = Edge3.raw2sym[cord1x]!;
    const symx = symcord1x & 0x7;
    symcord1x >>>= 3;
    this.rotate(symx);
    const cord2x = this.get(10) % Edge3.N_RAW;
    return symcord1x * Edge3.N_RAW + cord2x;
  }

  setFromEdgeCube(edgeCube: EdgeCube): number {
    for (let i = 0; i < 12; i += 1) {
      this.temp[i] = i;
      this.edge[i] = edgeCube.ep[Edge3.fullEdgeMap[i]! + 12]! % 12;
    }
    let edgeParity = 1;
    for (let i = 0; i < 12; i += 1) {
      while (this.edge[i] !== i) {
        const t = this.edge[i]!;
        this.edge[i] = this.edge[t]!;
        this.edge[t] = t;
        const s = this.temp[i]!;
        this.temp[i] = this.temp[t]!;
        this.temp[t] = s;
        edgeParity ^= 1;
      }
    }
    for (let i = 0; i < 12; i += 1) {
      this.edge[i] = this.temp[edgeCube.ep[Edge3.fullEdgeMap[i]!]! % 12]!;
    }
    return edgeParity;
  }

  setEdge(edge: Edge3): void {
    for (let i = 0; i < 12; i += 1) {
      this.edge[i] = edge.edge[i]!;
      this.edgeo[i] = edge.edgeo[i]!;
    }
    this.isStd = edge.isStd;
  }

  static getmvrot(edgePermutation: readonly number[], mrIdx: number, end: number): number {
    Edge3.ensureCoordinateTables();

    const moveO = Edge3.mvroto[mrIdx]!;
    const move = Edge3.mvrot[mrIdx]!;
    let idx = 0;
    let used = 0;

    for (let i = 0; i < end; i += 1) {
      const value = moveO[edgePermutation[move[i]!]!]!;
      idx *= 12 - i;
      idx += value - Edge3.popcount[used & ((1 << value) - 1)]!;
      used |= 1 << value;
    }

    return idx;
  }

  std(): void {
    for (let i = 0; i < 12; i += 1) this.temp[this.edgeo[i]!] = i;
    for (let i = 0; i < 12; i += 1) {
      this.edge[i] = this.temp[this.edge[i]!]!;
      this.edgeo[i] = i;
    }
    this.isStd = true;
  }

  get(end: number): number {
    Edge3.ensureCoordinateTables();

    if (!this.isStd) this.std();

    let idx = 0;
    let used = 0;
    for (let i = 0; i < end; i += 1) {
      const value = this.edge[i]!;
      idx *= 12 - i;
      idx += value - Edge3.popcount[used & ((1 << value) - 1)]!;
      used |= 1 << value;
    }
    return idx;
  }

  set(index: number): void {
    Edge3.ensureCoordinateTables();

    let used = 0;
    let edgeParity = 0;
    for (let i = 0; i < 11; i += 1) {
      const p = Edge3.factX[11 - i]!;
      let v = Math.floor(index / p);
      index %= p;
      edgeParity ^= v;
      const edge = Edge3.selectUnused[used]![v]!;
      this.edge[i] = edge;
      used |= 1 << edge;
    }
    const last = Edge3.selectUnused[used]![0]!;
    if ((edgeParity & 1) === 0) {
      this.edge[11] = last;
    } else {
      this.edge[11] = this.edge[10]!;
      this.edge[10] = last;
    }
    for (let i = 0; i < 12; i += 1) this.edgeo[i] = i;
    this.isStd = true;
  }

  move(move: number): void {
    this.isStd = false;
    switch (move) {
      case 0:
        this.circle(this.edge, 0, 4, 1, 5);
        this.circle(this.edgeo, 0, 4, 1, 5);
        break;
      case 1:
        this.swap2(this.edge, 0, 4, 1, 5);
        this.swap2(this.edgeo, 0, 4, 1, 5);
        break;
      case 2:
        this.circle(this.edge, 0, 5, 1, 4);
        this.circle(this.edgeo, 0, 5, 1, 4);
        break;
      case 3:
        this.swap2(this.edge, 5, 10, 6, 11);
        this.swap2(this.edgeo, 5, 10, 6, 11);
        break;
      case 4:
        this.circle(this.edge, 0, 11, 3, 8);
        this.circle(this.edgeo, 0, 11, 3, 8);
        break;
      case 5:
        this.swap2(this.edge, 0, 11, 3, 8);
        this.swap2(this.edgeo, 0, 11, 3, 8);
        break;
      case 6:
        this.circle(this.edge, 0, 8, 3, 11);
        this.circle(this.edgeo, 0, 8, 3, 11);
        break;
      case 7:
        this.circle(this.edge, 2, 7, 3, 6);
        this.circle(this.edgeo, 2, 7, 3, 6);
        break;
      case 8:
        this.swap2(this.edge, 2, 7, 3, 6);
        this.swap2(this.edgeo, 2, 7, 3, 6);
        break;
      case 9:
        this.circle(this.edge, 2, 6, 3, 7);
        this.circle(this.edgeo, 2, 6, 3, 7);
        break;
      case 10:
        this.swap2(this.edge, 4, 8, 7, 9);
        this.swap2(this.edgeo, 4, 8, 7, 9);
        break;
      case 11:
        this.circle(this.edge, 1, 9, 2, 10);
        this.circle(this.edgeo, 1, 9, 2, 10);
        break;
      case 12:
        this.swap2(this.edge, 1, 9, 2, 10);
        this.swap2(this.edgeo, 1, 9, 2, 10);
        break;
      case 13:
        this.circle(this.edge, 1, 10, 2, 9);
        this.circle(this.edgeo, 1, 10, 2, 9);
        break;
      case 14:
        this.swap2(this.edge, 0, 4, 1, 5);
        this.swap2(this.edgeo, 0, 4, 1, 5);
        this.swapPair(this.edge, 9, 11);
        this.swapPair(this.edgeo, 8, 10);
        break;
      case 15:
        this.swap2(this.edge, 5, 10, 6, 11);
        this.swap2(this.edgeo, 5, 10, 6, 11);
        this.swapPair(this.edge, 1, 3);
        this.swapPair(this.edgeo, 0, 2);
        break;
      case 16:
        this.swap2(this.edge, 0, 11, 3, 8);
        this.swap2(this.edgeo, 0, 11, 3, 8);
        this.swapPair(this.edge, 5, 7);
        this.swapPair(this.edgeo, 4, 6);
        break;
      case 17:
        this.swap2(this.edge, 2, 7, 3, 6);
        this.swap2(this.edgeo, 2, 7, 3, 6);
        this.swapPair(this.edge, 8, 10);
        this.swapPair(this.edgeo, 9, 11);
        break;
      case 18:
        this.swap2(this.edge, 4, 8, 7, 9);
        this.swap2(this.edgeo, 4, 8, 7, 9);
        this.swapPair(this.edge, 0, 2);
        this.swapPair(this.edgeo, 1, 3);
        break;
      case 19:
        this.swap2(this.edge, 1, 9, 2, 10);
        this.swap2(this.edgeo, 1, 9, 2, 10);
        this.swapPair(this.edge, 4, 6);
        this.swapPair(this.edgeo, 5, 7);
        break;
    }
  }

  rot(rotation: number): void {
    this.isStd = false;
    switch (rotation) {
      case 0:
        this.move(14);
        this.move(17);
        break;
      case 1:
        this.circlex(11, 5, 10, 6);
        this.circlex(5, 10, 6, 11);
        this.circlex(1, 2, 3, 0);
        this.circlex(4, 9, 7, 8);
        this.circlex(8, 4, 9, 7);
        this.circlex(0, 1, 2, 3);
        break;
      case 2:
        this.swapx(4, 5);
        this.swapx(5, 4);
        this.swapx(11, 8);
        this.swapx(8, 11);
        this.swapx(7, 6);
        this.swapx(6, 7);
        this.swapx(9, 10);
        this.swapx(10, 9);
        this.swapx(1, 1);
        this.swapx(0, 0);
        this.swapx(3, 3);
        this.swapx(2, 2);
        break;
    }
  }

  rotate(rotation: number): void {
    while (rotation >= 2) {
      rotation -= 2;
      this.rot(1);
      this.rot(2);
    }
    if (rotation !== 0) this.rot(0);
  }

  private circle(arr: number[], a: number, b: number, c: number, d: number): void {
    const temp = arr[d]!;
    arr[d] = arr[c]!;
    arr[c] = arr[b]!;
    arr[b] = arr[a]!;
    arr[a] = temp;
  }

  private swap2(arr: number[], a: number, b: number, c: number, d: number): void {
    let temp = arr[a]!;
    arr[a] = arr[c]!;
    arr[c] = temp;
    temp = arr[b]!;
    arr[b] = arr[d]!;
    arr[d] = temp;
  }

  private swapPair(arr: number[], x: number, y: number): void {
    const temp = arr[x]!;
    arr[x] = arr[y]!;
    arr[y] = temp;
  }

  private swapx(x: number, y: number): void {
    const temp = this.edge[x]!;
    this.edge[x] = this.edgeo[y]!;
    this.edgeo[y] = temp;
  }

  private circlex(a: number, b: number, c: number, d: number): void {
    const temp = this.edgeo[d]!;
    this.edgeo[d] = this.edge[c]!;
    this.edge[c] = this.edgeo[b]!;
    this.edgeo[b] = this.edge[a]!;
    this.edge[a] = temp;
  }
}
