import { BaseModule } from './BaseModule';

export type Listener = (id?: string | number, payload?: any) => void;

/**
 * A Unified Sub/Pub Store inspired by the best parts of MiniPriceBoard.
 * It manages a single event system for both Modules and UI components.
 */
export abstract class BaseStore<TState, TEvent extends string = string> {
  protected _state: TState;
  
  // Event Registry: Map<Event, Map<ID | 'GLOBAL', Set<Listener>>>
  private _listeners = new Map<string, Map<string | number, Set<Listener>>>();
  private _modules: BaseModule<any, TEvent>[] = [];
  private _interestMap = new Map<TEvent, BaseModule[]>();

  constructor(initialState: TState) {
    this._state = initialState;
  }

  public get state() {
    return this._state;
  }

  /**
   * Subscribe to an event, optionally filtered by ID.
   */
  public subscribe(event: TEvent, listener: Listener, id?: string | number): () => void {
    const key = id ?? '@@GLOBAL';
    
    let eventMap = this._listeners.get(event);
    if (!eventMap) {
      eventMap = new Map();
      this._listeners.set(event, eventMap);
    }

    let set = eventMap.get(key);
    if (!set) {
      set = new Set();
      eventMap.set(key, set);
    }

    set.add(listener);

    return () => {
      const currentEventMap = this._listeners.get(event);
      if (currentEventMap) {
        const currentSet = currentEventMap.get(key);
        if (currentSet) {
          currentSet.delete(listener);
          if (currentSet.size === 0) currentEventMap.delete(key);
        }
      }
    };
  }

  /**
   * Emit an event to all subscribers (modules and UI).
   */
  public emit(event: TEvent, id?: string | number, payload?: any): void {
    // 1. Notify interested modules
    const modules = this._interestMap.get(event);
    if (modules) {
      for (let i = 0; i < modules.length; i++) {
        modules[i].onNotify?.(event, id, payload);
      }
    }

    // 2. Notify UI listeners
    const eventMap = this._listeners.get(event);
    if (eventMap) {
      // Notify specific ID listeners
      if (id !== undefined) {
        const specificSet = eventMap.get(id);
        if (specificSet) specificSet.forEach(l => l(id, payload));
      }

      // Always notify global listeners
      const globalSet = eventMap.get('@@GLOBAL');
      if (globalSet) globalSet.forEach(l => l(id, payload));
    }
  }

  public registerModule<T extends BaseModule<any, TEvent>>(module: T): T {
    this._modules.push(module);
    this._modules.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    module._setStore(this);
    
    if (module.interests && module.onNotify) {
      for (const key of module.interests) {
        let list = this._interestMap.get(key);
        if (!list) {
          list = [];
          this._interestMap.set(key, list);
        }
        list.push(module);
      }
    }

    if (module.onInit) module.onInit();
    return module;
  }

  public destroy() {
    this._listeners.clear();
    for (const m of this._modules) {
      m.onDestroy?.();
    }
    this._modules = [];
    this._interestMap.clear();
  }
}
