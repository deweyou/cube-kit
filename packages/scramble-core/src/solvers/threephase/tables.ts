export const U = 0;
export const R = 1;
export const F = 2;
export const D = 3;
export const L = 4;
export const B = 5;

export const U1 = 0;
export const U2 = 1;
export const U3 = 2;
export const U4 = 3;
export const U5 = 4;
export const U6 = 5;
export const U7 = 6;
export const U8 = 7;
export const U9 = 8;
export const R1 = 9;
export const R2 = 10;
export const R3 = 11;
export const R4 = 12;
export const R5 = 13;
export const R6 = 14;
export const R7 = 15;
export const R8 = 16;
export const R9 = 17;
export const F1 = 18;
export const F2 = 19;
export const F3 = 20;
export const F4 = 21;
export const F5 = 22;
export const F6 = 23;
export const F7 = 24;
export const F8 = 25;
export const F9 = 26;
export const D1 = 27;
export const D2 = 28;
export const D3 = 29;
export const D4 = 30;
export const D5 = 31;
export const D6 = 32;
export const D7 = 33;
export const D8 = 34;
export const D9 = 35;
export const L1 = 36;
export const L2 = 37;
export const L3 = 38;
export const L4 = 39;
export const L5 = 40;
export const L6 = 41;
export const L7 = 42;
export const L8 = 43;
export const L9 = 44;
export const B1 = 45;
export const B2 = 46;
export const B3 = 47;
export const B4 = 48;
export const B5 = 49;
export const B6 = 50;
export const B7 = 51;
export const B8 = 52;
export const B9 = 53;

export const Ux1 = 0;
export const Ux2 = 1;
export const Ux3 = 2;
export const Rx1 = 3;
export const Rx2 = 4;
export const Rx3 = 5;
export const Fx1 = 6;
export const Fx2 = 7;
export const Fx3 = 8;
export const Dx1 = 9;
export const Dx2 = 10;
export const Dx3 = 11;
export const Lx1 = 12;
export const Lx2 = 13;
export const Lx3 = 14;
export const Bx1 = 15;
export const Bx2 = 16;
export const Bx3 = 17;
export const ux1 = 18;
export const ux2 = 19;
export const ux3 = 20;
export const rx1 = 21;
export const rx2 = 22;
export const rx3 = 23;
export const fx1 = 24;
export const fx2 = 25;
export const fx3 = 26;
export const dx1 = 27;
export const dx2 = 28;
export const dx3 = 29;
export const lx1 = 30;
export const lx2 = 31;
export const lx3 = 32;
export const bx1 = 33;
export const bx2 = 34;
export const bx3 = 35;
export const eom = 36;

export const move2str = [
  'U',
  'U2',
  "U'",
  'R',
  'R2',
  "R'",
  'F',
  'F2',
  "F'",
  'D',
  'D2',
  "D'",
  'L',
  'L2',
  "L'",
  'B',
  'B2',
  "B'",
  'Uw',
  'Uw2',
  "Uw'",
  'Rw',
  'Rw2',
  "Rw'",
  'Fw',
  'Fw2',
  "Fw'",
  'Dw',
  'Dw2',
  "Dw'",
  'Lw',
  'Lw2',
  "Lw'",
  'Bw',
  'Bw2',
  "Bw'",
] as const;

export const move2std = [
  Ux1,
  Ux2,
  Ux3,
  Rx1,
  Rx2,
  Rx3,
  Fx1,
  Fx2,
  Fx3,
  Dx1,
  Dx2,
  Dx3,
  Lx1,
  Lx2,
  Lx3,
  Bx1,
  Bx2,
  Bx3,
  ux2,
  rx1,
  rx2,
  rx3,
  fx2,
  dx2,
  lx1,
  lx2,
  lx3,
  bx2,
  eom,
] as const;

export const move3std = [
  Ux1,
  Ux2,
  Ux3,
  Rx2,
  Fx1,
  Fx2,
  Fx3,
  Dx1,
  Dx2,
  Dx3,
  Lx2,
  Bx1,
  Bx2,
  Bx3,
  ux2,
  rx2,
  fx2,
  dx2,
  lx2,
  bx2,
  eom,
] as const;

export const Cnk: number[][] = Array.from({ length: 25 }, () =>
  Array.from({ length: 25 }, () => 0),
);
export const fact = Array.from({ length: 13 }, () => 0);

for (let i = 0; i < 25; i += 1) {
  Cnk[i]![i] = 1;
  Cnk[i]![0] = 1;
}
for (let i = 1; i < 25; i += 1) {
  for (let j = 1; j <= i; j += 1) {
    Cnk[i]![j] = Cnk[i - 1]![j]! + Cnk[i - 1]![j - 1]!;
  }
}
fact[0] = 1;
for (let i = 0; i < 12; i += 1) {
  fact[i + 1] = fact[i]! * (i + 1);
}

