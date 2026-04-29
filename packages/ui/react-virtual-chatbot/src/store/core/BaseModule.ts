/**
 * Base class for all ChatStore modules.
 * TStore: The main store type
 * TNotify: The notification keys type
 */
export abstract class BaseModule<TStore = any, TNotify = string> {
  protected store!: TStore;

  /**
   * List of notification keys this module is interested in.
   */
  public interests?: TNotify[];

  /**
   * Execution priority (higher runs first).
   */
  public priority: number = 0;

  /**
   * Internal method to link the store.
   */
  public _setStore(store: TStore): void {
    this.store = store;
  }

  /**
   * Lifecycle: Called when the store is initialized.
   */
  public onInit?(): void;

  /**
   * Lifecycle: Called when a notification is emitted.
   */
  public onNotify?(key: TNotify, id?: string | number, payload?: any): void;

  /**
   * Lifecycle: Called when the store is destroyed.
   */
  public onDestroy?(): void;
}
