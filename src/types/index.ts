export interface Musician {
  id: string
  name: string
  role: string
}

export interface Instrument {
  id: string
  name: string
  requiresTransport: boolean
}

export interface Venue {
  id: string
  name: string
  city: string
  unavailableDates: string[]
}

export interface Show {
  id: string
  tourSeasonId: string
  city: string
  venueId: string
  venueName: string
  startTime: string
  durationMinutes: number
  musicianIds: string[]
  instrumentIds: string[]
}

export interface TourSeason {
  id: string
  name: string
  startDate: string
  endDate: string
}

export type ConflictType = 'musician_overlap' | 'transport_window' | 'venue_unavailable'

export interface Conflict {
  type: ConflictType
  showId: string
  relatedShowId?: string
  message: string
  details: string
  severity?: 'error' | 'warning'
  resolved?: boolean
}

export interface RescheduleSuggestion {
  showId: string
  newStartTime: string
  originalStartTime: string
  timeDiffDays: number
  remainingConflicts: number
  conflicts: Conflict[]
}

export function getConflictTypeLabel(type: ConflictType): string {
  switch (type) {
    case 'musician_overlap':
      return '乐手撞档'
    case 'transport_window':
      return '运输窗口'
    case 'venue_unavailable':
      return '场馆不可用'
    default:
      return type
  }
}

export function getConflictSeverity(type: ConflictType): 'error' | 'warning' {
  switch (type) {
    case 'musician_overlap':
    case 'venue_unavailable':
      return 'error'
    case 'transport_window':
      return 'warning'
    default:
      return 'warning'
  }
}

export type TimelineViewMode = 'week' | 'month'

export interface DragState {
  isDragging: boolean
  showId: string | null
  startX: number
  originalStartTime: string
}
