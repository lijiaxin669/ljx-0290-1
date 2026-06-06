import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { TourSeason, Show, Musician, Instrument, Venue, Conflict, TimelineViewMode, RescheduleSuggestion } from '../types'
import { detectAllConflicts } from '../utils/conflictDetector'
import { getSuggestionsForShow } from '../utils/rescheduleSuggestions'

const STORAGE_KEY = 'tour-scheduler-draft'
const STORAGE_VERSION = '1.0.1'
const RESOLVED_CONFLICTS_KEY = 'tour-scheduler-resolved-conflicts'

const mockMusicians: Musician[] = [
  { id: 'musician1', name: '张明', role: '主唱/吉他' },
  { id: 'musician2', name: '李华', role: '鼓手' },
  { id: 'musician3', name: '王芳', role: '贝斯手' },
  { id: 'musician4', name: '刘洋', role: '键盘手' },
  { id: 'musician5', name: '陈静', role: '小提琴' }
]

const mockInstruments: Instrument[] = [
  { id: 'instrument1', name: '架子鼓', requiresTransport: true },
  { id: 'instrument2', name: '低音提琴', requiresTransport: true },
  { id: 'instrument3', name: '三角钢琴', requiresTransport: true },
  { id: 'instrument4', name: '电吉他', requiresTransport: false },
  { id: 'instrument5', name: '贝斯', requiresTransport: false }
]

const mockVenues: Venue[] = [
  { id: 'venue1', name: '北京工人体育馆', city: '北京', unavailableDates: ['2024-06-20', '2024-07-15'] },
  { id: 'venue2', name: '上海梅赛德斯奔驰文化中心', city: '上海', unavailableDates: ['2024-06-25'] },
  { id: 'venue3', name: '广州天河体育馆', city: '广州', unavailableDates: [] },
  { id: 'venue4', name: '深圳湾体育中心', city: '深圳', unavailableDates: ['2024-06-21'] },
  { id: 'venue5', name: '杭州黄龙体育中心', city: '杭州', unavailableDates: [] },
  { id: 'venue6', name: '成都大魔方', city: '成都', unavailableDates: ['2024-07-10'] },
  { id: 'venue7', name: '武汉光谷国际网球中心', city: '武汉', unavailableDates: [] },
  { id: 'venue8', name: '南京青奥体育公园', city: '南京', unavailableDates: [] }
]

const mockTourSeasons: TourSeason[] = [
  { id: 'tour1', name: '2024「弦外之音」全国巡演', startDate: '2024-06-01', endDate: '2024-08-31' }
]

const mockShows: Show[] = [
  {
    id: 'show1',
    tourSeasonId: 'tour1',
    city: '北京',
    venueId: 'venue1',
    venueName: '北京工人体育馆',
    startTime: '2024-06-15T19:30:00',
    durationMinutes: 120,
    musicianIds: ['musician1', 'musician2', 'musician3', 'musician4'],
    instrumentIds: ['instrument1', 'instrument2', 'instrument4', 'instrument5']
  },
  {
    id: 'show2',
    tourSeasonId: 'tour1',
    city: '上海',
    venueId: 'venue2',
    venueName: '上海梅赛德斯奔驰文化中心',
    startTime: '2024-06-15T20:00:00',
    durationMinutes: 120,
    musicianIds: ['musician1', 'musician2', 'musician3', 'musician4'],
    instrumentIds: ['instrument1', 'instrument2', 'instrument4', 'instrument5']
  },
  {
    id: 'show3',
    tourSeasonId: 'tour1',
    city: '广州',
    venueId: 'venue3',
    venueName: '广州天河体育馆',
    startTime: '2024-06-20T19:30:00',
    durationMinutes: 120,
    musicianIds: ['musician1', 'musician2', 'musician3', 'musician5'],
    instrumentIds: ['instrument1', 'instrument2', 'instrument3', 'instrument4']
  },
  {
    id: 'show4',
    tourSeasonId: 'tour1',
    city: '深圳',
    venueId: 'venue4',
    venueName: '深圳湾体育中心',
    startTime: '2024-06-21T02:00:00',
    durationMinutes: 120,
    musicianIds: ['musician1', 'musician2', 'musician3', 'musician5'],
    instrumentIds: ['instrument1', 'instrument2', 'instrument3', 'instrument4']
  },
  {
    id: 'show5',
    tourSeasonId: 'tour1',
    city: '杭州',
    venueId: 'venue5',
    venueName: '杭州黄龙体育中心',
    startTime: '2024-06-25T19:30:00',
    durationMinutes: 120,
    musicianIds: ['musician1', 'musician2', 'musician3', 'musician4'],
    instrumentIds: ['instrument1', 'instrument2', 'instrument4', 'instrument5']
  },
  {
    id: 'show6',
    tourSeasonId: 'tour1',
    city: '成都',
    venueId: 'venue6',
    venueName: '成都大魔方',
    startTime: '2024-07-10T19:30:00',
    durationMinutes: 120,
    musicianIds: ['musician1', 'musician2', 'musician4', 'musician5'],
    instrumentIds: ['instrument1', 'instrument3', 'instrument4', 'instrument5']
  }
]

