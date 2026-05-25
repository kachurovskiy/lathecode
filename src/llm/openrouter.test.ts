import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LatheCode } from '../common/lathecode';
import { createLatheCodeFromPrompt, modifyLatheCodeWithPrompt } from './openrouter';

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
    expect(request.messages[0].content).toContain('radial shoulder or an angled corner');
    expect(request.messages[0].content).toContain('Do not use CH or FI on CONV/CONC lines');
  });

  it('tells the model how to use B-spline profile lines', async () => {
    const fetchMock = mockOpenRouterResponses([
      'STOCK D32\nL24 DS10 DE22 BSPLINE D14 D26 D18 D28',
    ]);
    vi.stubGlobal('fetch', fetchMock);

    const latheCodeText = await createLatheCodeFromPrompt('smooth organic profile');
    const request = getOpenRouterRequest(fetchMock);

    expect(request.messages[0].content).toContain('BSPLINE');
    expect(request.messages[0].content).toContain('L24 DS10 DE22 BSPLINE D14 D26 D18 D28');
    expect(request.messages[0].content).toContain('Do not use CH or FI on BSPLINE lines');
    expect(new LatheCode(latheCodeText).getProfiles().length).toBe(1);
  });

  it('accepts generated centerline-to-centerline B-spline profiles', async () => {
    const fetchMock = mockOpenRouterResponses([
      `; Lemon shape
UNITS MM
STOCK D55
TOOL ROUND R3
DEPTH CUT2 FINISH0.5
FEED MOVE100 PASS80 PART50

L80 DS0 DE0 BSPLINE D50 D50 D50 D50 D50 D50 D50 D50 D50 D50 D50 D50 D50 D50 D50 D50 D50 D50 D50 D50`,
    ]);
    vi.stubGlobal('fetch', fetchMock);

    const latheCodeText = await createLatheCodeFromPrompt('lemon shape');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(latheCodeText).toContain('L80 DS0 DE0 BSPLINE D50');
    expect(new LatheCode(latheCodeText).getProfiles().length).toBe(1);
  });

  it('tells the model how to make closed-bottom hollow parts', async () => {
    const fetchMock = mockOpenRouterResponses([
      'STOCK D60\nL10 D60\nINSIDE\nL8 D50',
    ]);
    vi.stubGlobal('fetch', fetchMock);

    await createLatheCodeFromPrompt('closed bottom glass');

    const request = getOpenRouterRequest(fetchMock);
    expect(request.messages[0].content).toContain('closed-bottom hollow parts');
    expect(request.messages[0].content).toContain('stop the INSIDE profile at the cavity depth');
    expect(request.messages[0].content).toContain('A shorter inside profile is inferred as a closed bottom');
    expect(request.messages[0].content).toContain('solid stock closes to D0');
    expect(request.messages[0].content).toContain('Do not continue the bore through the bottom');
  });

  it('includes chamfer and fillet syntax in repair prompts', async () => {
    const fetchMock = mockOpenRouterResponses([
      'STOCK D10\nL2 D10 BAD',
      'STOCK D10\nL2 D10 BAD',
      'STOCK D10\nL2 D10 BAD',
    ]);
    vi.stubGlobal('fetch', fetchMock);

    await expect(createLatheCodeFromPrompt('invalid profile')).rejects.toThrow(/BAD/);

    const repairRequest = JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string) as {
      messages: {content: string}[],
    };
    const repairPrompt = repairRequest.messages.at(-1)?.content ?? '';
    expect(repairPrompt).toContain('Use CH0.5 and FI0.5');
    expect(repairPrompt).toContain('not CH 0.5 or FI 0.5');
    expect(repairPrompt).toContain('not on CONV, CONC, or BSPLINE lines');
    expect(repairPrompt).toContain('real radial shoulders or angled corners');
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

  it('reports reasoning-only length responses as missing lathecode content', async () => {
    const fetchMock = mockOpenRouterResponses([
      {
        content: null,
        finish_reason: 'length',
        reasoning: 'I will think for too long before writing the lathecode.',
      },
    ]);
    vi.stubGlobal('fetch', fetchMock);

    await expect(createLatheCodeFromPrompt('simple cylinder')).rejects.toThrow(
      /OpenRouter returned no lathecode content.*Finish reason: length.*reasoning text.*completion token limit.*Model response excerpt:\nI will think for too long/s,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('includes reasoning detail text when a provider returns no final content', async () => {
    const fetchMock = mockOpenRouterResponses([
      {
        content: null,
        finish_reason: 'length',
        reasoning_details: [
          {
            type: 'reasoning.text',
            text: 'The model spent the whole response explaining a cup bottom instead of returning lathecode.',
          },
        ],
      },
    ]);
    vi.stubGlobal('fetch', fetchMock);

    await expect(createLatheCodeFromPrompt('add a cup bottom')).rejects.toThrow(
      /Model response excerpt:\nThe model spent the whole response explaining a cup bottom/,
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

  it('keeps imported STL setup scaffold comments from becoming duplicate setup directives', async () => {
    const fetchMock = mockOpenRouterResponses([
      `; Rooks.stl

; Uncomment and modify lines below as needed
; STOCK D5
; TOOL RECT R0.2 L2
; DEPTH CUT1 FINISH0.1
; FEED MOVE200 PASS50 PART10 ; speeds mm/min
; MODE TURN ; for classic style of material removal
; AXES RIGHT DOWN ; for non-NanoEls controllers

STOCK D41.520
TOOL RECT R0.2 L2
L7.000 R19.990
L1.000 RS19.990 RE19.250`,
    ]);
    vi.stubGlobal('fetch', fetchMock);

    const latheCodeText = await createLatheCodeFromPrompt('rook from STL');
    const latheCode = new LatheCode(latheCodeText);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(latheCodeText).toContain('; STOCK D5');
    expect(latheCodeText).toMatch(/^STOCK D41\.520$/m);
    expect(latheCodeText).not.toMatch(/^STOCK D5$/m);
    expect(latheCode.getStock()?.diameter).toBeCloseTo(41.52);
    expect(latheCode.getProfiles().length).toBe(1);
  });

  it('comments active imported STL setup scaffold directives before validation', async () => {
    const fetchMock = mockOpenRouterResponses([
      `; Rooks.stl

; Uncomment and modify lines below as needed
STOCK D5
TOOL RECT R0.2 L2
DEPTH CUT1 FINISH0.1
FEED MOVE200 PASS50 PART10 ; speeds mm/min
MODE TURN ; for classic style of material removal
AXES RIGHT DOWN ; for non-NanoEls controllers

STOCK D41.520
TOOL RECT R0.2 L2
L7.000 R19.990
L1.000 RS19.990 RE19.250`,
    ]);
    vi.stubGlobal('fetch', fetchMock);

    const latheCodeText = await createLatheCodeFromPrompt('rook from STL');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(latheCodeText).toMatch(/^STOCK D41\.520$/m);
    expect(latheCodeText).not.toMatch(/^STOCK D5$/m);
    expect(new LatheCode(latheCodeText).getProfiles().length).toBe(1);
  });

  it('collapses repeated setup blocks before asking OpenRouter to repair them', async () => {
    const fetchMock = mockOpenRouterResponses([
      `; Rooks.stl
STOCK D5
TOOL RECT R0.2 L2
DEPTH CUT1 FINISH0.1

STOCK D41.520
TOOL RECT R0.2 L2
L7.000 R19.990
L1.000 RS19.990 RE19.250`,
    ]);
    vi.stubGlobal('fetch', fetchMock);

    const latheCodeText = await createLatheCodeFromPrompt('rook from STL');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(latheCodeText).toMatch(/^STOCK D41\.520$/m);
    expect(latheCodeText).toMatch(/^DEPTH CUT1 FINISH0\.1$/m);
    expect(latheCodeText).not.toMatch(/^STOCK D5$/m);
    expect(new LatheCode(latheCodeText).getProfiles().length).toBe(1);
  });

  it('omits leading commented lathecode from modification prompts and reattaches it locally', async () => {
    const fetchMock = mockOpenRouterResponses([
      `STOCK D41.520
TOOL RECT R0.2 L2
L5.000 R19.990`,
    ]);
    vi.stubGlobal('fetch', fetchMock);

    const currentLatheCode = `; Rooks.stl

; Uncomment and modify lines below as needed
; STOCK D5
; TOOL RECT R0.2 L2
; DEPTH CUT1 FINISH0.1
; FEED MOVE200 PASS50 PART10 ; speeds mm/min
; MODE TURN ; for classic style of material removal
; AXES RIGHT DOWN ; for non-NanoEls controllers

STOCK D41.520
TOOL RECT R0.2 L2
L7.000 R19.990`;

    const latheCodeText = await modifyLatheCodeWithPrompt(currentLatheCode, 'make it shorter');
    const request = getOpenRouterRequest(fetchMock);
    const prompt = request.messages[1].content;

    expect(prompt).not.toContain('; Rooks.stl');
    expect(prompt).not.toContain('Uncomment and modify lines below as needed');
    expect(prompt).not.toContain('; STOCK D5');
    expect(prompt).toContain('STOCK D41.520');
    expect(prompt).toContain('L7.000 R19.990');
    expect(latheCodeText).toMatch(/^; Rooks\.stl\n\n; Uncomment and modify lines below as needed/);
    expect(latheCodeText).toContain('\n\nSTOCK D41.520\nTOOL RECT R0.2 L2\nL5.000 R19.990');
    expect(new LatheCode(latheCodeText).getProfiles().length).toBe(1);
  });

  it('adds line context and syntax hints when invalid lathecode remains invalid', async () => {
    vi.stubGlobal('fetch', mockOpenRouterResponses([
      'STOCK D10\nDEPTH CUTX\nL2 R3',
      'STOCK D10\nDEPTH CUTX\nL2 R3',
      'STOCK D10\nDEPTH CUTX\nL2 R3',
    ]));

    await expect(createLatheCodeFromPrompt('invalid')).rejects.toThrow(/Line 2: DEPTH CUTX/);
  });

  it('repairs same-radius generated fillets locally before asking OpenRouter', async () => {
    const fetchMock = mockOpenRouterResponses([
      'STOCK D20\nL2 R5 FI0.5\nL2 R5',
    ]);
    vi.stubGlobal('fetch', fetchMock);

    const latheCodeText = await createLatheCodeFromPrompt('invalid fillet');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(latheCodeText).toContain('L2 RS5 FI0.5 RE5');
    expect(latheCodeText).not.toContain('RE5 FI0.5');
    expect(new LatheCode(latheCodeText).getProfiles().length).toBe(1);
  });

  it('keeps generated fillets on continuous cone corners', async () => {
    const fetchMock = mockOpenRouterResponses([
      'STOCK D10\nL2 RS2 RE3 FI0.5\nL2 RS3 RE2',
    ]);
    vi.stubGlobal('fetch', fetchMock);

    const latheCodeText = await createLatheCodeFromPrompt('continuous cone fillet');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(latheCodeText).toContain('L2 RS2 RE3 FI0.5');
    expect(new LatheCode(latheCodeText).getProfiles().length).toBe(1);
  });

  it('reduces oversized generated chamfers locally before asking OpenRouter', async () => {
    const fetchMock = mockOpenRouterResponses([
      'STOCK D20\nL1 D10 CH0.6',
    ]);
    vi.stubGlobal('fetch', fetchMock);

    const latheCodeText = await createLatheCodeFromPrompt('oversized chamfer');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(latheCodeText).toContain('L1 D10 CH0.5');
    expect(new LatheCode(latheCodeText).getProfiles().length).toBe(1);
  });

  it('removes unsupported generated features from curved segments locally', async () => {
    const fetchMock = mockOpenRouterResponses([
      'STOCK D12\nL5 DS0 FI0.5 DE10 CONV\nL1 D10',
    ]);
    vi.stubGlobal('fetch', fetchMock);

    const latheCodeText = await createLatheCodeFromPrompt('curved segment with bad fillet');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(latheCodeText).toContain('L5 DS0 DE10 CONV');
    expect(latheCodeText).not.toContain('FI0.5');
    expect(new LatheCode(latheCodeText).getProfiles().length).toBe(1);
  });

  it('removes malformed generated chamfer tokens locally before asking OpenRouter', async () => {
    const fetchMock = mockOpenRouterResponses([
      'STOCK D10\nL2 D10 CHX',
    ]);
    vi.stubGlobal('fetch', fetchMock);

    const latheCodeText = await createLatheCodeFromPrompt('malformed chamfer');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(latheCodeText).toBe('STOCK D10\nL2 D10');
    expect(new LatheCode(latheCodeText).getProfiles().length).toBe(1);
  });
});

type MockOpenRouterContent = string | {
  content?: unknown,
  finish_reason?: string | null,
  native_finish_reason?: string | null,
  reasoning?: unknown,
  reasoning_details?: unknown,
  refusal?: unknown,
};

function mockOpenRouterResponses(contents: MockOpenRouterContent[]) {
  let index = 0;
  return vi.fn().mockImplementation(async () => {
    const content = contents[Math.min(index, contents.length - 1)];
    index++;
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        choices: [mockOpenRouterChoice(content)],
      }),
    };
  });
}

function mockOpenRouterChoice(content: MockOpenRouterContent) {
  if (typeof content === 'string') return {message: {content}};
  return {
    finish_reason: content.finish_reason,
    native_finish_reason: content.native_finish_reason,
    message: {
      content: content.content,
      reasoning: content.reasoning,
      reasoning_details: content.reasoning_details,
      refusal: content.refusal,
    },
  };
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
