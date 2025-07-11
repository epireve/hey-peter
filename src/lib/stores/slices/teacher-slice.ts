import { StateCreator } from 'zustand'
import { TeacherState, TeacherFilters } from '../types'

const initialFilters: TeacherFilters = {
  search: '',
  status: null,
  availability: null,
  sortBy: 'created_at',
  sortOrder: 'desc',
  page: 1,
  pageSize: 10,
}

export const createTeacherSlice: StateCreator<
  TeacherState,
  [],
  [],
  TeacherState
> = (set) => ({
  currentTeacher: null,
  teachers: [],
  totalCount: 0,
  isLoading: false,
  error: null,
  filters: initialFilters,

  setCurrentTeacher: (teacher) =>
    set({
      currentTeacher: teacher,
      error: null,
    }),

  setTeachers: (teachers) =>
    set({
      teachers,
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