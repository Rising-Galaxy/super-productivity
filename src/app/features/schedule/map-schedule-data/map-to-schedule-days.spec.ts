import { mapToScheduleDays } from './map-to-schedule-days';
import { TaskCopy, TaskPlanned } from '../../tasks/task.model';
import { TaskRepeatCfg } from '../../task-repeat-cfg/task-repeat-cfg.model';

const NDS = '1970-01-01';
const N = Date.UTC(1970, 0, 1, 0, 0, 0, 0);
// 86400000 ==> 24h
const H = 60 * 60 * 1000;
const TZ_OFFSET = new Date(NDS).getTimezoneOffset() * 60000;

const FAKE_TASK: Partial<TaskCopy> = {
  tagIds: [],
  subTaskIds: [],
  timeSpent: 0,
  timeEstimate: H,
};

const h = (hr: number): number => hr * 60 * 1000 * 60;
const hTz = (hr: number): number => h(hr) + TZ_OFFSET;
// eslint-disable-next-line @typescript-eslint/no-unused-vars,no-mixed-operators
const dh = (d: number = 0, hr: number): number => hr * H + d * H * 24;
const dhTz = (d: number = 0, hr: number): number => dh(d, hr) + TZ_OFFSET;

// eslint-disable-next-line no-mixed-operators
const minAfterNow = (min: number): Date => new Date(Date.UTC(1970, 0, 1, 0, min, 0, 0));

const minAfterNowTs = (min: number): number => minAfterNow(min).getTime();

const fakeTaskEntry = (id = 'XXX', add?: Partial<TaskCopy>): TaskCopy => {
  return {
    ...FAKE_TASK,
    ...add,
    id,
  } as TaskCopy;
};

const fakePlannedTaskEntry = (
  id = 'XXX',
  planedAt: Date,
  add?: Partial<TaskPlanned>,
): TaskPlanned => {
  return {
    ...fakeTaskEntry(id, add),
    plannedAt: planedAt.getTime(),
    reminderId: 'R_ID',
  } as TaskPlanned;
};

const fakeRepeatCfg = (
  id = 'R_CFG_1',
  startTime?: string,
  add?: Partial<TaskRepeatCfg>,
): TaskRepeatCfg => {
  return {
    startDate: '1969-01-01',
    startTime,
    // eslint-disable-next-line no-mixed-operators
    lastTaskCreation: N - 24 * 60 * 60 * 1000,
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: true,
    sunday: true,
    repeatCycle: 'DAILY',
    repeatEvery: 1,
    defaultEstimate: H,
    ...add,
    id,
  } as Partial<TaskRepeatCfg> as TaskRepeatCfg;
};

