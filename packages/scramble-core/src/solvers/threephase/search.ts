import type { RandomSource } from '../../random-source.js';
import { SearchWCA } from '../min2phase/search-wca.js';
import { Center1, Center2, Center3 } from './center.js';
import { Edge3 } from './edge.js';
import { FullCube } from './full-cube.js';
import {
  bx3,
  ckmv2,
  ckmv3,
  dx3,
  fx1,
  move2std,
  move3std,
  skipAxis2,
  skipAxis3,
  toMove,
  ux1,
} from './tables.js';

const PHASE1_SOLUTIONS = 10_000;
const PHASE2_ATTEMPTS = 500;
const PHASE2_SOLUTIONS = 100;
const PHASE3_ATTEMPTS = 100;

let isInitialized = false;

export const initThreephaseTables = (): void => {
  if (isInitialized) return;

  SearchWCA.init();
  Center1.initSym();
  Center1.raw2sym = Array.from({ length: 735_471 }, () => 0);
  Center1.initSym2Raw();
  Center1.createMoveTable();
  Center1.raw2sym = null;
  Center1.createPrun();
  Center2.init();
  Center3.init();
  Edge3.initMvrot();
  Edge3.initRaw2Sym();
  Edge3.createPrun();

  isInitialized = true;
};

export class Search {
  inverseSolution = true;
  withRotation = false;
  solution = '';

  private readonly p1sols: FullCube[] = [];
  private readonly move1 = Array.from({ length: 15 }, () => 0);
  private readonly move2 = Array.from({ length: 20 }, () => 0);
  private readonly move3 = Array.from({ length: 20 }, () => 0);
  private readonly c1 = new FullCube();
  private readonly c2 = new FullCube();
  private readonly ct2 = new Center2();
  private readonly ct3 = new Center3();
  private readonly e12 = new Edge3();
  private readonly tempe = Array.from({ length: 20 }, () => new Edge3());
  private readonly search333 = new SearchWCA();
  private readonly arr2 = Array.from(
    { length: PHASE2_SOLUTIONS },
    (): FullCube | null => null,
  );

  private cube = new FullCube();
  private length1 = 0;
  private length2 = 0;
  private add1 = false;
  private p1SolsCnt = 0;
  private arr2idx = 0;

  randomState(random: RandomSource): string {
    this.cube = FullCube.random(random);
    this.doSearch();
    return this.solution;
  }

  solve(scramble: string): string {
    this.cube = FullCube.fromMoves(scramble);
    this.doSearch();
    return this.solution;
  }

