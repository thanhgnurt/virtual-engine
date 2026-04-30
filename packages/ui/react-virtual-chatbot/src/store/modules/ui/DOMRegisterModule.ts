import { BaseModule } from "../../core/BaseModule";
import { ChatEvent } from "../../types";

/**
 * Quản lý toàn bộ các thẻ HTML vật lý (DOM Nodes) của giao diện.
 * Cung cấp API để các module khác trong Store (VirtualModule, ResizeModule)
 * có thể trực tiếp lấy/đọc/ghi vào DOM mà không cần gọi thông qua React.
 */
export class DOMRegisterModule extends BaseModule<any, ChatEvent> {
  private _container: HTMLElement | null = null;
  private _content: HTMLElement | null = null;
  
  // --- Physical Storage (Index 0-19) ---
  private _wrappers = new Map<number, HTMLElement>();
  private _handles = new Map<number, any>();
  private _contentSlots = new Map<number, (HTMLElement | null)[]>();
  private _physicalComponents = new Map<number, Map<string, HTMLElement>>();

  // --- Logical Mapping (logicalIndex <-> physicalId) ---
  private _logicalToPhysical = new Map<number, number>();
  private _physicalToLogical = new Map<number, number>();

  // --- Container & Content ---
  public registerContainer(el: HTMLElement | null): void { this._container = el; }
  public getContainer(): HTMLElement | null { return this._container; }
  public registerContent(el: HTMLElement | null): void { this._content = el; }
  public getContent(): HTMLElement | null { return this._content; }

  // --- Physical Registration (Called by ChatRow on Mount) ---
  public registerWrapper(physicalId: number, el: HTMLElement | null): void {
    if (el) this._wrappers.set(physicalId, el);
    else this._wrappers.delete(physicalId);
  }

  public registerHandle(physicalId: number, handle: any): void {
    if (handle) this._handles.get(physicalId); // Just a check
    this._handles.set(physicalId, handle);
  }

  public registerPhysicalSlots(physicalId: number, elements: (HTMLElement | null)[]): void {
    this._contentSlots.set(physicalId, elements);
  }

  public registerPhysicalComponent(physicalId: number, name: string, el: HTMLElement): void {
    if (!this._physicalComponents.has(physicalId)) {
      this._physicalComponents.set(physicalId, new Map());
    }
    this._physicalComponents.get(physicalId)!.set(name, el);
  }

  // --- Unified Mapping (Called by ChatRow on doUpdate) ---
  /**
   * Links a logical message index to a physical row slot.
   * Automatically unlinks the previous message that was using this physical slot.
   */
  public linkMessageToRow(logicalIndex: number, physicalId: number): void {
    // 1. Find who was previously using this physical room
    const prevLogicalIndex = this._physicalToLogical.get(physicalId);
    
    // 2. If someone else was there, kick them out (unlink)
    if (prevLogicalIndex !== undefined && prevLogicalIndex !== logicalIndex) {
      this._logicalToPhysical.delete(prevLogicalIndex);
    }
    
    // 3. Register the new guest
    this._logicalToPhysical.set(logicalIndex, physicalId);
    this._physicalToLogical.set(physicalId, logicalIndex);
  }

  /**
   * Explicitly remove a logical index from all mappings.
   */
  public unlinkLogical(logicalIndex: number): void {
    const pId = this._logicalToPhysical.get(logicalIndex);
    if (pId !== undefined) {
      this._physicalToLogical.delete(pId);
    }
    this._logicalToPhysical.delete(logicalIndex);
  }

  // --- Retrieval API ---
  public getHandle(physicalId: number): any | undefined {
    return this._handles.get(physicalId);
  }

  public getHandleByLogical(logicalIndex: number): any | undefined {
    const pId = this._logicalToPhysical.get(logicalIndex);
    return pId !== undefined ? this._handles.get(pId) : undefined;
  }

  public getContentSlot(logicalIndex: number, partIdx: number = 0): HTMLElement | null | undefined {
    const pId = this._logicalToPhysical.get(logicalIndex);
    if (pId !== undefined) {
      return this._contentSlots.get(pId)?.[partIdx];
    }
    return undefined;
  }

  public getComponent(logicalIndex: number, name: string): HTMLElement | undefined {
    const pId = this._logicalToPhysical.get(logicalIndex);
    if (pId !== undefined) {
      return this._physicalComponents.get(pId)?.get(name);
    }
    return undefined;
  }

  public getWrapper(physicalId: number): HTMLElement | undefined {
    return this._wrappers.get(physicalId);
  }

  public override onDestroy(): void {
    this._container = null;
    this._content = null;
    this._wrappers.clear();
    this._handles.clear();
    this._contentSlots.clear();
    this._physicalComponents.clear();
    this._logicalToPhysical.clear();
    this._physicalToLogical.clear();
  }
}
