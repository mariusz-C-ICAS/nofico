import type { AppEventMap, AppEventType } from '../types';

type Handler<K extends AppEventType> = (detail: AppEventMap[K]) => void;

class TypedEventBus extends EventTarget {
  emit<K extends AppEventType>(type: K, detail: AppEventMap[K]): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: false }));
  }

  on<K extends AppEventType>(type: K, handler: Handler<K>): () => void {
    const listener = (e: Event) => handler((e as CustomEvent<AppEventMap[K]>).detail);
    this.addEventListener(type, listener);
    return () => this.removeEventListener(type, listener);
  }

  once<K extends AppEventType>(type: K, handler: Handler<K>): void {
    const listener = (e: Event) => handler((e as CustomEvent<AppEventMap[K]>).detail);
    this.addEventListener(type, listener, { once: true });
  }
}

export const eventBus = new TypedEventBus();