  private doSearch(): void {
    initThreephaseTables();
    this.solution = '';

    const ud = new Center1(this.cube.getCenter(), 0).getsym();
    const fb = new Center1(this.cube.getCenter(), 1).getsym();
    const rl = new Center1(this.cube.getCenter(), 2).getsym();
    const udprun = Center1.csprun[ud >>> 6]!;
    const fbprun = Center1.csprun[fb >>> 6]!;
    const rlprun = Center1.csprun[rl >>> 6]!;

    this.p1SolsCnt = 0;
    this.arr2idx = 0;
    this.p1sols.length = 0;

    for (
      this.length1 = Math.min(udprun, fbprun, rlprun);
      this.length1 < 100;
      this.length1 += 1
    ) {
      if (
        (rlprun <= this.length1 &&
          this.search1(rl >>> 6, rl & 0x3f, this.length1, -1, 0)) ||
        (udprun <= this.length1 &&
          this.search1(ud >>> 6, ud & 0x3f, this.length1, -1, 0)) ||
        (fbprun <= this.length1 &&
          this.search1(fb >>> 6, fb & 0x3f, this.length1, -1, 0))
      ) {
        break;
      }
    }

    const p1SolsArr = [...this.p1sols].sort((first, second) => first.value - second.value);
    if (p1SolsArr[0] === undefined) {
      throw new Error('@cubekit/scramble-core: threephase phase 1 found no candidates');
    }

    let maxLength2 = 9;
    let length12 = 100;
    do {
      outer: for (length12 = p1SolsArr[0].value; length12 < 100; length12 += 1) {
        for (const p1Solution of p1SolsArr) {
          if (p1Solution.value > length12) break;
          if (length12 - p1Solution.length1 > maxLength2) continue;

          this.c1.copy(p1Solution);
          this.ct2.set(this.c1.getCenter(), this.c1.getEdge().getParity());
          const s2ct = this.ct2.getct();
          const s2rl = this.ct2.getrl();
          this.length1 = p1Solution.length1;
          this.length2 = length12 - p1Solution.length1;

          if (this.search2(s2ct, s2rl, this.length2, 28, 0)) break outer;
        }
      }
      maxLength2 += 1;
    } while (length12 === 100);

    const arr2 = this.arr2
      .slice(0, this.arr2idx)
      .filter((cube): cube is FullCube => cube !== null)
      .sort((first, second) => first.value - second.value);
    if (arr2.length === 0) {
      throw new Error(
        `@cubekit/scramble-core: threephase phase 2 found no candidates (phase1=${this.p1sols.length}, firstValue=${String(p1SolsArr[0]?.value)}, arr2idx=${this.arr2idx}, arr2len=${this.arr2.length})`,
      );
    }
    let length123 = 100;
    let index = 0;
    let maxLength3 = 13;

    do {
      outer2: for (length123 = arr2[0]!.value; length123 < 100; length123 += 1) {
        for (let i = 0; i < Math.min(arr2.length, PHASE3_ATTEMPTS); i += 1) {
          const candidate = arr2[i]!;
          if (candidate.value > length123) break;
          if (length123 - candidate.length1 - candidate.length2 > maxLength3) continue;

          const edgeParity = this.e12.setFromEdgeCube(candidate.getEdge());
          this.ct3.set(candidate.getCenter(), edgeParity ^ candidate.getCorner().getParity());
          const ct = this.ct3.getct();
          const edge = this.e12.get(10);
          const prun = Edge3.getprun(this.e12.getsym());
          const length3 = length123 - candidate.length1 - candidate.length2;

          if (prun <= length3 && this.search3(edge, ct, prun, length3, 20, 0)) {
            index = i;
            break outer2;
          }
        }
      }
      maxLength3 += 1;
    } while (length123 === 100);

    const solcube = new FullCube(arr2[index]!);
    this.length1 = solcube.length1;
    this.length2 = solcube.length2;
    const length = length123 - this.length1 - this.length2;
    for (let i = 0; i < length; i += 1) solcube.move(move3std[this.move3[i]!]!);

    const facelet = solcube.to333Facelet();
    const sol = this.search333.solution(facelet, 21, 1_000_000, 500, 0);
    if (sol.startsWith('Error')) {
      throw new Error(`@cubekit/scramble-core: min2phase returned ${sol} during 4x4 reduction`);
    }
    const sol333 = toMove(sol);
    for (const move of sol333) solcube.move(move);

    this.solution = solcube.getMoveString(this.inverseSolution, this.withRotation);
  }

  private search1(ct: number, sym: number, maxLength: number, lastMove: number, depth: number): boolean {
    if (ct === 0 && maxLength < 5) return maxLength === 0 && this.init2(sym, lastMove);

    for (let axis = 0; axis < 27; axis += 3) {
      if (axis === lastMove || axis === lastMove - 9 || axis === lastMove - 18) continue;

      for (let power = 0; power < 3; power += 1) {
        const move = axis + power;
        let ctx = Center1.ctsmv[ct]![Center1.symmove[sym]![move]!]!;
        const prun = Center1.csprun[ctx >>> 6]!;
        if (prun >= maxLength) {
          if (prun > maxLength) break;
          continue;
        }
        const symx = Center1.symmult[sym]![ctx & 0x3f]!;
        ctx >>>= 6;
        this.move1[depth] = move;
        if (this.search1(ctx, symx, maxLength - 1, axis, depth + 1)) return true;
      }
    }

    return false;
  }

  private init2(sym: number, _lastMove: number): boolean {
    this.c1.copy(this.cube);
    for (let i = 0; i < this.length1; i += 1) this.c1.move(this.move1[i]!);

    switch (Center1.finish[sym]) {
      case 0:
        this.c1.move(fx1);
        this.c1.move(bx3);
        this.move1[this.length1] = fx1;
        this.move1[this.length1 + 1] = bx3;
        this.add1 = true;
        sym = 19;
        break;
      case 12_869:
        this.c1.move(ux1);
        this.c1.move(dx3);
        this.move1[this.length1] = ux1;
        this.move1[this.length1 + 1] = dx3;
        this.add1 = true;
        sym = 34;
        break;
      case 735_470:
        this.add1 = false;
        sym = 0;
        break;
      default:
        return false;
    }

    this.ct2.set(this.c1.getCenter(), this.c1.getEdge().getParity());
    const s2ct = this.ct2.getct();
    const s2rl = this.ct2.getrl();
    if (
      !Number.isSafeInteger(s2ct) ||
      !Number.isSafeInteger(s2rl) ||
      s2ct < 0 ||
      s2ct >= 6435 ||
      s2rl < 0 ||
      s2rl >= 70
    ) {
      throw new Error(
        `@cubekit/scramble-core: invalid phase 2 coordinate ct=${s2ct} rl=${s2rl}`,
      );
    }
    const ctp = Center2.ctprun[s2ct * 70 + s2rl]!;

    this.c1.value = ctp + this.length1;
    this.c1.length1 = this.length1;
    this.c1.add1 = this.add1;
    this.c1.sym = sym;
    this.p1SolsCnt += 1;
    this.pushP1Solution(this.c1);

    return this.p1SolsCnt === PHASE1_SOLUTIONS;
  }

