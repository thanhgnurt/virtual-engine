import React, { createContext, useContext, ReactNode, useSyncExternalStore, useCallback } from 'react';
import { ChatStore } from './index';
import { ChatEvent } from './types';

const ChatContext = createContext<ChatStore | null>(null);

/**
 * Provider component to inject the ChatStore into the component tree.
 */
export const ChatProvider: React.FC<{ store: ChatStore; children: ReactNode }> = ({ store, children }) => {
  return <ChatContext.Provider value={store}>{children}</ChatContext.Provider>;
};

/**
 * Hook to consume the ChatStore in any component.
 */
export const useChatStore = () => {
  const store = useContext(ChatContext);
  if (!store) {
    throw new Error('useChatStore must be used within a ChatProvider');
  }
  return store;
};

/**
 * Hook to subscribe to a specific store event and get a value.
 */
export function useChatStoreValue<T>(
  event: ChatEvent,
  selector: (store: ChatStore) => T,
  id?: string | number
): T {
  const store = useChatStore();
  
  const subscribe = useCallback((onStoreChange: () => void) => {
    return store.subscribe(event, onStoreChange, id);
  }, [store, event, id]);

  const getSnapshot = () => selector(store);

  return useSyncExternalStore(subscribe, getSnapshot);
}
