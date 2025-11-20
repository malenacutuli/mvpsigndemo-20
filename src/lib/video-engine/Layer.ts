import type { RenderContext, LayerConfig } from './types';

export class Layer {
  public config: LayerConfig;
  private renderables: Map<string, any> = new Map();

  constructor(id: string, name?: string) {
    this.config = {
      id,
      name: name || id,
      visible: true,
      opacity: 1,
      zIndex: 0
    };
  }

  addRenderable(id: string, renderable: any) {
    this.renderables.set(id, renderable);
  }

  removeRenderable(id: string) {
    this.renderables.delete(id);
  }

  clearRenderables() {
    this.renderables.clear();
  }

  render(ctx: CanvasRenderingContext2D, currentTime: number) {
    if (!this.config.visible) return;

    ctx.save();
    ctx.globalAlpha = this.config.opacity;

    for (const [id, renderable] of this.renderables) {
      if (renderable.render && typeof renderable.render === 'function') {
        renderable.render({ ctx, time: currentTime, width: ctx.canvas.width, height: ctx.canvas.height });
      }
    }

    ctx.restore();
  }

  setVisible(visible: boolean) {
    this.config.visible = visible;
  }

  setOpacity(opacity: number) {
    this.config.opacity = Math.max(0, Math.min(1, opacity));
  }

  setZIndex(zIndex: number) {
    this.config.zIndex = zIndex;
  }
}
