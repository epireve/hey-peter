import { useState, useCallback, useMemo } from 'react';

export interface PaginationConfig {
  initialPage?: number;
  initialLimit?: number;
  totalCount?: number;
  maxVisiblePages?: number;
  showFirstLast?: boolean;
  showPrevNext?: boolean;
  showInfo?: boolean;
  showSizeSelector?: boolean;
  sizeOptions?: number[];
  boundaryCount?: number;
  siblingCount?: number;
}

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  startItem: number;
  endItem: number;
  visiblePages: number[];
  showFirstEllipsis: boolean;
  showLastEllipsis: boolean;
}

export interface PaginationActions {
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  firstPage: () => void;
  lastPage: () => void;
  setPageSize: (size: number) => void;
  setTotalCount: (count: number) => void;
  reset: () => void;
}

export interface UsePaginationReturn {
  // State
  state: PaginationState;
  
  // Actions
  actions: PaginationActions;
  
  // Computed values
  isEmpty: boolean;
  isFirstPage: boolean;
  isLastPage: boolean;
  
  // Helpers
  getPageInfo: () => string;
  getPageRange: () => { start: number; end: number };
  canGoToPage: (page: number) => boolean;
  
  // Table helpers
  getTableData: <T>(data: T[]) => T[];
  getSliceRange: () => { start: number; end: number };
  
  // URL helpers
  getPageUrl: (page: number) => string;
  parsePageFromUrl: (url: string) => number;
  
  // Event handlers
  handlePageChange: (page: number) => void;
  handlePageSizeChange: (size: number) => void;
  handleFirstPage: () => void;
  handleLastPage: () => void;
  handleNextPage: () => void;
  handlePrevPage: () => void;
}

export const usePagination = (
  config: PaginationConfig = {}
): UsePaginationReturn => {
  const {
    initialPage = 1,
    initialLimit = 10,
    totalCount = 0,
    maxVisiblePages = 5,
    boundaryCount = 1,
    siblingCount = 1,
    sizeOptions = [10, 20, 50, 100],
  } = config;

  // State
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialLimit);
  const [totalCountState, setTotalCountState] = useState(totalCount);

  // Computed values
  const state = useMemo((): PaginationState => {
    const totalPages = Math.ceil(totalCountState / pageSize);
    const hasNextPage = currentPage < totalPages;
    const hasPrevPage = currentPage > 1;
    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalCountState);

    // Calculate visible pages
    const visiblePages = calculateVisiblePages(
      currentPage,
      totalPages,
      maxVisiblePages,
      boundaryCount,
      siblingCount
    );

    const showFirstEllipsis = visiblePages.length > 0 && visiblePages[0] > boundaryCount + 1;
    const showLastEllipsis = visiblePages.length > 0 && 
      visiblePages[visiblePages.length - 1] < totalPages - boundaryCount;

    return {
      currentPage,
      pageSize,
      totalCount: totalCountState,
      totalPages,
      hasNextPage,
      hasPrevPage,
      startItem,
      endItem,
      visiblePages,
      showFirstEllipsis,
      showLastEllipsis,
    };
  }, [currentPage, pageSize, totalCountState, maxVisiblePages, boundaryCount, siblingCount]);

  // Actions
  const actions = useMemo((): PaginationActions => ({
    goToPage: (page: number) => {
      const validPage = Math.max(1, Math.min(page, state.totalPages));
      setCurrentPage(validPage);
    },
    nextPage: () => {
      if (state.hasNextPage) {
        setCurrentPage(prev => prev + 1);
      }
    },
    prevPage: () => {
      if (state.hasPrevPage) {
        setCurrentPage(prev => prev - 1);
      }
    },
    firstPage: () => {
      setCurrentPage(1);
    },
    lastPage: () => {
      setCurrentPage(state.totalPages);
    },
    setPageSize: (size: number) => {
      setPageSizeState(size);
      // Adjust current page to maintain the same starting item
      const currentStart = (currentPage - 1) * pageSize + 1;
      const newPage = Math.ceil(currentStart / size);
      setCurrentPage(newPage);
    },
    setTotalCount: (count: number) => {
      setTotalCountState(count);
      // Adjust current page if it exceeds new total pages
      const newTotalPages = Math.ceil(count / pageSize);
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages);
      }
    },
    reset: () => {
      setCurrentPage(initialPage);
      setPageSizeState(initialLimit);
      setTotalCountState(totalCount);
    },
  }), [state, currentPage, pageSize, initialPage, initialLimit, totalCount]);

  // Computed flags
  const isEmpty = state.totalCount === 0;
  const isFirstPage = state.currentPage === 1;
  const isLastPage = state.currentPage === state.totalPages;

  // Helper functions
  const getPageInfo = useCallback(() => {
    if (isEmpty) return 'No items';
    return `${state.startItem}-${state.endItem} of ${state.totalCount}`;
  }, [isEmpty, state.startItem, state.endItem, state.totalCount]);

  const getPageRange = useCallback(() => {
    return {
      start: (state.currentPage - 1) * state.pageSize,
      end: state.currentPage * state.pageSize,
    };
  }, [state.currentPage, state.pageSize]);

  const canGoToPage = useCallback((page: number) => {
    return page >= 1 && page <= state.totalPages;
  }, [state.totalPages]);

  // Table helpers
  const getTableData = useCallback(<T>(data: T[]) => {
    const { start, end } = getPageRange();
    return data.slice(start, end);
  }, [getPageRange]);

  const getSliceRange = useCallback(() => {
    const start = (state.currentPage - 1) * state.pageSize;
    const end = start + state.pageSize;
    return { start, end };
  }, [state.currentPage, state.pageSize]);

  // URL helpers
  const getPageUrl = useCallback((page: number) => {
    const url = new URL(window.location.href);
    url.searchParams.set('page', page.toString());
    url.searchParams.set('limit', state.pageSize.toString());
    return url.toString();
  }, [state.pageSize]);

  const parsePageFromUrl = useCallback((url: string) => {
    const urlObj = new URL(url);
    const page = parseInt(urlObj.searchParams.get('page') || '1', 10);
    return Math.max(1, page);
  }, []);

  // Event handlers
  const handlePageChange = useCallback((page: number) => {
    actions.goToPage(page);
  }, [actions]);

  const handlePageSizeChange = useCallback((size: number) => {
    actions.setPageSize(size);
  }, [actions]);

  const handleFirstPage = useCallback(() => {
    actions.firstPage();
  }, [actions]);

  const handleLastPage = useCallback(() => {
    actions.lastPage();
  }, [actions]);

  const handleNextPage = useCallback(() => {
    actions.nextPage();
  }, [actions]);

  const handlePrevPage = useCallback(() => {
    actions.prevPage();
  }, [actions]);

  return {
    // State
    state,
    
    // Actions
    actions,
    
    // Computed values
    isEmpty,
    isFirstPage,
    isLastPage,
    
    // Helpers
    getPageInfo,
    getPageRange,
    canGoToPage,
    
    // Table helpers
    getTableData,
    getSliceRange,
    
    // URL helpers
    getPageUrl,
    parsePageFromUrl,
    
    // Event handlers
    handlePageChange,
    handlePageSizeChange,
    handleFirstPage,
    handleLastPage,
    handleNextPage,
    handlePrevPage,
  };
};

