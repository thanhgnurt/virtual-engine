import { BaseModule } from '../../core/BaseModule';
import { ChatEvent } from '../../types';

/**
 * Registry specifically for Content Nodes (TextNodes).
 * Optimized for high-frequency direct DOM streaming updates.
 */
export class ContentRegistryModule extends BaseModule<any, ChatEvent> {
  private contents = new Map<string, Text>();

  public register(index: number, partIdx: number, node: Text): void {
    this.contents.set(`${index}_${partIdx}`, node);
  }

  public unregister(index: number, partIdx: number): void {
    this.contents.delete(`${index}_${partIdx}`);
  }

  public get(index: number, partIdx: number = 0): Text | undefined {
    return this.contents.get(`${index}_${partIdx}`);
  }

  public override onDestroy(): void {
    this.contents.clear();
  }
}
