export interface VirtualEngineOptions {
  totalCount: number;
  itemHeight: number;
  viewportHeight: number;
  buffer?: number;
}

export interface VirtualRange {
  start: number;
  end: number;
}

export interface VirtualItemMetadata {
  index: number;
  offset: number;
  size: number;
}

export function computeRange(
  scrollTop: number,
  itemHeight: number,
  viewportHeight: number,
  itemCount: number,
  buffer: number = 3,
): VirtualRange {
  const start = Math.floor(scrollTop / itemHeight);
  const visibleCount = Math.ceil(viewportHeight / itemHeight);

  return {
    start: Math.max(0, start - buffer),
    end: Math.min(itemCount - 1, start + visibleCount + buffer),
  };
}

export function getItemOffset(index: number, itemHeight: number): number {
  return index * itemHeight;
}

export function getTotalSize(itemCount: number, itemHeight: number): number {
  return itemCount * itemHeight;
}
