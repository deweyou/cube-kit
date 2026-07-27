import type { RandomSource } from '../random-source.js';

const ERROR_PREFIX = '@cubegin/solver';

export interface SubgroupGenerator<State> {
  readonly id: string;
  readonly inverseId: string;
  apply(state: State): State;
}

export interface SubgroupSolverOptions<State> {
  readonly identity: State;
  readonly generators: readonly SubgroupGenerator<State>[];
  readonly stateKey: (state: State) => string;
  readonly maxDepth: number;
  readonly maxStates?: number;
}

export interface SubgroupSample<State> {
  readonly state: State;
  readonly scramble: readonly string[];
  readonly depth: number;
}

export interface SubgroupSampleOptions {
  readonly minDepth?: number;
  readonly maxDepth?: number;
}

interface SubgroupNode<State> {
  readonly state: State;
  readonly scramble: readonly string[];
}

export class SubgroupSolver<State> {
  readonly isComplete: boolean;
  readonly size: number;
  readonly #generators: readonly SubgroupGenerator<State>[];
  readonly #nodes: readonly SubgroupNode<State>[];
  readonly #nodesByKey: ReadonlyMap<string, SubgroupNode<State>>;
  readonly #stateKey: (state: State) => string;

  constructor({
    identity,
    generators,
    stateKey,
    maxDepth,
    maxStates = Number.MAX_SAFE_INTEGER,
  }: SubgroupSolverOptions<State>) {
    validateOptions(generators, maxDepth, maxStates);

    const enumeration = enumerateSubgroup({
      identity,
      generators,
      stateKey,
      maxDepth,
      maxStates,
    });

    this.#generators = generators;
    this.#nodes = enumeration.nodes;
    this.#nodesByKey = enumeration.nodesByKey;
    this.#stateKey = stateKey;
    this.isComplete = !enumeration.wasTruncated;
    this.size = enumeration.nodes.length;
  }

  sample(random: RandomSource, options: SubgroupSampleOptions = {}): SubgroupSample<State> {
    const minDepth = options.minDepth ?? 1;
    const maxDepth = options.maxDepth ?? Number.MAX_SAFE_INTEGER;
    if (!Number.isSafeInteger(minDepth) || minDepth < 0) {
      throw new Error(`${ERROR_PREFIX}: subgroup sample minDepth must be a non-negative integer`);
    }
    if (!Number.isSafeInteger(maxDepth) || maxDepth < minDepth) {
      throw new Error(
        `${ERROR_PREFIX}: subgroup sample maxDepth must be an integer at least minDepth`,
      );
    }

    const candidates = this.#nodes.filter(
      ({ scramble }) => scramble.length >= minDepth && scramble.length <= maxDepth,
    );
    if (candidates.length === 0) {
      throw new Error(`${ERROR_PREFIX}: enumerated subgroup has no state in the requested depth`);
    }

    const node = nodeAt(candidates, random.nextInt(candidates.length));
    return {
      state: node.state,
      scramble: node.scramble,
      depth: node.scramble.length,
    };
  }

  solve(state: State): readonly string[] {
    const key = this.#stateKey(state);
    const node = this.#nodesByKey.get(key);
    if (node === undefined) {
      throw new Error(`${ERROR_PREFIX}: state '${key}' is not in the enumerated subgroup`);
    }

    const inverseById = new Map(this.#generators.map(({ id, inverseId }) => [id, inverseId]));

    return node.scramble
      .slice()
      .reverse()
      .map((move) => inverseById.get(move) ?? missingInverse(move));
  }
}

interface EnumerateSubgroupOptions<State> extends SubgroupSolverOptions<State> {
  readonly maxStates: number;
}

const enumerateSubgroup = <State>({
  identity,
  generators,
  stateKey,
  maxDepth,
  maxStates,
}: EnumerateSubgroupOptions<State>): {
  readonly nodes: readonly SubgroupNode<State>[];
  readonly nodesByKey: ReadonlyMap<string, SubgroupNode<State>>;
  readonly wasTruncated: boolean;
} => {
  const identityNode: SubgroupNode<State> = { state: identity, scramble: [] };
  const nodes: SubgroupNode<State>[] = [identityNode];
  const nodesByKey = new Map([[stateKey(identity), identityNode]]);
  let wasTruncated = false;

  for (let cursor = 0; cursor < nodes.length; cursor += 1) {
    const node = nodeAt(nodes, cursor);
    for (const generator of generators) {
      const nextState = generator.apply(node.state);
      const nextKey = stateKey(nextState);
      if (nodesByKey.has(nextKey)) continue;

      if (node.scramble.length >= maxDepth || nodes.length >= maxStates) {
        wasTruncated = true;
        continue;
      }

      const nextNode: SubgroupNode<State> = {
        state: nextState,
        scramble: [...node.scramble, generator.id],
      };
      nodes.push(nextNode);
      nodesByKey.set(nextKey, nextNode);
    }
  }

  return { nodes, nodesByKey, wasTruncated };
};

const validateOptions = <State>(
  generators: readonly SubgroupGenerator<State>[],
  maxDepth: number,
  maxStates: number,
): void => {
  if (generators.length === 0) {
    throw new Error(`${ERROR_PREFIX}: subgroup must contain at least one generator`);
  }
  if (!Number.isSafeInteger(maxDepth) || maxDepth < 0) {
    throw new Error(`${ERROR_PREFIX}: subgroup maxDepth must be a non-negative integer`);
  }
  if (!Number.isSafeInteger(maxStates) || maxStates <= 0) {
    throw new Error(`${ERROR_PREFIX}: subgroup maxStates must be a positive integer`);
  }

  const ids = new Set<string>();
  for (const generator of generators) {
    if (generator.id.length === 0 || generator.inverseId.length === 0) {
      throw new Error(`${ERROR_PREFIX}: subgroup generator ids must be non-empty`);
    }
    if (ids.has(generator.id)) {
      throw new Error(`${ERROR_PREFIX}: duplicate subgroup generator '${generator.id}'`);
    }
    ids.add(generator.id);
  }
};

const nodeAt = <State>(nodes: readonly State[], index: number): State => {
  const node = nodes[index];
  if (node === undefined) {
    throw new RangeError(
      `${ERROR_PREFIX}: random source returned ${index} for max ${nodes.length}`,
    );
  }

  return node;
};

const missingInverse = (move: string): never => {
  throw new Error(`${ERROR_PREFIX}: subgroup generator '${move}' has no inverse`);
};