// Helper function to calculate visible pages
function calculateVisiblePages(
  currentPage: number,
  totalPages: number,
  maxVisiblePages: number,
  boundaryCount: number,
  siblingCount: number
): number[] {
  if (totalPages <= maxVisiblePages) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: number[] = [];
  
  // Add boundary pages at the beginning
  for (let i = 1; i <= Math.min(boundaryCount, totalPages); i++) {
    pages.push(i);
  }
  
  // Add sibling pages around current page
  const startSibling = Math.max(1, currentPage - siblingCount);
  const endSibling = Math.min(totalPages, currentPage + siblingCount);
  
  for (let i = startSibling; i <= endSibling; i++) {
    if (!pages.includes(i)) {
      pages.push(i);
    }
  }
  
  // Add boundary pages at the end
  for (let i = Math.max(1, totalPages - boundaryCount + 1); i <= totalPages; i++) {
    if (!pages.includes(i)) {
      pages.push(i);
    }
  }
  
  return pages.sort((a, b) => a - b);
}

// Advanced pagination hook with search and filters
export interface AdvancedPaginationConfig extends PaginationConfig {
  enableSearch?: boolean;
  enableFilters?: boolean;
  searchDebounceMs?: number;
  defaultSearchTerm?: string;
  defaultFilters?: Record<string, any>;
}

export interface AdvancedPaginationReturn extends UsePaginationReturn {
  // Search
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  debouncedSearchTerm: string;
  clearSearch: () => void;
  
  // Filters
  filters: Record<string, any>;
  setFilter: (key: string, value: any) => void;
  setFilters: (filters: Record<string, any>) => void;
  clearFilters: () => void;
  clearFilter: (key: string) => void;
  
  // Combined state
  hasActiveFilters: boolean;
  hasActiveSearch: boolean;
  resetAll: () => void;
}