describe('mapToScheduleDays()', () => {
  it('should work for empty case', () => {
    expect(
      mapToScheduleDays(N, [], [], [], [], [], [], null, {}, undefined, undefined),
    ).toEqual([]);
  });

  it('should work for simple case', () => {
    expect(
      mapToScheduleDays(
        N,
        [NDS, '2020-1-2'],
        [
          fakeTaskEntry('1', { timeEstimate: H }),
          fakeTaskEntry('2', { timeEstimate: 2 * H }),
        ],
        [],
        [],
        [],
        [],
        null,
        {},
        undefined,
        undefined,
      ),
    ).toEqual([
      {
        beyondBudgetTasks: [],
        dayDate: NDS,
        entries: [
          {
            data: {
              ...FAKE_TASK,
              id: '1',
              timeEstimate: H,
              timeSpent: 0,
            },
            id: '1',
            start: 0,
            timeToGo: H,
            type: 'Task',
          },
          {
            data: {
              ...FAKE_TASK,
              id: '2',
              timeEstimate: 2 * H,
              timeSpent: 0,
            },
            id: '2',
            start: H,
            timeToGo: 2 * H,
            type: 'Task',
          },
        ],
        isToday: true,
      },
      { beyondBudgetTasks: [], dayDate: '2020-1-2', entries: [], isToday: false },
    ] as any);
  });

  it('should work for simple scheduled case', () => {
    const r = mapToScheduleDays(
      N,
      [NDS, '1970-01-02'],
      [
        fakeTaskEntry('N1', { timeEstimate: H }),
        // fakeTaskEntry('2', { timeEstimate: 2 * H }),
      ],
      [fakePlannedTaskEntry('S1', minAfterNow(30), { timeEstimate: H })],
      [],
      [],
      [],
      null,
      {},
      undefined,
      undefined,
    );
    expect(r[0].entries.length).toBe(3);
    expect(r).toEqual([
      {
        beyondBudgetTasks: [],
        dayDate: '1970-01-01',
        entries: [
          {
            data: {
              id: 'N1',
              subTaskIds: [],
              tagIds: [],
              timeEstimate: H,
              timeSpent: 0,
            },
            id: 'N1',
            start: 0,
            timeToGo: H * 0.5,
            type: 'SplitTask',
          },
          {
            data: {
              id: 'S1',
              plannedAt: minAfterNowTs(30),
              reminderId: 'R_ID',
              subTaskIds: [],
              tagIds: [],
              timeEstimate: H,
              timeSpent: 0,
            },
            id: 'S1',
            start: minAfterNowTs(30),
            timeToGo: H,
            type: 'ScheduledTask',
          },
          {
            data: { index: 0, projectId: undefined, taskId: 'N1', title: undefined },
            id: 'N1__0',
            start: minAfterNowTs(90),
            timeToGo: H * 0.5,
            type: 'SplitTaskContinuedLast',
          },
        ],
        isToday: true,
      },
      { beyondBudgetTasks: [], dayDate: '1970-01-02', entries: [], isToday: false },
    ] as any);
  });

  it('should split multiple times', () => {
    const r = mapToScheduleDays(
      N,
      [NDS, '1970-01-02'],
      [
        fakeTaskEntry('N1', { timeEstimate: 2 * H }),
        // fakeTaskEntry('2', { timeEstimate: 2 * H }),
      ],
      [
        fakePlannedTaskEntry('S1', minAfterNow(30), { timeEstimate: 0.5 * H }),
        fakePlannedTaskEntry('S2', minAfterNow(90), { timeEstimate: 0.5 * H }),
      ],
      [],
      [],
      [],
      null,
      {},
      undefined,
      undefined,
    );
    expect(r[0].entries.length).toBe(5);
    expect(r).toEqual([
      {
        beyondBudgetTasks: [],
        dayDate: '1970-01-01',
        entries: [
          {
            data: jasmine.any(Object),
            id: 'N1',
            start: 0,
            timeToGo: H * 0.5,
            type: 'SplitTask',
          },
          {
            data: jasmine.any(Object),
            id: 'S1',
            start: minAfterNowTs(30),
            timeToGo: 0.5 * H,
            type: 'ScheduledTask',
          },
          {
            data: jasmine.any(Object),
            id: 'N1__0',
            start: minAfterNowTs(60),
            timeToGo: 0.5 * H,
            type: 'SplitTaskContinued',
          },
          {
            data: jasmine.any(Object),
            id: 'S2',
            start: minAfterNowTs(90),
            timeToGo: 0.5 * H,
            type: 'ScheduledTask',
          },
          {
            data: jasmine.any(Object),
            id: 'N1__1',
            start: minAfterNowTs(120),
            timeToGo: H,
            type: 'SplitTaskContinuedLast',
          },
        ],
        isToday: true,
      },
      { beyondBudgetTasks: [], dayDate: '1970-01-02', entries: [], isToday: false },
    ] as any);
  });

  it('should show repeat for next day', () => {
    const r = mapToScheduleDays(
      N,
      [NDS, '1970-01-02'],
      [
        fakeTaskEntry('N1', { timeEstimate: 2 * H }),
        // fakeTaskEntry('2', { timeEstimate: 2 * H }),
      ],
      [],
      // [fakePlannedTaskEntry('S1', minAfterNow(30), { timeEstimate: H })],
      [fakeRepeatCfg('R1', '01:00', { defaultEstimate: H })],
      [],
      [],
      null,
      {},
      undefined,
      undefined,
    );

    expect(r).toEqual([
      {
        beyondBudgetTasks: [],
        dayDate: '1970-01-01',
        entries: [
          {
            data: jasmine.any(Object),
            id: 'N1',
            start: 0,
            timeToGo: H * 2,
            type: 'Task',
          },
        ],
        isToday: true,
      },
      {
        beyondBudgetTasks: [],
        dayDate: '1970-01-02',
        entries: [
          {
            data: jasmine.any(Object),
            id: 'R1',
            start: H * 24,
            timeToGo: H,
            type: 'ScheduledRepeatProjection',
          },
        ],
        isToday: false,
      },
    ] as any);
  });

  it('should spit around scheduled repeat task cases', () => {
    const r = mapToScheduleDays(
      N,
      [NDS, '1970-01-02'],
      [
        // NOTE: takes us to the next day, since without dayStart and dayEnd it otherwise won't
        fakeTaskEntry('N1', { timeEstimate: 24 * H }),
        fakeTaskEntry('N2', { timeEstimate: 2 * H }),
        // fakeTaskEntry('2', { timeEstimate: 2 * H }),
      ],
      [],
      // [fakePlannedTaskEntry('S1', minAfterNow(30), { timeEstimate: H })],
      [fakeRepeatCfg('R1', '01:00', { defaultEstimate: H })],
      [],
      [],
      null,
      {},
      undefined,
      undefined,
    );

    expect(r).toEqual([
      {
        beyondBudgetTasks: [],
        dayDate: '1970-01-01',
        entries: [
          {
            data: jasmine.any(Object),
            id: 'N1',
            start: 0,
            // eslint-disable-next-line no-mixed-operators
            timeToGo: 24 * H,
            type: 'Task',
          },
        ],
        isToday: true,
      },
      {
        beyondBudgetTasks: [],
        dayDate: '1970-01-02',
        entries: [
          {
            data: jasmine.any(Object),
            id: 'N2',
            // eslint-disable-next-line no-mixed-operators
            start: 24 * H + TZ_OFFSET,
            timeToGo: H,
            type: 'SplitTask',
          },
          {
            data: jasmine.any(Object),
            id: 'R1',
            // eslint-disable-next-line no-mixed-operators
            start: 25 * H + TZ_OFFSET,
            timeToGo: H,
            type: 'ScheduledRepeatProjection',
          },
          {
            data: jasmine.any(Object),
            id: 'N2__0',
            // eslint-disable-next-line no-mixed-operators
            start: 26 * H + TZ_OFFSET,
            timeToGo: H,
            type: 'SplitTaskContinuedLast',
          },
        ],
        isToday: false,
      },
    ] as any);
  });

  it('should work for NON-scheduled repeat task cases', () => {
    const r = mapToScheduleDays(
      N,
      [NDS, '1970-01-02'],
      [
        // NOTE: takes us to the next day, since without dayStart and dayEnd it otherwise won't
        fakeTaskEntry('N1', { timeEstimate: 24 * H }),
        fakeTaskEntry('N2', { timeEstimate: H }),
      ],
      [],
      [],
      [
        fakeRepeatCfg('R1', undefined, {
          defaultEstimate: 2 * H,
          lastTaskCreation: N + 60000,
        }),
      ],
      [],
      null,
      {},
      undefined,
      undefined,
    );

    expect(r).toEqual([
      {
        beyondBudgetTasks: [],
        dayDate: '1970-01-01',
        entries: [
          {
            data: jasmine.any(Object),
            id: 'N1',
            start: 0,
            // eslint-disable-next-line no-mixed-operators
            timeToGo: 24 * H,
            type: 'Task',
          },
        ],
        isToday: true,
      },
      {
        beyondBudgetTasks: [],
        dayDate: '1970-01-02',
        entries: [
          {
            data: jasmine.any(Object),
            id: 'R1',
            // eslint-disable-next-line no-mixed-operators
            start: 24 * H + TZ_OFFSET,
            timeToGo: 2 * H,
            type: 'RepeatProjection',
          },
          {
            data: jasmine.any(Object),
            id: 'N2',
            // eslint-disable-next-line no-mixed-operators
            start: 26 * H + TZ_OFFSET,
            timeToGo: H,
            type: 'Task',
          },
        ],
        isToday: false,
      },
    ] as any);
  });

  it('should sort in planned tasks to their days', () => {
    const r = mapToScheduleDays(
      N,
      [NDS, '1970-01-02', '1970-01-03', '1970-01-04'],
      [
        // NOTE: takes us to the next day, since without dayStart and dayEnd it otherwise won't
        fakeTaskEntry('N1', { timeEstimate: 2 * H }),
      ],
      [],
      [],
      [],
      [],
      null,
      {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        '1970-01-02': [
          fakeTaskEntry('FD1', { timeEstimate: H }),
          fakeTaskEntry('FD2', { timeEstimate: 2 * H }),
        ],
        // eslint-disable-next-line @typescript-eslint/naming-convention
        '1970-01-04': [
          fakeTaskEntry('FD3', { timeEstimate: H }),
          fakeTaskEntry('FD4', { timeEstimate: 0.5 * H }),
        ],
      },
      undefined,
      undefined,
    );

    expect(r).toEqual([
      {
        beyondBudgetTasks: [],
        dayDate: '1970-01-01',
        entries: [
          {
            data: jasmine.any(Object),
            id: 'N1',
            start: 0,
            timeToGo: 2 * H,
            type: 'Task',
          },
        ],
        isToday: true,
      },
      {
        beyondBudgetTasks: [],
        dayDate: '1970-01-02',
        entries: [
          {
            data: jasmine.any(Object),
            id: 'FD1',
            start: 82800000,
            timeToGo: H,
            type: 'TaskPlannedForDay',
          },
          {
            data: jasmine.any(Object),
            id: 'FD2',
            start: 86400000,
            timeToGo: 2 * H,
            type: 'TaskPlannedForDay',
          },
        ],
        isToday: false,
      },
      { beyondBudgetTasks: [], dayDate: '1970-01-03', entries: [], isToday: false },
      {
        beyondBudgetTasks: [],
        dayDate: '1970-01-04',
        entries: [
          {
            data: jasmine.any(Object),
            id: 'FD3',
            start: 255600000,
            timeToGo: H,
            type: 'TaskPlannedForDay',
          },
          {
            data: jasmine.any(Object),
            id: 'FD4',
            start: 259200000,
            timeToGo: 0.5 * H,
            type: 'TaskPlannedForDay',
          },
        ],
        isToday: false,
      },
    ] as any);
  });

  fit('UNTESTED SO CHECK IF FAILING  should work for an example with all the stuff', () => {
    const r = mapToScheduleDays(
      N,
      [NDS, '1970-01-02', '1970-01-03', '1970-01-04'],
      [
        // NOTE: takes us to the next day, since without dayStart and dayEnd it otherwise won't
        fakeTaskEntry('N1', { timeEstimate: 2 * H }),
      ],
      [
        // BEFORE WORK
        fakePlannedTaskEntry('S1', minAfterNow(2 * 60), { timeEstimate: H }),
        // NEXT DAY AT 10
        fakePlannedTaskEntry('S2', minAfterNow(34 * 60), { timeEstimate: 0.5 * H }),
      ],
      [fakeRepeatCfg('R1', '01:00', { defaultEstimate: H })],
      [
        fakeRepeatCfg('R1', undefined, {
          defaultEstimate: 2 * H,
          lastTaskCreation: N + 60000,
        }),
      ],
      [],
      null,
      {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        '1970-01-02': [
          fakeTaskEntry('FD1', { timeEstimate: 4 * H }),
          fakeTaskEntry('FD2', { timeEstimate: 2 * H }),
        ],
        // eslint-disable-next-line @typescript-eslint/naming-convention
        '1970-01-04': [
          fakeTaskEntry('FD3', { timeEstimate: H }),
          fakeTaskEntry('FD4', { timeEstimate: 0.5 * H }),
        ],
      },
      {
        startTime: '9:00',
        endTime: '17:00',
      },
      {
        startTime: '12:00',
        endTime: '13:00',
      },
    );

    expect(r[0]).toEqual({
      beyondBudgetTasks: [],
      dayDate: '1970-01-01',
      entries: [
        {
          data: jasmine.any(Object),
          id: 'S1',
          start: h(2),
          timeToGo: h(1),
          type: 'ScheduledTask',
        },
        {
          data: jasmine.any(Object),
          id: 'N1',
          start: hTz(9),
          timeToGo: h(2),
          type: 'Task',
        },
        {
          data: jasmine.any(Object),
          id: 'LUNCH_BREAK_39600000',
          start: hTz(12),
          timeToGo: h(1),
          type: 'LunchBreak',
        },
      ],
      isToday: true,
    } as any);

    expect(r[1]).toEqual({
      beyondBudgetTasks: [],
      dayDate: '1970-01-02',
      entries: [
        {
          data: jasmine.any(Object),
          id: 'R1',
          start: dhTz(1, 9),
          timeToGo: h(2),
          type: 'RepeatProjection',
        },
        {
          data: jasmine.any(Object),
          id: 'S2',
          start: dhTz(1, 11),
          timeToGo: h(0.5),
          type: 'ScheduledTask',
        },
        {
          data: jasmine.any(Object),
          id: 'FD1',
          start: dhTz(1, 11.5),
          timeToGo: h(0.5),
          type: 'SplitTaskPlannedForDay',
        },
        {
          data: jasmine.any(Object),
          id: 'LUNCH_BREAK_126000000',
          start: dhTz(1, 12),
          timeToGo: h(1),
          type: 'LunchBreak',
        },
        {
          data: jasmine.any(Object),
          id: 'FD1__0',
          start: dhTz(1, 13),
          timeToGo: h(3.5),
          type: 'SplitTaskContinuedLast',
        },
        {
          // TODO this needs fixing
          data: jasmine.any(Object),
          id: 'FD2',
          start: dhTz(1, 16.5),
          timeToGo: h(0.5),
          type: 'SplitTaskPlannedForDay',
        },
      ],
      isToday: false,
    } as any);

    expect(r[2]).toEqual({
      beyondBudgetTasks: [],
      dayDate: '1970-01-03',
      entries: [
        {
          data: jasmine.any(Object),
          id: 'FD2__0',
          start: 201600000,
          timeToGo: 5400000,
          type: 'SplitTaskContinuedLast',
        },
        {
          data: jasmine.any(Object),
          id: 'R1',
          start: 207000000,
          timeToGo: h(2),
          type: 'RepeatProjectionSplit',
        },
        {
          data: jasmine.any(Object),
          id: 'LUNCH_BREAK_212400000',
          start: 212400000,
          timeToGo: 3600000,
          type: 'LunchBreak',
        },
        {
          data: jasmine.any(Object),
          id: 'R1__0',
          start: 216000000,
          timeToGo: 1800000,
          type: 'RepeatProjectionSplitContinuedLast',
        },
      ],
      isToday: false,
    } as any);
    expect(r[3]).toEqual({
      beyondBudgetTasks: [],
      dayDate: '1970-01-04',
      entries: [
        {
          data: jasmine.any(Object),
          id: 'R1',
          start: 288000000,
          timeToGo: h(2),
          type: 'RepeatProjection',
        },
        {
          data: jasmine.any(Object),
          id: 'FD3',
          start: 295200000,
          timeToGo: 3600000,
          type: 'TaskPlannedForDay',
        },
        {
          data: jasmine.any(Object),
          id: 'LUNCH_BREAK_298800000',
          start: 298800000,
          timeToGo: 3600000,
          type: 'LunchBreak',
        },
        {
          data: jasmine.any(Object),
          id: 'FD4',
          start: 302400000,
          timeToGo: 1800000,
          type: 'TaskPlannedForDay',
        },
      ],
      isToday: false,
    } as any);
  });
});
