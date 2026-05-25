import { invertAlgorithm } from './util.js';

const SOLVED_FACELETS = 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB';

export class CubieCube {
  readonly generator: string;

  constructor(generator = '') {
    this.generator = generator.trim();
  }

  static solved(): CubieCube {
    return new CubieCube();
  }

  toFaceCube(): string {
    if (this.generator.length === 0) return SOLVED_FACELETS;

    return `${SOLVED_FACELETS}:${this.generator}`;
  }

  inverseGenerator(): string {
    return invertAlgorithm(this.generator);
  }
}

export const SOLVED_FACE_CUBE = SOLVED_FACELETS;
