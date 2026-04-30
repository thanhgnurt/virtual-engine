import { BaseModule } from '../../core/BaseModule';
import { ChatEvent } from '../../types';

/**
 * Registry specifically for Content Nodes (TextNodes).
 * Optimized for high-frequency direct DOM streaming updates.
 */
export class ContentRegistryModule extends BaseModule<any, ChatEvent> {
  // physicalRegistry[physicalId][partIndex] = HTMLElement container
  private physicalRegistry: Array<Array<HTMLElement | null>> = [];
  
  // physicalComponents[physicalId][name] = HTMLElement
  private physicalComponents = new Map<number, Map<string, HTMLElement>>();
  
  // logicalToPhysical: Map<logicalIndex, physicalId>
  private logicalToPhysical = new Map<number, number>();

  // Called ONCE by ChatRow when it mounts (or when slotCount expands)
  public registerPhysicalSlots(physicalId: number, elements: (HTMLElement | null)[]): void {
    this.physicalRegistry[physicalId] = elements;
  }

  public registerPhysicalComponent(physicalId: number, name: string, el: HTMLElement): void {
    if (!this.physicalComponents.has(physicalId)) {
      this.physicalComponents.set(physicalId, new Map());
    }
    this.physicalComponents.get(physicalId)!.set(name, el);
  }

  // Called by ChatRow during doUpdate (O(1) map update)
  public linkLogicalToPhysical(logicalIndex: number, physicalId: number): void {
    this.logicalToPhysical.set(logicalIndex, physicalId);
  }

  // Called by ChatRow during Cleanup
  public unlinkLogical(logicalIndex: number): void {
    this.logicalToPhysical.delete(logicalIndex);
  }

  // Called by SyncModule during streaming
  public get(logicalIndex: number, partIdx: number = 0): HTMLElement | null | undefined {
    const physicalId = this.logicalToPhysical.get(logicalIndex);
    if (physicalId !== undefined) {
      const slots = this.physicalRegistry[physicalId];
      if (slots) {
        return slots[partIdx];
      }
    }
    return undefined;
  }

  public getComponent(logicalIndex: number, name: string): HTMLElement | undefined {
    const physicalId = this.logicalToPhysical.get(logicalIndex);
    if (physicalId !== undefined) {
      return this.physicalComponents.get(physicalId)?.get(name);
    }
    return undefined;
  }

  public override onDestroy(): void {
    this.physicalRegistry = [];
    this.logicalToPhysical.clear();
    this.physicalComponents.clear();
  }
}
