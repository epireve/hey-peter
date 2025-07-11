import { StateCreator } from 'zustand'
import { StudentState, StudentFilters } from '../types'

const initialFilters: StudentFilters = {
  search: '',
  status: null,
  courseType: null,
  teacherId: null,
  sortBy: 'created_at',
  sortOrder: 'desc',
  page: 1,
  pageSize: 10,
}

export const createStudentSlice: StateCreator<
  StudentState,
  [],
  [],
  StudentState
> = (set) => ({
  currentStudent: null,
  students: [],
  totalCount: 0,
  isLoading: false,
  error: null,
  filters: initialFilters,

  setCurrentStudent: (student) =>
    set({
      currentStudent: student,
      error: null,
    }),

  setStudents: (students) =>
    set({
      students,
      isLoading: false,
      error: null,
    }),

  setTotalCount: (count) =>
    set({
      totalCount: count,
    }),

  setLoading: (loading) =>
    set({
      isLoading: loading,
      error: loading ? null : undefined,
    }),

  setError: (error) =>
    set({
      error,
      isLoading: false,
    }),

  setFilters: (newFilters) =>
    set((state) => ({
      filters: {
        ...state.filters,
        ...newFilters,
      },
    })),

  resetFilters: () =>
    set({
      filters: initialFilters,
    }),
})