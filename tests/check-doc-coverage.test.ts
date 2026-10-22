import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { collectExports, checkDocCoverage, isDocumented } = require('../scripts/check-doc-coverage') as {
  collectExports: (file: string) => Set<string>;
  checkDocCoverage: (options?: {
    entryPoint?: string;
    apiDoc?: string;
    baselinePath?: string;
  }) => { undocumented: string[]; failures: string[]; stale: string[] };
  isDocumented: (symbol: string, docContent: string) => boolean;
};

describe('check-doc-coverage script', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'doc-coverage-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  function write(relativePath: string, contents: string): string {
    const full = path.join(dir, relativePath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, contents);
    return full;
  }

  describe('collectExports', () => {
    it('follows export * and named re-exports, including aliases and type-only names', () => {
      write('a.ts', 'export class Alpha {}\nexport function beta() {}\n');
      write(
        'b/index.ts',
        "export { gamma as Gamma, type Delta } from './c';\nexport const enum Epsilon { A }\n",
      );
      const entry = write(
        'entry.ts',
        "export * from './a';\nexport * from './b';\nexport * as ns from './a';\n",
      );

      expect([...collectExports(entry)].sort()).toEqual(
        ['Alpha', 'Delta', 'Epsilon', 'Gamma', 'beta', 'ns'].sort(),
      );
    });

    it('ignores exports that are commented out', () => {
      const file = write(
        'c.ts',
        '// export class Hidden {}\n/* export const Ghost = 1; */\nexport class Real {}\n',
      );

      expect([...collectExports(file)]).toEqual(['Real']);
    });

    it('does not count default exports as public symbols', () => {
      const file = write('d.ts', 'export default class Fallback {}\nexport class Named {}\n');

      expect([...collectExports(file)]).toEqual(['Named']);
    });
  });

  describe('isDocumented', () => {
    it('matches whole identifiers only, case-sensitively', () => {
      expect(isDocumented('Escrow', 'Use the Escrow helper.')).toBe(true);
      expect(isDocumented('Escrow', 'EscrowClient only')).toBe(false);
      expect(isDocumented('Escrow', 'escrow lowercase only')).toBe(false);
    });
  });

  describe('checkDocCoverage', () => {
    const CORE_DOC = 'TrustFlowClient MultiSigEscrowClient\n';

    it('passes when every export is documented', () => {
      const entryPoint = write('index.ts', "export * from './a';\n");
      write('a.ts', 'export class Alpha {}\n');
      const apiDoc = write('API.md', `${CORE_DOC}## Alpha\n`);

      const result = checkDocCoverage({
        entryPoint,
        apiDoc,
        baselinePath: path.join(dir, 'missing.json'),
      });

      expect(result.failures).toEqual([]);
    });

    it('fails when a documented export is removed from the docs', () => {
      const entryPoint = write('index.ts', "export * from './a';\n");
      write('a.ts', 'export class Alpha {}\n');
      const apiDoc = write('API.md', `${CORE_DOC}Nothing about it here.\n`);

      const result = checkDocCoverage({
        entryPoint,
        apiDoc,
        baselinePath: path.join(dir, 'missing.json'),
      });

      expect(result.failures).toEqual(['Alpha']);
    });

    it('fails when a core target is missing from the docs, regardless of the baseline', () => {
      const entryPoint = write('index.ts', 'export class Alpha {}\n');
      const apiDoc = write('API.md', '## Alpha\n');
      const baselinePath = write(
        'baseline.json',
        JSON.stringify({ undocumented: ['TrustFlowClient', 'MultiSigEscrowClient'] }),
      );

      const result = checkDocCoverage({ entryPoint, apiDoc, baselinePath });

      expect(result.failures).toEqual(['MultiSigEscrowClient', 'TrustFlowClient']);
    });

    it('tolerates symbols listed in the baseline but still reports new gaps', () => {
      const entryPoint = write('index.ts', "export * from './a';\n");
      write('a.ts', 'export class Alpha {}\nexport class Beta {}\n');
      const apiDoc = write('API.md', `${CORE_DOC}## Beta\n`);
      const baselinePath = write('baseline.json', JSON.stringify({ undocumented: ['Alpha'] }));

      const result = checkDocCoverage({ entryPoint, apiDoc, baselinePath });

      expect(result.failures).toEqual([]);
      expect(result.undocumented).toEqual(['Alpha']);
    });

    it('reports baseline entries that are now documented or no longer exported as stale', () => {
      const entryPoint = write('index.ts', "export * from './a';\n");
      write('a.ts', 'export class Alpha {}\n');
      const apiDoc = write('API.md', `${CORE_DOC}## Alpha\n`);
      const baselinePath = write(
        'baseline.json',
        JSON.stringify({ undocumented: ['Alpha', 'Removed'] }),
      );

      const result = checkDocCoverage({ entryPoint, apiDoc, baselinePath });

      expect(result.failures).toEqual([]);
      expect(result.stale).toEqual(['Alpha', 'Removed']);
    });
  });

  it('reports no undocumented exports beyond the checked-in baseline for this repo', () => {
    const result = checkDocCoverage();

    expect(result.failures).toEqual([]);
  });
});
