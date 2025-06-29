"use client";

import { useState, useCallback, useMemo } from "react";

export interface BulkSelectionOptions<T = any> {
  items: T[];
  keyExtractor: (item: T) => string | number;
}

export function useBulkSelection<T = any>({ items, keyExtractor }: BulkSelectionOptions<T>) {
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());

  const selectedItems = useMemo(() => {
    return items.filter(item => selectedIds.has(keyExtractor(item)));
  }, [items, selectedIds, keyExtractor]);

  const isSelected = useCallback((item: T) => {
    return selectedIds.has(keyExtractor(item));
  }, [selectedIds, keyExtractor]);

  const isAllSelected = useMemo(() => {
    return items.length > 0 && items.every(item => selectedIds.has(keyExtractor(item)));
  }, [items, selectedIds, keyExtractor]);

  const isIndeterminate = useMemo(() => {
    return selectedIds.size > 0 && selectedIds.size < items.length;
  }, [selectedIds.size, items.length]);

  const selectedCount = selectedIds.size;

  const toggleItem = useCallback((item: T) => {
    const id = keyExtractor(item);
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, [keyExtractor]);

  const toggleAll = useCallback(() => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(keyExtractor)));
    }
  }, [isAllSelected, items, keyExtractor]);

  const selectItem = useCallback((item: T) => {
    const id = keyExtractor(item);
    setSelectedIds(prev => new Set(prev).add(id));
  }, [keyExtractor]);

  const deselectItem = useCallback((item: T) => {
    const id = keyExtractor(item);
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  }, [keyExtractor]);

  const selectItems = useCallback((itemsToSelect: T[]) => {
    const idsToSelect = itemsToSelect.map(keyExtractor);
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      idsToSelect.forEach(id => newSet.add(id));
      return newSet;
    });
  }, [keyExtractor]);

  const deselectItems = useCallback((itemsToDeselect: T[]) => {
    const idsToDeselect = itemsToDeselect.map(keyExtractor);
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      idsToDeselect.forEach(id => newSet.delete(id));
      return newSet;
    });
  }, [keyExtractor]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(items.map(keyExtractor)));
  }, [items, keyExtractor]);

  return {
    selectedIds,
    selectedItems,
    selectedCount,
    isSelected,
    isAllSelected,
    isIndeterminate,
    toggleItem,
    toggleAll,
    selectItem,
    deselectItem,
    selectItems,
    deselectItems,
    clearSelection,
    selectAll,
  };
}