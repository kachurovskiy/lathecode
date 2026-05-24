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

  it('normalizes chamfer and fillet spacing mistakes before validation', async () => {
    vi.stubGlobal('fetch', mockOpenRouterResponses([
      `STOCK D12
L2 DS6 FI 0.25 DE6 CH 0.25
L2 D10 CH 0.5`,
    ]));

    const latheCodeText = await createLatheCodeFromPrompt('small stepped part with softened edges');

    expect(latheCodeText).toContain('L2 DS6 FI0.25 DE6 CH0.25');
    expect(latheCodeText).toContain('L2 D10 CH0.5');
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

  it('does not ask the model to produce AXES directives', async () => {
    const fetchMock = mockOpenRouterResponses([
      'STOCK D10\nL2 R3',
    ]);
    vi.stubGlobal('fetch', fetchMock);

    await createLatheCodeFromPrompt('simple cylinder');

    const request = getOpenRouterRequest(fetchMock);
    expect(request.messages[0].content).not.toContain('AXES LEFT|RIGHT');
    expect(request.messages[0].content).toContain('Do not add AXES directives');
  });

  it('tells the model how to use chamfers and fillets', async () => {
    const fetchMock = mockOpenRouterResponses([
      'STOCK D10\nL2 R3',
    ]);
    vi.stubGlobal('fetch', fetchMock);

    await createLatheCodeFromPrompt('simple cylinder');

    const request = getOpenRouterRequest(fetchMock);
    expect(request.messages[0].content).toContain('CH<size>');
    expect(request.messages[0].content).toContain('FI<size>');
    expect(request.messages[0].content).toContain('L20 DS10 FI0.5 DE10 CH1');
    expect(request.messages[0].content).toContain("measured along the segment's horizontal L distance");
    expect(request.messages[0].content).toContain('Do not use CH or FI on CONV/CONC lines');
  });

  it('includes chamfer and fillet syntax in repair prompts', async () => {
    const fetchMock = mockOpenRouterResponses([
      'STOCK D10\nL2 D10 CHX',
      'STOCK D10\nL2 D10 CHX',
      'STOCK D10\nL2 D10 CHX',
    ]);
    vi.stubGlobal('fetch', fetchMock);

    await expect(createLatheCodeFromPrompt('invalid chamfer')).rejects.toThrow(/CHX/);

    const repairRequest = JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string) as {
      messages: {content: string}[],
    };
    const repairPrompt = repairRequest.messages.at(-1)?.content ?? '';
    expect(repairPrompt).toContain('Use CH0.5 and FI0.5');
    expect(repairPrompt).toContain('not CH 0.5 or FI 0.5');
    expect(repairPrompt).toContain('not on CONV or CONC lines');
  });

  it('formats invalid generated lathecode errors as multiline fields', async () => {
    vi.stubGlobal('fetch', mockOpenRouterResponses([
      'STOCK D10\nAXES RIGHT\nL2 R3',
      'STOCK D10\nAXES RIGHT\nL2 R3',
      'STOCK D10\nAXES RIGHT\nL2 R3',
    ]));

    await expect(createLatheCodeFromPrompt('invalid axes')).rejects.toThrow(
      /OpenRouter returned invalid lathecode\.\n\nError:\nExpected "UP" or "DOWN".*\nLine 2: AXES RIGHT\n\nReturned lathecode:\nSTOCK D10\nAXES RIGHT\nL2 R3/s,
    );
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
