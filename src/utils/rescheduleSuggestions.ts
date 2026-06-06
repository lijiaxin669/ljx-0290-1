import type { Show, Venue, Instrument, RescheduleSuggestion } from '../types'
import { detectConflicts } from './conflictDetector'

const TRANSPORT_WINDOW_HOURS = 6
const MAX_SEARCH_DAYS = 30
const MAX_SUGGESTIONS = 3

function formatDateForAvailability(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isVenueAvailable(venue: Venue, date: Date): boolean {
  const dateStr = formatDateForAvailability(date)
  return !venue.unavailableDates.includes(dateStr)
}

function satisfiesTransportWindow(
  show: Show, candidateTime: Date, otherShows: Show[], instruments: Instrument[]
): boolean {
  const candidateEnd = new Date(candidateTime.getTime() + show.durationMinutes * 60000)
  const candidateStart = candidateTime

  const transportInstruments = new Set(
    instruments.filter(i => i.requiresTransport).map(i => i.id)
  )
  const showTransportInstruments = show.instrumentIds.filter(id => transportInstruments.has(id))

  if (showTransportInstruments.length === 0) return true

  for (const other of otherShows) {
    if (other.id === show.id) continue

    const otherTransportInstruments = other.instrumentIds.filter(id => transportInstruments.has(id))
    const sharedInstruments = showTransportInstruments.filter(id => otherTransportInstruments.includes(id))

    if (sharedInstruments.length === 0) continue

    const otherStart = new Date(other.startTime)
    const otherEnd = new Date(otherStart.getTime() + other.durationMinutes * 60000)

    const windowBefore = Math.abs(candidateStart.getTime() - otherEnd.getTime()) / 3600000
    const windowAfter = Math.abs(otherStart.getTime() - candidateEnd.getTime()) / 3600000
    const minWindow = Math.min(windowBefore, windowAfter)

    if (minWindow < TRANSPORT_WINDOW_HOURS) {
      return false
    }
  }

  return true
}

function calculateTimeDiffDays(originalTime: string, newTime: string): number {
  const original = new Date(originalTime)
  const newDate = new Date(newTime)
  const diffMs = newDate.getTime() - original.getTime()
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

export function generateRescheduleSuggestions(
  show: Show,
  allShows: Show[],
  venues: Venue[],
  instruments: Instrument[],
  maxSuggestions: number = MAX_SUGGESTIONS
): RescheduleSuggestion[] {
  const suggestions: RescheduleSuggestion[] = []
  const originalTime = new Date(show.startTime)
  const venue = venues.find(v => v.id === show.venueId)

  if (!venue) return []

  const otherShows = allShows.filter(s => s.id !== show.id)
  const seasonShows = allShows.filter(s => s.tourSeasonId === show.tourSeasonId && s.id !== show.id)

  const candidateTimes: Date[] = []

  for (let dayOffset = 1; dayOffset <= MAX_SEARCH_DAYS; dayOffset++) {
    for (const direction of [1, -1]) {
      const candidateDate = new Date(originalTime)
      candidateDate.setDate(candidateDate.getDate() + direction * dayOffset)
      candidateDate.setHours(originalTime.getHours(), originalTime.getMinutes(), 0, 0)

      if (!isVenueAvailable(venue, candidateDate)) continue

      if (!satisfiesTransportWindow(show, candidateDate, seasonShows, instruments)) continue

      const tempShow: Show = {
        ...show,
        startTime: candidateDate.toISOString()
      }

      const conflicts = detectConflicts(tempShow, allShows, venues, instruments)

      if (conflicts.length === 0) {
        candidateTimes.push(candidateDate)
        if (candidateTimes.length >= maxSuggestions * 3) break
      }
    }
    if (candidateTimes.length >= maxSuggestions * 3) break
  }

  candidateTimes.sort((a, b) => {
    const diffA = Math.abs(a.getTime() - originalTime.getTime())
    const diffB = Math.abs(b.getTime() - originalTime.getTime())
    return diffA - diffB
  })

  for (const candidateTime of candidateTimes.slice(0, maxSuggestions)) {
    const tempShow: Show = {
      ...show,
      startTime: candidateTime.toISOString()
    }

    const conflicts = detectConflicts(tempShow, allShows, venues, instruments)

    suggestions.push({
      showId: show.id,
      newStartTime: candidateTime.toISOString(),
      originalStartTime: show.startTime,
      timeDiffDays: calculateTimeDiffDays(show.startTime, candidateTime.toISOString()),
      remainingConflicts: conflicts.length,
      conflicts
    })

    if (suggestions.length >= maxSuggestions) break
  }

  return suggestions
}

export function getSuggestionsForShow(
  showId: string,
  allShows: Show[],
  venues: Venue[],
  instruments: Instrument[],
  maxSuggestions: number = MAX_SUGGESTIONS
): RescheduleSuggestion[] {
  const show = allShows.find(s => s.id === showId)
  if (!show) return []
  return generateRescheduleSuggestions(show, allShows, venues, instruments, maxSuggestions)
}
