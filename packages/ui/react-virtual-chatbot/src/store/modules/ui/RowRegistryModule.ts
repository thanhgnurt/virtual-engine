import { BaseModule } from '../../core/BaseModule';
import { ChatEvent } from '../../types';

/**
 * Registry specifically for Row Containers.
 * Used for layout, virtualization, and row-level effects.
 */
export class RowRegistryModule extends BaseModule<any, ChatEvent> {
  private rows = new Map<number, HTMLElement>();

  public register(index: number, el: HTMLElement): void {
    this.rows.set(index, el);
  }

  public unregister(index: number): void {
    this.rows.delete(index);
  }

  public get(index: number): HTMLElement | undefined {
    return this.rows.get(index);
  }

  public override onDestroy(): void {
    this.rows.clear();
  }
}
