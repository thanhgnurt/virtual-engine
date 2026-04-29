import { BaseModule } from '../../core/BaseModule';
import { ChatEvent } from '../../types';

/**
 * Registry specifically for UI Components (icons, dots, buttons).
 */
export class ComponentRegistryModule extends BaseModule<any, ChatEvent> {
  private components = new Map<string, HTMLElement>();

  public register(index: number, key: string, el: HTMLElement): void {
    this.components.set(`${index}_${key}`, el);
  }

  public unregister(index: number, key: string): void {
    this.components.delete(`${index}_key`);
  }

  public get(index: number, key: string): HTMLElement | undefined {
    return this.components.get(`${index}_${key}`);
  }

  public override onDestroy(): void {
    this.components.clear();
  }
}
