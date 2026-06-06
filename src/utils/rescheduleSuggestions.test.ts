import { describe, it, expect } from 'vitest'
import { generateRescheduleSuggestions, getSuggestionsForShow } from './rescheduleSuggestions'
import type { Show, Venue, Instrument } from '../types'

describe('rescheduleSuggestions', () => {
  const baseShow: Show = {
    id: 'show1',
    tourSeasonId: 'tour1',
    city: '北京',
    venueId: 'venue1',
    venueName: '北京体育馆',
    startTime: '2024-06-15T19:30:00',
    durationMinutes: 120,
    musicianIds: ['musician1', 'musician2'],
    instrumentIds: ['instrument1']
  }

  const testInstruments: Instrument[] = [
    { id: 'instrument1', name: '架子鼓', requiresTransport: true },
    { id: 'instrument2', name: '三角钢琴', requiresTransport: true },
    { id: 'instrument3', name: '电吉他', requiresTransport: false }
  ]

  const testVenues: Venue[] = [
    {
      id: 'venue1',
      name: '北京体育馆',
      city: '北京',
      unavailableDates: ['2024-06-16', '2024-06-17']
    }
  ]

  describe('generateRescheduleSuggestions', () => {
    it('should generate suggestions without conflicts', () => {
      const overlappingShow: Show = {
        ...baseShow,
        id: 'show2',
        city: '上海',
        venueId: 'venue2',
        venueName: '上海体育馆',
        startTime: '2024-06-15T20:00:00',
        instrumentIds: ['instrument1']
      }

      const allShows = [baseShow, overlappingShow]
      const venues: Venue[] = [
        ...testVenues,
        { id: 'venue2', name: '上海体育馆', city: '上海', unavailableDates: [] }
      ]

      const suggestions = generateRescheduleSuggestions(baseShow, allShows, venues, testInstruments, 1)

      expect(suggestions.length).toBeGreaterThanOrEqual(1)
      expect(suggestions[0].remainingConflicts).toBe(0)
      expect(suggestions[0].showId).toBe('show1')
    })

    it('should return empty array when venue is not found', () => {
      const showWithInvalidVenue: Show = {
        ...baseShow,
        venueId: 'invalid_venue'
      }

      const suggestions = generateRescheduleSuggestions(showWithInvalidVenue, [baseShow], testVenues, testInstruments)
      expect(suggestions).toHaveLength(0)
    })

    it('should sort suggestions by distance from original time', () => {
      const conflictingShow: Show = {
        ...baseShow,
        id: 'show2',
        city: '天津',
        venueId: 'venue3',
        venueName: '天津体育馆',
        startTime: '2024-06-15T23:00:00',
        instrumentIds: ['instrument1']
      }

      const allShows = [baseShow, conflictingShow]
      const venues: Venue[] = [
        ...testVenues,
        { id: 'venue3', name: '天津体育馆', city: '天津', unavailableDates: [] }
      ]

      const suggestions = generateRescheduleSuggestions(baseShow, allShows, venues, testInstruments, 3)

      expect(suggestions.length).toBeGreaterThanOrEqual(2)
      const absDiff1 = Math.abs(suggestions[0].timeDiffDays)
      const absDiff2 = Math.abs(suggestions[1].timeDiffDays)
      expect(absDiff1).toBeLessThanOrEqual(absDiff2)
    })

    it('should respect transport window constraint', () => {
      const nearbyShow: Show = {
        ...baseShow,
        id: 'show2',
        city: '天津',
        venueId: 'venue3',
        venueName: '天津体育馆',
        startTime: '2024-06-18T22:00:00',
        instrumentIds: ['instrument1']
      }

      const allShows = [baseShow, nearbyShow]
      const venues: Venue[] = [
        ...testVenues,
        { id: 'venue3', name: '天津体育馆', city: '天津', unavailableDates: [] }
      ]

      const suggestions = generateRescheduleSuggestions(baseShow, allShows, venues, testInstruments, 5)

      for (const suggestion of suggestions) {
        const suggestionDate = new Date(suggestion.newStartTime)
        const nearbyDate = new Date(nearbyShow.startTime)
        const diffHours = Math.abs(suggestionDate.getTime() - nearbyDate.getTime()) / (1000 * 60 * 60)
        expect(diffHours).toBeGreaterThanOrEqual(6)
      }
    })

    it('should not include venue unavailable dates', () => {
      const venuesWithManyUnavailable: Venue[] = [
        {
          id: 'venue1',
          name: '北京体育馆',
          city: '北京',
          unavailableDates: ['2024-06-16', '2024-06-17', '2024-06-18', '2024-06-19', '2024-06-20']
        }
      ]

      const suggestions = generateRescheduleSuggestions(baseShow, [baseShow], venuesWithManyUnavailable, testInstruments, 10)

      for (const suggestion of suggestions) {
        const suggestionDate = new Date(suggestion.newStartTime)
        const dateStr = suggestionDate.toISOString().split('T')[0]
        expect(venuesWithManyUnavailable[0].unavailableDates).not.toContain(dateStr)
      }
    })
  })

  describe('getSuggestionsForShow', () => {
    it('should return suggestions for existing show', () => {
      const allShows = [baseShow]
      const venues = testVenues

      const suggestions = getSuggestionsForShow('show1', allShows, venues, testInstruments, 1)
      expect(suggestions.length).toBeGreaterThanOrEqual(1)
    })

    it('should return empty array for non-existent show', () => {
      const suggestions = getSuggestionsForShow('nonexistent', [baseShow], testVenues, testInstruments)
      expect(suggestions).toHaveLength(0)
    })
  })
})
