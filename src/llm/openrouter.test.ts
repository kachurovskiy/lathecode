import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LatheCode } from '../common/lathecode';
import { createLatheCodeFromPrompt } from './openrouter';

describe('OpenRouter lathecode generation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
    localStorage.setItem('openRouterApiKey', 'sk-or-test');
  });

  it('normalizes common LLM spacing mistakes before validation', async () => {
    vi.stubGlobal('fetch', mockOpenRouterResponses([
      `; Butt plug lathe part
UNITS MM
STOCK R20
TOOL RECT R0.2 L2
DEPTH CUT 1 FINISH 0.2
FEED MOVE 100 PASS 50 PART 30
MODE TURN
AXES LEFT DOWN
L5 R5
L10 RS5 RE10 CONC
L15 R10
L10 RS10 RE5 CONV
L5 R5
L2`,
    ]));

    const latheCodeText = await createLatheCodeFromPrompt('rounded plug');

    expect(latheCodeText).toContain('DEPTH CUT1 FINISH0.2');
    expect(latheCodeText).toContain('FEED MOVE100 PASS50 PART30');
    expect(new LatheCode(latheCodeText).getProfiles().length).toBe(1);
  });

  it('tells the model that profile pieces run right-to-left toward the chuck', async () => {
    const fetchMock = mockOpenRouterResponses([
      'STOCK D10\nL2 R3',
    ]);
    vi.stubGlobal('fetch', fetchMock);

    await createLatheCodeFromPrompt('simple cylinder');

    const request = getOpenRouterRequest(fetchMock);
    expect(request.messages[0].content).toContain('assembled right-to-left');
    expect(request.messages[0].content).toContain('start at the right/free/end of the part');
    expect(request.messages[0].content).toContain('proceed left toward the chuck side');
  });

  it('requires provider routing that does not retain user inputs', async () => {
    const fetchMock = mockOpenRouterResponses([
      'STOCK D10\nL2 R3',
    ]);
    vi.stubGlobal('fetch', fetchMock);

    await createLatheCodeFromPrompt('simple cylinder');

    const request = getOpenRouterRequest(fetchMock);
    expect(request.provider).toEqual({
      data_collection: 'deny',
      zdr: true,
    });
  });

  it('normalizes commented setup directives and lone DS diameter lines', async () => {
    vi.stubGlobal('fetch', mockOpenRouterResponses([
      `;UNITS MM
;STOCK D64
;TOOL RECT R0.4 L2
;DEPTH CUT2 FINISH0.2
;FEED MOVE200 PASS0.5 PART0.1
;MODE TURN
;AXES RIGHT UP
;ASSUMPTION: PART ORIENTED WITH THREADED END AT RIGHT
;EXTERNAL PROFILE
L2 DS24
L23 DS31
L17 DS31
L8 DS62
L24 DS56
INSIDE
L16 DS35
L8 DS44
L0 DS48`,
    ]));

    const latheCodeText = await createLatheCodeFromPrompt('profile from drawing');

    expect(latheCodeText).toContain('UNITS MM');
    expect(latheCodeText).toContain('STOCK D64');
    expect(latheCodeText).toContain(';EXTERNAL PROFILE');
    expect(latheCodeText).toContain('L2 D24');
    expect(latheCodeText).toContain('L16 D35');
    expect(new LatheCode(latheCodeText).getProfiles().length).toBe(2);
  });

  it('adds line context and syntax hints when invalid lathecode remains invalid', async () => {
    vi.stubGlobal('fetch', mockOpenRouterResponses([
      'STOCK D10\nDEPTH CUTX\nL2 R3',
      'STOCK D10\nDEPTH CUTX\nL2 R3',
      'STOCK D10\nDEPTH CUTX\nL2 R3',
    ]));

    await expect(createLatheCodeFromPrompt('invalid')).rejects.toThrow(/Line 2: DEPTH CUTX/);
  });
});

function mockOpenRouterResponses(contents: string[]) {
  let index = 0;
  return vi.fn().mockImplementation(async () => {
    const content = contents[Math.min(index, contents.length - 1)];
    index++;
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        choices: [{message: {content}}],
      }),
    };
  });
}

function getOpenRouterRequest(fetchMock: ReturnType<typeof mockOpenRouterResponses>) {
  const body = fetchMock.mock.calls[0]?.[1]?.body;
  if (typeof body !== 'string') throw new Error('OpenRouter request body not found');
  return JSON.parse(body) as {
    messages: {content: string}[],
    provider?: {
      data_collection?: string,
      zdr?: boolean,
    },
  };
}
