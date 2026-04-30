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
  
  // Lưu trữ các DOM Wrapper (chứa style translateY)
  private _wrappers = new Map<number, HTMLElement>();
  
  // Lưu trữ các React Component Handles (EngineSlot) để gọi imperative updates
  private _handles = new Map<number, any>();

  // Lưu trữ các Dòng Chat thực tế (ChatRow) theo chỉ số dữ liệu gốc
  private _rows = new Map<number, { el: HTMLElement; handle?: any }>();

  // --- Container & Content ---

  public registerContainer(el: HTMLElement | null): void {
    this._container = el;
  }

  public getContainer(): HTMLElement | null {
    return this._container;
  }

  public registerContent(el: HTMLElement | null): void {
    this._content = el;
  }

  public getContent(): HTMLElement | null {
    return this._content;
  }

  // --- Rows (Wrappers & Handles) ---

  public registerWrapper(slotIndex: number, el: HTMLElement | null): void {
    if (el) {
      this._wrappers.set(slotIndex, el);
    } else {
      this._wrappers.delete(slotIndex);
    }
  }

  public getWrapper(slotIndex: number): HTMLElement | undefined {
    return this._wrappers.get(slotIndex);
  }

  public registerHandle(slotIndex: number, handle: any): void {
    if (handle) {
      this._handles.set(slotIndex, handle);
    } else {
      this._handles.delete(slotIndex);
    }
  }

  public getHandle(slotIndex: number): any | undefined {
    return this._handles.get(slotIndex);
  }

  // --- Legacy Row Registration (By Data Index) ---

  public registerRow(index: number, el: HTMLElement, handle?: any): void {
    this._rows.set(index, { el, handle });
  }

  public unregisterRow(index: number): void {
    this._rows.delete(index);
  }

  public getRowElement(index: number): HTMLElement | undefined {
    return this._rows.get(index)?.el;
  }

  public getRowHandle(index: number): any | undefined {
    return this._rows.get(index)?.handle;
  }

  public override onDestroy(): void {
    this._container = null;
    this._content = null;
    this._wrappers.clear();
    this._handles.clear();
    this._rows.clear();
  }
}
