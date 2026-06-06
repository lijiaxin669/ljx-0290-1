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

  describe('generateRescheduleSuggestions - 表驱动测试', () => {
    interface SuggestionTestCase {
      name: string
      originalShow: Show
      otherShows: Show[]
      venues: Venue[]
      instruments: Instrument[]
      maxSuggestions: number
      expectedMinCount: number
      expectedMaxCount: number
      assertOrder?: boolean
      assertBlacklistSkip?: string[]
    }

    const baseInstrument: Instrument = { id: 'inst1', name: '架子鼓', requiresTransport: true }
    const baseVenue: Venue = {
      id: 'venue1',
      name: '测试场馆',
      city: '测试城市',
      unavailableDates: []
    }

    const createShow = (id: string, startTime: string, instrumentIds: string[] = ['inst1']): Show => ({
      id,
      tourSeasonId: 'tour1',
      city: '城市' + id,
      venueId: 'venue1',
      venueName: '测试场馆',
      startTime,
      durationMinutes: 120,
      musicianIds: ['musician1'],
      instrumentIds
    })

    const testCases: SuggestionTestCase[] = [
      {
        name: '候选按距原时间最近排序',
        originalShow: createShow('show_main', '2024-06-15T19:30:00'),
        otherShows: [
          createShow('show_near', '2024-06-18T19:30:00'),
          createShow('show_far', '2024-06-25T19:30:00')
        ],
        venues: [{ ...baseVenue, unavailableDates: ['2024-06-16', '2024-06-17'] }],
        instruments: [baseInstrument],
        maxSuggestions: 5,
        expectedMinCount: 3,
        expectedMaxCount: 5,
        assertOrder: true
      },
      {
        name: '最多返回 3 条建议',
        originalShow: createShow('show_main', '2024-07-01T19:30:00'),
        otherShows: [],
        venues: [baseVenue],
        instruments: [baseInstrument],
        maxSuggestions: 3,
        expectedMinCount: 3,
        expectedMaxCount: 3
      },
      {
        name: '最多返回 1 条建议',
        originalShow: createShow('show_main', '2024-07-01T19:30:00'),
        otherShows: [],
        venues: [baseVenue],
        instruments: [baseInstrument],
        maxSuggestions: 1,
        expectedMinCount: 1,
        expectedMaxCount: 1
      },
      {
        name: '场馆 blacklist 日期被跳过 - 单日',
        originalShow: createShow('show_main', '2024-06-15T19:30:00'),
        otherShows: [],
        venues: [{ ...baseVenue, unavailableDates: ['2024-06-16'] }],
        instruments: [baseInstrument],
        maxSuggestions: 5,
        expectedMinCount: 3,
        expectedMaxCount: 5,
        assertBlacklistSkip: ['2024-06-16']
      },
      {
        name: '场馆 blacklist 日期被跳过 - 多日连续',
        originalShow: createShow('show_main', '2024-06-15T19:30:00'),
        otherShows: [],
        venues: [{ ...baseVenue, unavailableDates: ['2024-06-16', '2024-06-17', '2024-06-18', '2024-06-19', '2024-06-20'] }],
        instruments: [baseInstrument],
        maxSuggestions: 3,
        expectedMinCount: 3,
        expectedMaxCount: 3,
        assertBlacklistSkip: ['2024-06-16', '2024-06-17', '2024-06-18', '2024-06-19', '2024-06-20']
      }
    ]

    testCases.forEach((tc) => {
      it(tc.name, () => {
        const allShows = [tc.originalShow, ...tc.otherShows]
        const suggestions = generateRescheduleSuggestions(
          tc.originalShow,
          allShows,
          tc.venues,
          tc.instruments,
          tc.maxSuggestions
        )

        expect(suggestions.length).toBeGreaterThanOrEqual(tc.expectedMinCount)
        expect(suggestions.length).toBeLessThanOrEqual(tc.expectedMaxCount)

        if (tc.assertOrder) {
          for (let i = 0; i < suggestions.length - 1; i++) {
            const diffA = Math.abs(suggestions[i].timeDiffDays)
            const diffB = Math.abs(suggestions[i + 1].timeDiffDays)
            expect(diffA).toBeLessThanOrEqual(diffB)
          }
        }

        if (tc.assertBlacklistSkip) {
          const suggestionDates = suggestions.map(s => s.newStartTime.split('T')[0])
          tc.assertBlacklistSkip.forEach(blacklistedDate => {
            expect(suggestionDates).not.toContain(blacklistedDate)
          })
        }

        suggestions.forEach(s => {
          expect(s.showId).toBe(tc.originalShow.id)
          expect(s.originalStartTime).toBe(tc.originalShow.startTime)
        })
      })
    })

    it('候选排序验证：按距原时间最近排序（绝对值递增）', () => {
      const originalShow = createShow('show_main', '2024-06-15T19:30:00')
      const conflictingShow = createShow('show_conflict', '2024-06-15T20:00:00')
      const venues = [{ ...baseVenue, unavailableDates: [] }]

      const suggestions = generateRescheduleSuggestions(
        originalShow,
        [originalShow, conflictingShow],
        venues,
        [baseInstrument],
        5
      )

      expect(suggestions.length).toBeGreaterThanOrEqual(3)

      for (let i = 0; i < suggestions.length - 1; i++) {
        const diffA = Math.abs(suggestions[i].timeDiffDays)
        const diffB = Math.abs(suggestions[i + 1].timeDiffDays)
        expect(diffA).toBeLessThanOrEqual(diffB)
      }

      expect(Math.abs(suggestions[0].timeDiffDays)).toBe(1)
      expect(Math.abs(suggestions[1].timeDiffDays)).toBeGreaterThanOrEqual(1)
      expect(Math.abs(suggestions[2].timeDiffDays)).toBeGreaterThanOrEqual(2)
    })

    it('候选时间与原时间相同日期时，timeDiffDays 应为 0', () => {
      const originalShow = createShow('show_main', '2024-07-01T19:30:00')
      const venues = [baseVenue]

      const suggestions = generateRescheduleSuggestions(
        originalShow,
        [originalShow],
        venues,
        [baseInstrument],
        5
      )

      const sameDaySuggestion = suggestions.find(s => {
        const origDate = originalShow.startTime.split('T')[0]
        const newDate = s.newStartTime.split('T')[0]
        return origDate === newDate
      })

      if (sameDaySuggestion) {
        expect(sameDaySuggestion.timeDiffDays).toBe(0)
      }
    })
  })

  describe('generateRescheduleSuggestions - 边界场景', () => {
    it('原时间无冲突时，第一条建议 timeDiffDays 绝对值应最小', () => {
      const originalShow: Show = {
        id: 'show1',
        tourSeasonId: 'tour1',
        city: '北京',
        venueId: 'venue1',
        venueName: '北京体育馆',
        startTime: '2024-07-01T19:30:00',
        durationMinutes: 120,
        musicianIds: ['musician1'],
        instrumentIds: ['instrument1']
      }
      const venues: Venue[] = [
        { id: 'venue1', name: '北京体育馆', city: '北京', unavailableDates: [] }
      ]
      const instruments: Instrument[] = [
        { id: 'instrument1', name: '架子鼓', requiresTransport: true }
      ]

      const suggestions = generateRescheduleSuggestions(originalShow, [originalShow], venues, instruments, 3)

      expect(suggestions.length).toBeGreaterThanOrEqual(3)
      expect(Math.abs(suggestions[0].timeDiffDays)).toBe(1)
      expect(suggestions[0].remainingConflicts).toBe(0)
    })

    it('跨赛季场次不影响同赛季运输窗口初步筛选', () => {
      const sameSeasonShow: Show = {
        id: 'show_same',
        tourSeasonId: 'tour1',
        city: '天津',
        venueId: 'venue2',
        venueName: '天津体育馆',
        startTime: '2024-06-18T19:30:00',
        durationMinutes: 120,
        musicianIds: ['musician2'],
        instrumentIds: ['instrument1']
      }
      const crossSeasonShow: Show = {
        id: 'show_cross',
        tourSeasonId: 'tour2',
        city: '唐山',
        venueId: 'venue3',
        venueName: '唐山体育馆',
        startTime: '2024-06-16T19:30:00',
        durationMinutes: 120,
        musicianIds: ['musician3'],
        instrumentIds: ['instrument1']
      }
      const originalShow: Show = {
        id: 'show_main',
        tourSeasonId: 'tour1',
        city: '北京',
        venueId: 'venue1',
        venueName: '北京体育馆',
        startTime: '2024-06-15T19:30:00',
        durationMinutes: 120,
        musicianIds: ['musician1'],
        instrumentIds: ['instrument1']
      }

      const venues: Venue[] = [
        { id: 'venue1', name: '北京体育馆', city: '北京', unavailableDates: [] },
        { id: 'venue2', name: '天津体育馆', city: '天津', unavailableDates: [] },
        { id: 'venue3', name: '唐山体育馆', city: '唐山', unavailableDates: [] }
      ]
      const instruments: Instrument[] = [
        { id: 'instrument1', name: '架子鼓', requiresTransport: true }
      ]

      const allShows = [originalShow, sameSeasonShow, crossSeasonShow]
      const suggestions = generateRescheduleSuggestions(originalShow, allShows, venues, instruments, 3)

      expect(suggestions.length).toBeGreaterThanOrEqual(1)
    })
  })
})
