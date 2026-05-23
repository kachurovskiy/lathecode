import { beforeEach, describe, expect, it } from 'vitest';
import { LatheCode } from './common/lathecode';
import { CrossSection } from './crosssection';

describe('CrossSection', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('renders a static outside-profile cross-section', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const crossSection = new CrossSection(container);

    crossSection.setLatheCode(new LatheCode('STOCK D10\nL4 R3\nL2 D4'));

    const svg = container.querySelector<SVGSVGElement>('.crossSectionSvg')!;
    expect(svg).not.toBeNull();
    expect(svg.getAttribute('viewBox')).toBe('0 0 500 500');
    const axis = svg.querySelector<SVGLineElement>('.crossSectionAxis')!;
    expect(axis).not.toBeNull();
    expect(Number(axis.getAttribute('x1'))).toBeGreaterThan(Number(axis.getAttribute('x2')));
    expect(axis.getAttribute('stroke-dasharray')).toBe('6 6');
    expect(container.querySelector('.crossSectionDimensions')?.textContent)
      .toBe('Part ⌀6 L6mm, stock ⌀10 L6 mm');
    expect(svg.querySelector('.crossSectionChuck')).toBeNull();
    expect(svg.querySelector('.crossSectionTool')).toBeNull();
    expect(svg.querySelectorAll('.crossSectionStock').length).toBe(2);
    expect(svg.querySelectorAll('.crossSectionPart').length).toBe(2);
    expect(svg.querySelectorAll('.crossSectionOutsideProfile').length).toBe(2);
    expect(svg.querySelector('.crossSectionInsideProfile')).toBeNull();
  });

  it('renders inside and outside outlines for mixed profiles', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const crossSection = new CrossSection(container);

    crossSection.setLatheCode(new LatheCode('STOCK D12 ID4\nL4 R5\nINSIDE\nL4 R3'));

    expect(container.querySelectorAll('.crossSectionPart').length).toBe(2);
    expect(container.querySelectorAll('.crossSectionOutsideProfile').length).toBe(2);
    expect(container.querySelectorAll('.crossSectionInsideProfile').length).toBe(2);
  });

  it('renders convex arcs without folding back along the profile', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const crossSection = new CrossSection(container);

    crossSection.setLatheCode(new LatheCode(`
STOCK D22
L4 D18
L5 DS18 DE12 CONV
L5 DS12 DE22 CONV
L4 D22`));

    const outsideProfile = container.querySelector<SVGPathElement>('.crossSectionOutsideProfile')!;
    const points = getPathPoints(outsideProfile);

    expect(points.length).toBeGreaterThan(8);
    expect(isNonIncreasing(points.map(point => point.x))).toBe(true);
  });

  it('clears the drawing when lathecode is hidden', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const crossSection = new CrossSection(container);
    crossSection.setLatheCode(new LatheCode('STOCK D10\nL4 R3'));

    crossSection.setLatheCode(null);

    expect(container.querySelector('.crossSectionDimensions')!.textContent).toBe('');
    expect(container.querySelector('.crossSectionSvg')!.childElementCount).toBe(0);
  });
});

function getPathPoints(path: SVGPathElement) {
  expect(path).not.toBeNull();
  const numbers = (path.getAttribute('d')?.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  const points: {x: number, y: number}[] = [];
  for (let i = 0; i + 1 < numbers.length; i += 2) points.push({x: numbers[i], y: numbers[i + 1]});
  return points;
}

function isNonIncreasing(values: number[]) {
  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[i - 1] + 0.01) return false;
  }
  return true;
}