  private pushP1Solution(cube: FullCube): void {
    if (this.p1sols.length < PHASE2_ATTEMPTS) {
      this.p1sols.push(new FullCube(cube));
      return;
    }

    let maxIndex = 0;
    for (let i = 1; i < this.p1sols.length; i += 1) {
      if (this.p1sols[i]!.value > this.p1sols[maxIndex]!.value) maxIndex = i;
    }
    if (this.p1sols[maxIndex]!.value > cube.value) {
      this.p1sols[maxIndex]!.copy(cube);
    }
  }

  private search2(ct: number, rl: number, maxLength: number, lastMove: number, depth: number): boolean {
    if (ct === 0 && Center2.ctprun[rl] === 0 && maxLength === 0) return this.init3();

    for (let move = 0; move < 23; move += 1) {
      if (ckmv2[lastMove]![move]) {
        move = skipAxis2[move]!;
        continue;
      }
      const ctx = Center2.ctmv[ct]![move]!;
      const rlx = Center2.rlmv[rl]![move]!;
      const prun = Center2.ctprun[ctx * 70 + rlx]!;

      if (prun >= maxLength) {
        if (prun > maxLength) move = skipAxis2[move]!;
        continue;
      }

      this.move2[depth] = move2std[move]!;
      if (this.search2(ctx, rlx, maxLength - 1, move, depth + 1)) return true;
    }

    return false;
  }

  private init3(): boolean {
    this.c2.copy(this.c1);
    for (let i = 0; i < this.length2; i += 1) this.c2.move(this.move2[i]!);
    if (!this.c2.checkEdge()) return false;

    const edgeParity = this.e12.setFromEdgeCube(this.c2.getEdge());
    this.ct3.set(this.c2.getCenter(), edgeParity ^ this.c2.getCorner().getParity());
    const ct = this.ct3.getct();
    const prun = Edge3.getprun(this.e12.getsym());

    const candidate = this.arr2[this.arr2idx] ?? new FullCube(this.c2);
    this.arr2[this.arr2idx] = candidate;
    candidate.copy(this.c2);
    candidate.value = this.length1 + this.length2 + Math.max(prun, Center3.prun[ct]!);
    candidate.length2 = this.length2;
    this.arr2idx += 1;

    return this.arr2idx === this.arr2.length;
  }

  private search3(
    edge: number,
    ct: number,
    prun: number,
    maxLength: number,
    lastMove: number,
    depth: number,
  ): boolean {
    if (maxLength === 0) return edge === 0 && ct === 0;

    this.tempe[depth]!.set(edge);
    for (let move = 0; move < 17; move += 1) {
      if (ckmv3[lastMove]![move]) {
        move = skipAxis3[move]!;
        continue;
      }
      const ctx = Center3.ctmove[ct]![move]!;
      const prun1 = Center3.prun[ctx]!;
      if (prun1 >= maxLength) {
        if (prun1 > maxLength && move < 14) move = skipAxis3[move]!;
        continue;
      }

      const edgex = Edge3.getmvrot(this.tempe[depth]!.edge, move << 3, 10);
      let symcord1x = Edge3.raw2sym[Math.floor(edgex / Edge3.N_RAW)]!;
      const symx = symcord1x & 0x7;
      symcord1x >>>= 3;
      const cord2x = Edge3.getmvrot(this.tempe[depth]!.edge, (move << 3) | symx, 10) % Edge3.N_RAW;
      const prunx = Edge3.getprun(symcord1x * Edge3.N_RAW + cord2x, prun);

      if (prunx >= maxLength) {
        if (prunx > maxLength && move < 14) move = skipAxis3[move]!;
        continue;
      }

      if (this.search3(edgex, ctx, prunx, maxLength - 1, move, depth + 1)) {
        this.move3[depth] = move;
        return true;
      }
    }

    return false;
  }
}