export const useAdvancedPagination = (
  config: AdvancedPaginationConfig = {}
): AdvancedPaginationReturn => {
  const {
    enableSearch = true,
    enableFilters = true,
    searchDebounceMs = 300,
    defaultSearchTerm = '',
    defaultFilters = {},
    ...paginationConfig
  } = config;

  const pagination = usePagination(paginationConfig);
  
  // Search state
  const [searchTerm, setSearchTermState] = useState(defaultSearchTerm);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(defaultSearchTerm);
  
  // Filters state
  const [filters, setFiltersState] = useState(defaultFilters);

  // Debounce search term
  useState(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, searchDebounceMs);

    return () => clearTimeout(timer);
  });

  // Search actions
  const setSearchTerm = useCallback((term: string) => {
    setSearchTermState(term);
    // Reset to first page when search changes
    pagination.actions.goToPage(1);
  }, [pagination.actions]);

  const clearSearch = useCallback(() => {
    setSearchTermState('');
    setDebouncedSearchTerm('');
  }, []);

  // Filter actions
  const setFilter = useCallback((key: string, value: any) => {
    setFiltersState(prev => ({
      ...prev,
      [key]: value,
    }));
    // Reset to first page when filters change
    pagination.actions.goToPage(1);
  }, [pagination.actions]);

  const setFilters = useCallback((newFilters: Record<string, any>) => {
    setFiltersState(newFilters);
    pagination.actions.goToPage(1);
  }, [pagination.actions]);

  const clearFilters = useCallback(() => {
    setFiltersState(defaultFilters);
  }, [defaultFilters]);

  const clearFilter = useCallback((key: string) => {
    setFiltersState(prev => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
  }, []);

  // Combined state
  const hasActiveFilters = Object.keys(filters).length > 0;
  const hasActiveSearch = debouncedSearchTerm.length > 0;

  const resetAll = useCallback(() => {
    pagination.actions.reset();
    clearSearch();
    clearFilters();
  }, [pagination.actions, clearSearch, clearFilters]);

  return {
    ...pagination,
    
    // Search
    searchTerm,
    setSearchTerm,
    debouncedSearchTerm,
    clearSearch,
    
    // Filters
    filters,
    setFilter,
    setFilters,
    clearFilters,
    clearFilter,
    
    // Combined state
    hasActiveFilters,
    hasActiveSearch,
    resetAll,
  };
};

// Table pagination hook specifically for DataTable components
export interface TablePaginationConfig extends PaginationConfig {
  data: any[];
  enableClientSidePagination?: boolean;
  enableServerSidePagination?: boolean;
  onPageChange?: (page: number, pageSize: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

export interface TablePaginationReturn extends UsePaginationReturn {
  // Table-specific data
  currentPageData: any[];
  isClientSide: boolean;
  isServerSide: boolean;
  
  // Table-specific actions
  handleTablePageChange: (page: number) => void;
  handleTablePageSizeChange: (pageSize: number) => void;
  
  // Table state
  tableProps: {
    currentPage: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
    pageInfo: string;
  };
}

export const useTablePagination = (
  config: TablePaginationConfig
): TablePaginationReturn => {
  const {
    data,
    enableClientSidePagination = true,
    enableServerSidePagination = false,
    onPageChange,
    onPageSizeChange,
    ...paginationConfig
  } = config;

  const pagination = usePagination({
    ...paginationConfig,
    totalCount: enableClientSidePagination ? data.length : paginationConfig.totalCount,
  });

  // Table-specific computed values
  const currentPageData = useMemo(() => {
    if (enableClientSidePagination) {
      return pagination.getTableData(data);
    }
    return data;
  }, [data, pagination, enableClientSidePagination]);

  const isClientSide = enableClientSidePagination && !enableServerSidePagination;
  const isServerSide = enableServerSidePagination;

  // Table-specific actions
  const handleTablePageChange = useCallback((page: number) => {
    pagination.actions.goToPage(page);
    if (onPageChange) {
      onPageChange(page, pagination.state.pageSize);
    }
  }, [pagination.actions, pagination.state.pageSize, onPageChange]);

  const handleTablePageSizeChange = useCallback((pageSize: number) => {
    pagination.actions.setPageSize(pageSize);
    if (onPageSizeChange) {
      onPageSizeChange(pageSize);
    }
  }, [pagination.actions, onPageSizeChange]);

  // Table props object
  const tableProps = useMemo(() => ({
    currentPage: pagination.state.currentPage,
    pageSize: pagination.state.pageSize,
    totalCount: pagination.state.totalCount,
    totalPages: pagination.state.totalPages,
    hasNextPage: pagination.state.hasNextPage,
    hasPrevPage: pagination.state.hasPrevPage,
    onPageChange: handleTablePageChange,
    onPageSizeChange: handleTablePageSizeChange,
    pageInfo: pagination.getPageInfo(),
  }), [
    pagination.state,
    pagination.getPageInfo,
    handleTablePageChange,
    handleTablePageSizeChange,
  ]);

  return {
    ...pagination,
    
    // Table-specific data
    currentPageData,
    isClientSide,
    isServerSide,
    
    // Table-specific actions
    handleTablePageChange,
    handleTablePageSizeChange,
    
    // Table state
    tableProps,
  };
};