import type { Show, Venue, Conflict, Instrument } from '../types'
import { getConflictSeverity } from '../types'

const TRANSPORT_WINDOW_HOURS = 6

function getTransportInstrumentIds(show: Show, instruments?: Instrument[]): string[] {
  if (!instruments || instruments.length === 0) {
    return []
  }
  const transportIds = new Set(
    instruments.filter(i => i.requiresTransport).map(i => i.id)
  )
  return show.instrumentIds.filter(id => transportIds.has(id))
}

export function detectConflicts(
  show: Show,
  allShows: Show[],
  venues: Venue[],
  instruments?: Instrument[]
): Conflict[] {
  const conflicts: Conflict[] = []
  const otherShows = allShows.filter(s => s.id !== show.id)

  conflicts.push(...checkMusicianOverlap(show, otherShows))
  conflicts.push(...checkTransportWindow(show, otherShows, instruments))
  conflicts.push(...checkVenueAvailability(show, venues))

  return conflicts
}

export function checkMusicianOverlap(show: Show, otherShows: Show[]): Conflict[] {
  const conflicts: Conflict[] = []
  const showStart = new Date(show.startTime)
  const showEnd = new Date(showStart.getTime() + show.durationMinutes * 60000)

  for (const other of otherShows) {
    const otherStart = new Date(other.startTime)
    const otherEnd = new Date(otherStart.getTime() + other.durationMinutes * 60000)

    const overlappingMusicians = show.musicianIds.filter(id =>
      other.musicianIds.includes(id)
    )

    if (overlappingMusicians.length > 0 && isTimeOverlap(showStart, showEnd, otherStart, otherEnd)) {
      conflicts.push({
        type: 'musician_overlap',
        showId: show.id,
        relatedShowId: other.id,
        message: `乐手撞档：与「${other.city}」场时间重叠`,
        details: `冲突乐手：${overlappingMusicians.length}人，重叠时间：${formatTime(showStart)} - ${formatTime(showEnd)}`,
        severity: getConflictSeverity('musician_overlap')
      })
    }
  }

  return conflicts
}

export function checkTransportWindow(
  show: Show,
  otherShows: Show[],
  instruments?: Instrument[]
): Conflict[] {
  const conflicts: Conflict[] = []
  const showStart = new Date(show.startTime)
  const showEnd = new Date(showStart.getTime() + show.durationMinutes * 60000)
  const transportInstruments = getTransportInstrumentIds(show, instruments)

  if (transportInstruments.length === 0) return conflicts

  for (const other of otherShows) {
    const otherStart = new Date(other.startTime)
    const otherEnd = new Date(otherStart.getTime() + other.durationMinutes * 60000)
    const otherTransportInstruments = getTransportInstrumentIds(other, instruments)

    const sharedInstruments = transportInstruments.filter(id =>
      otherTransportInstruments.includes(id)
    )

    if (sharedInstruments.length > 0) {
      const windowBefore = Math.abs(showStart.getTime() - otherEnd.getTime()) / 3600000
      const windowAfter = Math.abs(otherStart.getTime() - showEnd.getTime()) / 3600000
      const minWindow = Math.min(windowBefore, windowAfter)

      if (minWindow < TRANSPORT_WINDOW_HOURS) {
        const direction = windowBefore < windowAfter ? '本场前' : '本场后'
        conflicts.push({
          type: 'transport_window',
          showId: show.id,
          relatedShowId: other.id,
          message: `运输窗口不足：与「${other.city}」场仅间隔 ${minWindow.toFixed(1)} 小时`,
          details: `${direction}需预留至少 ${TRANSPORT_WINDOW_HOURS} 小时运输时间，涉及${sharedInstruments.length}件大型乐器`,
          severity: getConflictSeverity('transport_window')
        })
      }
    }
  }

  return conflicts
}

export function checkVenueAvailability(show: Show, venues: Venue[]): Conflict[] {
  const conflicts: Conflict[] = []
  const venue = venues.find(v => v.id === show.venueId)

  if (!venue) return conflicts

  const showDate = formatDateForAvailability(new Date(show.startTime))

  if (venue.unavailableDates.includes(showDate)) {
    conflicts.push({
      type: 'venue_unavailable',
      showId: show.id,
      message: `场馆不可用：「${venue.name}」在 ${showDate} 已标记为不可用`,
      details: `该场馆在选定日期已有其他安排，请更换日期或场馆`,
      severity: getConflictSeverity('venue_unavailable')
    })
  }

  return conflicts
}

function isTimeOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return start1 < end2 && start2 < end1
}

function formatTime(date: Date): string {
  return date.toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatDateForAvailability(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function detectAllConflicts(
  shows: Show[],
  venues: Venue[],
  instruments?: Instrument[]
): Map<string, Conflict[]> {
  const conflictMap = new Map<string, Conflict[]>()

  for (const show of shows) {
    const conflicts = detectConflicts(show, shows, venues, instruments)
    if (conflicts.length > 0) {
      conflictMap.set(show.id, conflicts)
    }
  }

  return conflictMap
}
