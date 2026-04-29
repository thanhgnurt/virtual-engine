import { BaseModule } from '../../core/BaseModule';
import { ChatEvent } from '../../types';

/**
 * Manages the mapping between message indices and their physical DOM elements.
 * This is the heart of the "Zero-Render" system.
 */
export class RegistryModule extends BaseModule<any, ChatEvent> {
  // Map<MessageIndex, HTMLElement>
  private elementMap = new Map<number, HTMLElement>();

  /**
   * Register a DOM element for a specific message index.
   * Called by the ChatRow component when it mounts or is recycled.
   */
  public register(index: number, el: HTMLElement): void {
    this.elementMap.set(index, el);
  }

  /**
   * Unregister an element.
   */
  public unregister(index: number): void {
    this.elementMap.delete(index);
  }

  /**
   * Get the DOM element currently assigned to a message index.
   */
  public getElement(index: number): HTMLElement | undefined {
    return this.elementMap.get(index);
  }

  /**
   * Clear all mappings (e.g. on chat reset).
   */
  public override onDestroy(): void {
    this.elementMap.clear();
  }
}
