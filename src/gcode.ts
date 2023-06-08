import { LatheCode, Segment, Stock, Tool } from "./lathecode";
import * as Colors from "./colors";
import { Planner } from "./planner";

const PX_MULTIPLIER = 100;

export class GCode {
  private latheCode: LatheCode | null = null;
  private stock: Stock | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private tool: HTMLCanvasElement | null = null;
  private stepInterval = 0;
  private planner: Planner | null = null;
  private flushTime = 0;

  constructor(private container: HTMLElement) { }

  setLatheCode(value: LatheCode | null) {
    if (this.latheCode) {
      this.container.replaceChildren();
      window.clearInterval(this.stepInterval);
      this.stepInterval = 0;
      this.planner = null;
    }
    this.latheCode = value;
    if (this.latheCode) {
      this.stock = this.latheCode.getStock();
      if (!this.stock) {
        this.container.innerText = 'Error: specify stock';
        return;
      }
      if (this.stock.diameter == 0) {
        this.container.innerText = 'Error: stock diameter is 0';
        return;
      }
      if (this.stock.length == 0) {
        this.container.innerText = 'Error: stock length is 0';
        return;
      }
      this.createCanvas(this.stock.length * PX_MULTIPLIER, this.stock.diameter / 2 * PX_MULTIPLIER);
      const insideSegments = this.latheCode.getInsideSegments();
      const outsideSegments = this.latheCode.getOutsideSegments();
      if (insideSegments.length && outsideSegments.length) {
        this.container.innerText = 'Error: inside and outside not supported yet';
        return;
      }
      if (!insideSegments.length && !outsideSegments.length) {
        this.container.innerText = 'Error: no segments';
        return;
      }
      const ctx = this.canvas!.getContext("2d")!;
      this.fillSegments(ctx, this.stock.getSegments(), Colors.COLOR_STOCK.hex());
      this.fillSegments(ctx, insideSegments.length ? insideSegments : outsideSegments, Colors.COLOR_PART.hex());
      this.createTool(this.latheCode.getTool());
      this.planner = new Planner(this.canvas!, this.tool!);
      this.stepInterval = window.setInterval(() => {
        for (let i = 0; i < 1000; i++) {
          if (!this.planner!.step()) {
            this.planner!.flushBitmap();
            window.clearInterval(this.stepInterval);
            this.stepInterval = 0;
            return;
          }
        }
        if (Date.now() - this.flushTime > 500) {
          this.flushTime = Date.now();
          this.planner!.flushBitmap();
        }
      }, 1);
    }
  }

  private createCanvas(width: number, height: number) {
    if (this.canvas) this.canvas.remove();
    this.canvas = document.createElement("canvas");
    this.canvas.className = 'part';
    this.canvas.width = width;
    this.canvas.height = height;
    this.container.appendChild(this.canvas);
    this.container.style.transform = `scale(${Math.min(1, 726 / width)})`;
  }

  private xToY(x: number) {
    return x * PX_MULTIPLIER;
  }

  private zToX(z: number) {
    return this.stock!.length * PX_MULTIPLIER - z * PX_MULTIPLIER;
  }

  private fillSegments(ctx: CanvasRenderingContext2D, segments: Segment[], color: string) {
    ctx.beginPath();
    ctx.moveTo(this.zToX(segments[0].start.z), this.xToY(segments[0].start.x));
    for (let s of segments) {
      this.drawSegment(ctx, s);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  private drawSegment(ctx: CanvasRenderingContext2D, s: Segment) {
    ctx.lineTo(this.zToX(s.end.z), this.xToY(s.end.x));
  }

  private createTool(tool: Tool) {
    if (this.tool) this.tool.remove();
    this.tool = document.createElement("canvas");
    this.tool.className = 'tool';
    const ctx = this.tool.getContext("2d")!;
    if (tool.type === 'rect') {
      const widthPixels = tool.widthMm * PX_MULTIPLIER;
      const heightPixels = tool.heightMm * PX_MULTIPLIER;
      const cornerRadiusPixels = tool.cornerRadiusMm * PX_MULTIPLIER;
      this.tool.width = widthPixels;
      this.tool.height = heightPixels;
      ctx.strokeStyle = Colors.COLOR_TOOL.hex();
      ctx.fillStyle = Colors.COLOR_TOOL_FILL.hex();
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cornerRadiusPixels, 0);
      ctx.lineTo(widthPixels - cornerRadiusPixels, 0);
      ctx.arcTo(widthPixels, 0, widthPixels, cornerRadiusPixels, cornerRadiusPixels);
      ctx.lineTo(widthPixels, heightPixels - cornerRadiusPixels);
      ctx.arcTo(widthPixels, heightPixels, widthPixels - cornerRadiusPixels, heightPixels, cornerRadiusPixels);
      ctx.lineTo(cornerRadiusPixels, heightPixels);
      ctx.arcTo(0, heightPixels, 0, heightPixels - cornerRadiusPixels, cornerRadiusPixels);
      ctx.lineTo(0, cornerRadiusPixels);
      ctx.arcTo(0, 0, cornerRadiusPixels, 0, cornerRadiusPixels);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      throw new Error(`tool of type ${tool.type} not implemented`);
    }
    this.container.appendChild(this.tool);
  }
}
