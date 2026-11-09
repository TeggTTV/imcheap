import React, { useRef, useEffect, useState, useCallback } from 'react';

export interface WheelItem<T> {
  value: T;
  label: string;
}

interface InteractiveWheelPickerProps<T> {
  items: WheelItem<T>[];
  value: T;
  onChange: (value: T) => void;
  height?: number;
  itemHeight?: number;
  ariaLabel?: string;
}

export function InteractiveWheelPicker<T extends string | number>({
  items,
  value,
  onChange,
  height = 90,
  itemHeight = 30,
  ariaLabel = 'Wheel Picker',
}: InteractiveWheelPickerProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const scrollStartTopRef = useRef(0);
  const timeoutRef = useRef<number | null>(null);

  // Selected index
  const selectedIndex = items.findIndex((it) => it.value === value);

  // Scroll to selected position
  const scrollToSelected = useCallback(
    (index: number, smooth: boolean = true) => {
      const container = containerRef.current;
      if (!container) return;
      const targetScroll = index * itemHeight;
      if (Math.abs(container.scrollTop - targetScroll) > 1) {
        container.scrollTo({
          top: targetScroll,
          behavior: smooth ? 'smooth' : 'auto',
        });
      }
    },
    [itemHeight]
  );

  // Snap to nearest item after scrolling stops
  const handleScroll = () => {
    if (isDraggingRef.current) return;
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;
      const index = Math.round(container.scrollTop / itemHeight);
      const clampedIndex = Math.max(0, Math.min(items.length - 1, index));
      scrollToSelected(clampedIndex, true);
      if (items[clampedIndex] && items[clampedIndex].value !== value) {
        onChange(items[clampedIndex].value);
      }
    }, 80);
  };

  // Mouse & Touch drag handling for natural spinning
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;
    isDraggingRef.current = true;
    startYRef.current = e.clientY;
    scrollStartTopRef.current = container.scrollTop;
    container.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const container = containerRef.current;
    if (!container) return;
    const deltaY = e.clientY - startYRef.current;
    container.scrollTop = scrollStartTopRef.current - deltaY;
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    const container = containerRef.current;
    if (!container) return;
    try {
      container.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    const index = Math.round(container.scrollTop / itemHeight);
    const clampedIndex = Math.max(0, Math.min(items.length - 1, index));
    scrollToSelected(clampedIndex, true);
    if (items[clampedIndex] && items[clampedIndex].value !== value) {
      onChange(items[clampedIndex].value);
    }
  };

  // Initial scroll position
  useEffect(() => {
    if (selectedIndex >= 0) {
      scrollToSelected(selectedIndex, false);
    }
  }, [selectedIndex, scrollToSelected]);

  const paddingY = (height - itemHeight) / 2;

  return (
    <div
      role="region"
      aria-label={ariaLabel}
      className="relative w-[114px] bg-surface-container-low rounded-2xl overflow-hidden select-none shadow-inner border border-surface-container-high/60 cursor-grab active:cursor-grabbing touch-none"
      style={{ height: `${height}px` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* 3D Wheel Vignette Gradients */}
      <div className="absolute top-0 inset-x-0 h-6 bg-gradient-to-b from-surface-container-low via-surface-container-low/80 to-transparent pointer-events-none z-20" />
      <div className="absolute bottom-0 inset-x-0 h-6 bg-gradient-to-t from-surface-container-low via-surface-container-low/80 to-transparent pointer-events-none z-20" />

      {/* Center Selection Lens */}
      <div
        className="absolute inset-x-1.5 rounded-lg bg-surface-container-lowest shadow-xs border border-surface-container-high/40 pointer-events-none z-10"
        style={{
          top: `${paddingY}px`,
          height: `${itemHeight}px`,
        }}
      />

      {/* Scrollable list */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="w-full h-full overflow-y-scroll no-scrollbar py-0 relative z-10"
        style={{
          paddingTop: `${paddingY}px`,
          paddingBottom: `${paddingY}px`,
          scrollSnapType: 'y mandatory',
        }}
      >
        {items.map((item, idx) => {
          const isSelected = idx === selectedIndex;
          return (
            <div
              key={String(item.value)}
              onClick={() => {
                scrollToSelected(idx, true);
                onChange(item.value);
              }}
              style={{
                height: `${itemHeight}px`,
                scrollSnapAlign: 'center',
              }}
              className={`flex items-center justify-center transition-all duration-150 cursor-pointer ${
                isSelected
                  ? 'font-bold text-on-surface text-[14px] tracking-wider uppercase scale-105'
                  : 'font-medium text-on-surface-variant/40 text-[12px] tracking-wider uppercase scale-95'
              }`}
            >
              {item.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

