import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(packageRoot, '../..');
const packagesRoot = resolve(repoRoot, 'packages');
const packageJsonPath = resolve(packageRoot, 'package.json');
const changelogPath = resolve(packageRoot, 'CHANGELOG.md');
const increments = new Set(['major', 'minor', 'patch']);

const args = process.argv.slice(2);
const increment = args.find((arg) => !arg.startsWith('-')) ?? 'patch';
const dryRun = args.includes('--dry-run');

if (!increments.has(increment)) {
  throw new Error(
    `Expected version increment to be major, minor, or patch. Received '${increment}'.`,
  );
}

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

const runGit = (args, options = {}) => {
  const result = spawnSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const command = `git ${args.join(' ')}`;
    throw new Error(result.stderr.trim() || `${command} failed with exit code ${result.status}`);
  }
  return result.stdout.trim();
};

const bumpVersion = (version, increment) => {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) throw new Error(`cubegin version must be plain semver. Received '${version}'.`);

  let [, major, minor, patch] = match.map(Number);
  if (increment === 'major') {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (increment === 'minor') {
    minor += 1;
    patch = 0;
  } else {
    patch += 1;
  }
  return `${major}.${minor}.${patch}`;
};

const discoverReleasePaths = () => {
  const paths = ['packages/core'];

  for (const entry of readdirSync(packagesRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === 'core') continue;
    const packageJsonPath = resolve(packagesRoot, entry.name, 'package.json');
    if (!existsSync(packageJsonPath)) continue;
    const packageJson = readJson(packageJsonPath);
    if (packageJson.cubegin?.publicSubpath) paths.push(`packages/${entry.name}`);
  }

  return paths.sort();
};

const findPreviousTag = () => {
  const tags = runGit(['tag', '--list', 'cubegin@*', '--sort=-v:refname']);
  return tags.split('\n').find(Boolean);
};

const readCommitEntries = (previousTag, releasePaths) => {
  const range = previousTag ? `${previousTag}..HEAD` : 'HEAD';
  const output = runGit(['log', '--format=%h%x09%s', range, '--', ...releasePaths]);
  if (!output) return [];

  return output
    .split('\n')
    .map((line) => {
      const [shortSha, ...subjectParts] = line.split('\t');
      return { shortSha, subject: subjectParts.join('\t').trim() };
    })
    .filter((entry) => entry.shortSha && entry.subject)
    .filter((entry) => !entry.subject.startsWith('chore(release): cubegin v'));
};

const today = () => new Date().toISOString().slice(0, 10);

const renderSection = (version, previousTag, releasePaths, entries) => {
  const lines = [`## ${version} - ${today()}`, ''];
  if (entries.length === 0) {
    lines.push('- Maintenance release.');
  } else {
    for (const entry of entries) {
      lines.push(`- ${entry.subject} (${entry.shortSha})`);
    }
  }

  lines.push('', '<details>', '<summary>Release scope</summary>', '');
  lines.push(`- Previous tag: ${previousTag ?? 'none'}`);
  for (const path of releasePaths) {
    lines.push(`- ${path}`);
  }
  lines.push('', '</details>', '');
  return `${lines.join('\n')}\n`;
};

const updateChangelog = (section) => {
  const existing = existsSync(changelogPath)
    ? readFileSync(changelogPath, 'utf8')
    : '# Changelog\n';
  const normalized = existing.trimEnd();
  if (!normalized.startsWith('# Changelog')) {
    return `# Changelog\n\n${section}${normalized}\n`;
  }

  const rest = normalized.replace(/^# Changelog\s*/, '');
  return `# Changelog\n\n${section}${rest.trimStart()}`.trimEnd() + '\n';
};

const packageJson = readJson(packageJsonPath);
const nextVersion = bumpVersion(packageJson.version, increment);
const releasePaths = discoverReleasePaths();
const previousTag = findPreviousTag();
const commitEntries = readCommitEntries(previousTag, releasePaths);
const changelogSection = renderSection(nextVersion, previousTag, releasePaths, commitEntries);

if (dryRun) {
  console.log(`cubegin ${packageJson.version} -> ${nextVersion}`);
  console.log(`Release paths: ${releasePaths.join(', ')}`);
  console.log('');
  console.log(changelogSection.trimEnd());
} else {
  packageJson.version = nextVersion;
  writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
  writeFileSync(changelogPath, updateChangelog(changelogSection));
  console.log(`Prepared cubegin ${nextVersion}`);
  console.log(`Updated ${relative(repoRoot, packageJsonPath)}`);
  console.log(`Updated ${relative(repoRoot, changelogPath)}`);
}
