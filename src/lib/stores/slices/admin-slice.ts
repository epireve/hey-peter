import { StateCreator } from 'zustand'
import { AdminState, DashboardStats, SystemSettings } from '../types'

export const createAdminSlice: StateCreator<
  AdminState,
  [],
  [],
  AdminState
> = (set) => ({
  // Dashboard stats
  dashboardStats: null,
  statsLoading: false,
  statsError: null,

  setDashboardStats: (stats) =>
    set({
      dashboardStats: stats,
      statsLoading: false,
      statsError: null,
    }),

  setStatsLoading: (loading) =>
    set({
      statsLoading: loading,
      statsError: loading ? null : undefined,
    }),

  setStatsError: (error) =>
    set({
      statsError: error,
      statsLoading: false,
    }),

  // Analytics
  analyticsData: null,
  analyticsRange: {
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    end: new Date(),
  },
  analyticsLoading: false,

  setAnalyticsData: (data) =>
    set({
      analyticsData: data,
      analyticsLoading: false,
    }),

  setAnalyticsRange: (range) =>
    set({
      analyticsRange: range,
    }),

  setAnalyticsLoading: (loading) =>
    set({
      analyticsLoading: loading,
    }),

  // System settings
  systemSettings: null,
  settingsLoading: false,

  setSystemSettings: (settings) =>
    set({
      systemSettings: settings,
      settingsLoading: false,
    }),

  setSettingsLoading: (loading) =>
    set({
      settingsLoading: loading,
    }),
})