export const useTourStore = defineStore('tour', () => {
  const tourSeasons = ref<TourSeason[]>([])
  const shows = ref<Show[]>([])
  const musicians = ref<Musician[]>([])
  const instruments = ref<Instrument[]>([])
  const venues = ref<Venue[]>([])

  const selectedTourSeasonId = ref<string | null>(null)
  const selectedShowId = ref<string | null>(null)
  const expandedCities = ref<Set<string>>(new Set())
  const viewMode = ref<TimelineViewMode>('week')
  const viewStartDate = ref<Date>(new Date('2024-06-10'))
  const resolvedConflictKeys = ref<Set<string>>(new Set())

  function initializeStore() {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const data = JSON.parse(saved)
        
        if (data.version !== STORAGE_VERSION) {
          localStorage.removeItem(STORAGE_KEY)
          loadMockData()
        } else {
          tourSeasons.value = data.tourSeasons || mockTourSeasons
          shows.value = data.shows || mockShows
          selectedTourSeasonId.value = data.selectedTourSeasonId || mockTourSeasons[0]?.id || null
          if (data.expandedCities) {
            expandedCities.value = new Set(data.expandedCities)
          }
          if (data.viewMode) {
            viewMode.value = data.viewMode
          }
          if (data.viewStartDate) {
            viewStartDate.value = new Date(data.viewStartDate)
          } else if (shows.value.length > 0) {
            const sortedShows = [...shows.value].sort((a, b) => 
              new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
            )
            const firstShowDate = new Date(sortedShows[0].startTime)
            firstShowDate.setHours(0, 0, 0, 0)
            firstShowDate.setDate(firstShowDate.getDate() - 3)
            viewStartDate.value = firstShowDate
          }
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY)
        loadMockData()
      }
    } else {
      loadMockData()
    }

    musicians.value = mockMusicians
    instruments.value = mockInstruments
    venues.value = mockVenues

    const savedResolved = localStorage.getItem(RESOLVED_CONFLICTS_KEY)
    if (savedResolved) {
      try {
        const data = JSON.parse(savedResolved)
        resolvedConflictKeys.value = new Set(data)
      } catch {
        resolvedConflictKeys.value = new Set()
      }
    }
  }

  function loadMockData() {
    tourSeasons.value = mockTourSeasons
    shows.value = mockShows
    selectedTourSeasonId.value = mockTourSeasons[0]?.id || null
    
    if (mockShows.length > 0) {
      const sortedShows = [...mockShows].sort((a, b) => 
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      )
      const firstShowDate = new Date(sortedShows[0].startTime)
      firstShowDate.setHours(0, 0, 0, 0)
      firstShowDate.setDate(firstShowDate.getDate() - 3)
      viewStartDate.value = firstShowDate
    }
  }

  function saveToLocalStorage() {
    const data = {
      version: STORAGE_VERSION,
      tourSeasons: tourSeasons.value,
      shows: shows.value,
      selectedTourSeasonId: selectedTourSeasonId.value,
      expandedCities: Array.from(expandedCities.value),
      viewMode: viewMode.value,
      viewStartDate: viewStartDate.value.toISOString()
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  watch(
    [tourSeasons, shows, selectedTourSeasonId, expandedCities, viewMode, viewStartDate],
    () => {
      saveToLocalStorage()
    },
    { deep: true }
  )

  const selectedTourSeason = computed(() => {
    return tourSeasons.value.find(t => t.id === selectedTourSeasonId.value) || null
  })

  const showsByCity = computed(() => {
    if (!selectedTourSeasonId.value) return new Map<string, Show[]>()
    const map = new Map<string, Show[]>()
    const seasonShows = shows.value.filter(s => s.tourSeasonId === selectedTourSeasonId.value)
    
    for (const show of seasonShows) {
      if (!map.has(show.city)) {
        map.set(show.city, [])
      }
      map.get(show.city)!.push(show)
    }
    
    for (const cityShows of map.values()) {
      cityShows.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    }
    
    return map
  })

  const cities = computed(() => {
    return Array.from(showsByCity.value.keys()).sort()
  })

  const conflictMap = computed(() => {
    return detectAllConflicts(shows.value, venues.value, instruments.value)
  })

  const allConflicts = computed(() => {
    const conflicts: Conflict[] = []
    for (const showConflicts of conflictMap.value.values()) {
      conflicts.push(...showConflicts)
    }
    return conflicts
  })

  function getConflictKey(conflict: Conflict): string {
    return `${conflict.showId}-${conflict.type}-${conflict.relatedShowId || 'none'}-${conflict.message}`
  }

  const allConflictsWithResolved = computed(() => {
    return allConflicts.value.map(conflict => ({
      ...conflict,
      resolved: resolvedConflictKeys.value.has(getConflictKey(conflict))
    }))
  })

  const unresolvedConflicts = computed(() => {
    return allConflictsWithResolved.value.filter(c => !c.resolved)
  })

  const errorCount = computed(() => {
    return unresolvedConflicts.value.filter(c => c.severity === 'error').length
  })

  const warningCount = computed(() => {
    return unresolvedConflicts.value.filter(c => c.severity === 'warning').length
  })

  function markConflictResolved(conflict: Conflict, resolved: boolean = true) {
    const key = getConflictKey(conflict)
    const newSet = new Set(resolvedConflictKeys.value)
    if (resolved) {
      newSet.add(key)
    } else {
      newSet.delete(key)
    }
    resolvedConflictKeys.value = newSet
    localStorage.setItem(RESOLVED_CONFLICTS_KEY, JSON.stringify(Array.from(newSet)))
  }

  function getSuggestionsForShowAction(showId: string): RescheduleSuggestion[] {
    return getSuggestionsForShow(showId, shows.value, venues.value, instruments.value)
  }

  function addShow(show: Omit<Show, 'id'>) {
    const newShow: Show = {
      ...show,
      id: `show_${Date.now()}`
    }
    shows.value.push(newShow)
    ensureDateInView(new Date(newShow.startTime))
    return newShow
  }

  function updateShow(showId: string, updates: Partial<Show>) {
    const index = shows.value.findIndex(s => s.id === showId)
    if (index !== -1) {
      const newShows = [...shows.value]
      newShows[index] = { ...newShows[index], ...updates }
      shows.value = newShows
      if (updates.startTime) {
        ensureDateInView(new Date(updates.startTime))
      }
    }
  }

  function deleteShow(showId: string) {
    shows.value = shows.value.filter(s => s.id !== showId)
    if (selectedShowId.value === showId) {
      selectedShowId.value = null
    }
  }

  function getShowById(showId: string): Show | undefined {
    return shows.value.find(s => s.id === showId)
  }

  function getMusicianById(musicianId: string): Musician | undefined {
    return musicians.value.find(m => m.id === musicianId)
  }

  function getInstrumentById(instrumentId: string): Instrument | undefined {
    return instruments.value.find(i => i.id === instrumentId)
  }

  function toggleCityExpanded(city: string) {
    const newSet = new Set(expandedCities.value)
    if (newSet.has(city)) {
      newSet.delete(city)
    } else {
      newSet.add(city)
    }
    expandedCities.value = newSet
  }

  function setViewMode(mode: TimelineViewMode) {
    viewMode.value = mode
  }

  function setViewStartDate(date: Date) {
    viewStartDate.value = date
  }

  function navigateView(direction: 'prev' | 'next') {
    const days = viewMode.value === 'week' ? 7 : 30
    const delta = direction === 'prev' ? -days : days
    const newDate = new Date(viewStartDate.value)
    newDate.setDate(newDate.getDate() + delta)
    viewStartDate.value = newDate
  }

  function ensureDateInView(date: Date) {
    const days = viewMode.value === 'week' ? 7 : 30
    const viewEnd = new Date(viewStartDate.value)
    viewEnd.setDate(viewEnd.getDate() + days)
    
    const checkDate = new Date(date)
    checkDate.setHours(0, 0, 0, 0)
    
    const viewStartDay = new Date(viewStartDate.value)
    viewStartDay.setHours(0, 0, 0, 0)
    
    const viewEndDay = new Date(viewEnd)
    viewEndDay.setHours(0, 0, 0, 0)
    
    if (checkDate < viewStartDay) {
      const newStart = new Date(date)
      newStart.setDate(newStart.getDate() - 3)
      viewStartDate.value = newStart
    } else if (checkDate >= viewEndDay) {
      const newStart = new Date(date)
      newStart.setDate(newStart.getDate() - Math.floor(days / 2))
      viewStartDate.value = newStart
    }
  }

  return {
    tourSeasons,
    shows,
    musicians,
    instruments,
    venues,
    selectedTourSeasonId,
    selectedShowId,
    expandedCities,
    viewMode,
    viewStartDate,
    selectedTourSeason,
    showsByCity,
    cities,
    conflictMap,
    allConflicts,
    allConflictsWithResolved,
    unresolvedConflicts,
    errorCount,
    warningCount,
    initializeStore,
    addShow,
    updateShow,
    deleteShow,
    getShowById,
    getMusicianById,
    getInstrumentById,
    toggleCityExpanded,
    setViewMode,
    setViewStartDate,
    navigateView,
    ensureDateInView,
    markConflictResolved,
    getSuggestionsForShowAction
  }
})
