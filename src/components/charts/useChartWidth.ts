import { useCallback, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';

/** Measures the width a chart has to draw in. Zero until the first layout. */
export function useChartWidth(): [number, (e: LayoutChangeEvent) => void] {
  const [width, setWidth] = useState(0);
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const next = Math.round(e.nativeEvent.layout.width);
    setWidth((prev) => (prev === next ? prev : next));
  }, []);
  return [width, onLayout];
}
