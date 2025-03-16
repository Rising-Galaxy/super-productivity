import {
  pfExtractSyncFileStateFromPrefix,
  pfGetSyncFilePrefix,
  PfSyncFilePrefixParams,
  PfSyncFilePrefixParamsOutput,
} from './pf-sync-file-prefix';

describe('pfGetSyncFilePrefix()', () => {
  const cases: [PfSyncFilePrefixParams, string][] = [
    [{ isCompressed: false, isEncrypted: false, modelVersion: 1 }, 'pf_1__'],
    [{ isCompressed: true, isEncrypted: false, modelVersion: 1 }, 'pf_C1__'],
    [{ isCompressed: false, isEncrypted: true, modelVersion: 1 }, 'pf_E1__'],
    [{ isCompressed: true, isEncrypted: true, modelVersion: 1 }, 'pf_CE1__'],
    [{ isCompressed: true, isEncrypted: true, modelVersion: 33 }, 'pf_CE33__'],
    [
      { isCompressed: true, isEncrypted: true, modelVersion: 33.1232343 },
      'pf_CE33.1232343__',
    ],
  ];
  cases.forEach(([input, expected]) => {
    it(`should return '${expected}' for ${JSON.stringify(input)}`, () => {
      expect(pfGetSyncFilePrefix(input)).toBe(expected);
    });
  });
});

describe('pfExtractSyncFileStateFromPrefix()', () => {
  const B_ALL = {
    isCompressed: true,
    isEncrypted: true,
    modelVersion: 2,
  };
  const cases: [string, PfSyncFilePrefixParamsOutput][] = [
    [
      'pf_1__testdata',
      {
        isCompressed: false,
        isEncrypted: false,
        modelVersion: 1,
        cleanDataStr: 'testdata',
      },
    ],
    [
      'pf_1.12345__testdata',
      {
        isCompressed: false,
        isEncrypted: false,
        modelVersion: 1.12345,
        cleanDataStr: 'testdata',
      },
    ],
    [
      'pf_C1__testdata',
      {
        isCompressed: true,
        isEncrypted: false,
        modelVersion: 1,
        cleanDataStr: 'testdata',
      },
    ],
    [
      'pf_E1__testdata',
      {
        isCompressed: false,
        isEncrypted: true,
        modelVersion: 1,
        cleanDataStr: 'testdata',
      },
    ],
    [
      'pf_CE33.123__testdata',
      {
        ...B_ALL,
        modelVersion: 33.123,
        cleanDataStr: 'testdata',
      },
    ],
    [
      'pf_CE2____testdata',
      {
        ...B_ALL,
        cleanDataStr: '__testdata',
      },
    ],
    [
      'pf_CE2__C__testdata',
      {
        ...B_ALL,
        cleanDataStr: 'C__testdata',
      },
    ],
    [
      'pf_CE2__{}',
      {
        ...B_ALL,
        cleanDataStr: '{}',
      },
    ],
    [
      'pf_CE2__pf_CE2__pf_CE2__',
      {
        ...B_ALL,
        cleanDataStr: 'pf_CE2__pf_CE2__',
      },
    ],
  ];

  cases.forEach(([input, expected]) => {
    it(`should extract correct params from '${input}'`, () => {
      expect(pfExtractSyncFileStateFromPrefix(input)).toEqual(expected);
    });
  });

  it('should throw error for invalid prefix', () => {
    expect(() => pfExtractSyncFileStateFromPrefix('invalid_prefix')).toThrowError(
      'pfExtractSyncFileStateFromPrefix: Invalid prefix',
    );
  });
});