export const std2move = Array.from({ length: 37 }, () => 0);
export const std3move = Array.from({ length: 37 }, () => 0);
export const ckmv: boolean[][] = Array.from({ length: 37 }, () =>
  Array.from({ length: 36 }, () => false),
);
export const ckmv2: boolean[][] = Array.from({ length: 29 }, () =>
  Array.from({ length: 28 }, () => false),
);
export const ckmv3: boolean[][] = Array.from({ length: 21 }, () =>
  Array.from({ length: 20 }, () => false),
);
export const skipAxis = Array.from({ length: 36 }, () => 0);
export const skipAxis2 = Array.from({ length: 28 }, () => 0);
export const skipAxis3 = Array.from({ length: 20 }, () => 0);

for (let i = 0; i < 29; i += 1) {
  std2move[move2std[i]!] = i;
}
for (let i = 0; i < 21; i += 1) {
  std3move[move3std[i]!] = i;
}
for (let i = 0; i < 36; i += 1) {
  for (let j = 0; j < 36; j += 1) {
    ckmv[i]![j] =
      Math.floor(i / 3) === Math.floor(j / 3) ||
      (Math.floor(i / 3) % 3 === Math.floor(j / 3) % 3 && i > j);
  }
  ckmv[36]![i] = false;
}
for (let i = 0; i < 29; i += 1) {
  for (let j = 0; j < 28; j += 1) {
    ckmv2[i]![j] = ckmv[move2std[i]!]![move2std[j]!]!;
  }
}
for (let i = 0; i < 21; i += 1) {
  for (let j = 0; j < 20; j += 1) {
    ckmv3[i]![j] = ckmv[move3std[i]!]![move3std[j]!]!;
  }
}
for (let i = 0; i < 36; i += 1) {
  skipAxis[i] = 36;
  for (let j = i; j < 36; j += 1) {
    if (!ckmv[i]![j]) {
      skipAxis[i] = j - 1;
      break;
    }
  }
}
for (let i = 0; i < 28; i += 1) {
  skipAxis2[i] = 28;
  for (let j = i; j < 28; j += 1) {
    if (!ckmv2[i]![j]) {
      skipAxis2[i] = j - 1;
      break;
    }
  }
}
for (let i = 0; i < 20; i += 1) {
  skipAxis3[i] = 20;
  for (let j = i; j < 20; j += 1) {
    if (!ckmv3[i]![j]) {
      skipAxis3[i] = j - 1;
      break;
    }
  }
}

export const swap = (
  arr: number[],
  a: number,
  b: number,
  c: number,
  d: number,
  key: number,
): void => {
  let temp: number;
  switch (key) {
    case 0:
      temp = arr[d]!;
      arr[d] = arr[c]!;
      arr[c] = arr[b]!;
      arr[b] = arr[a]!;
      arr[a] = temp;
      return;
    case 1:
      temp = arr[a]!;
      arr[a] = arr[c]!;
      arr[c] = temp;
      temp = arr[b]!;
      arr[b] = arr[d]!;
      arr[d] = temp;
      return;
    case 2:
      temp = arr[a]!;
      arr[a] = arr[b]!;
      arr[b] = arr[c]!;
      arr[c] = arr[d]!;
      arr[d] = temp;
      return;
    default:
      return;
  }
};

export const set8Perm = (arr: number[], idx: number): void => {
  let val = 0x76543210;
  for (let i = 0; i < 7; i += 1) {
    const p = fact[7 - i]!;
    let v = Math.floor(idx / p);
    idx -= v * p;
    v <<= 2;
    arr[i] = (val >>> v) & 0xf;
    const m = (1 << v) - 1;
    val = (val & m) + ((val >>> 4) & ~m);
  }
  arr[7] = val;
};

export const parity = (arr: readonly number[]): number => {
  let value = 0;
  for (let i = 0; i < arr.length; i += 1) {
    for (let j = i; j < arr.length; j += 1) {
      if (arr[i]! > arr[j]!) value ^= 1;
    }
  }
  return value;
};

export const toMove = (algorithm: string): number[] => {
  const moves: number[] = [];
  const tokens = algorithm.trim().length === 0 ? [] : algorithm.trim().split(/\s+/);

  for (const token of tokens) {
    const match = token.match(/^([URFDLB])w?(2|')?$/);
    if (match === null) continue;
    const faceIndex = 'URFDLB'.indexOf(match[1]!);
    const isWide = token.includes('w');
    let move = faceIndex * 3 + (isWide ? 18 : 0);
    if (match[2] === '2') move += 1;
    if (match[2] === "'") move += 2;
    moves.push(move);
  }

  return moves;
};
