import { describe, it, expect } from 'vitest'
import {
  detectConflicts,
  checkMusicianOverlap,
  checkTransportWindow,
  checkVenueAvailability,
  detectAllConflicts
} from './conflictDetector'
import type { Show, Venue, Instrument } from '../types'

describe('conflictDetector', () => {
  const baseShow: Show = {
    id: 'show1',
    tourSeasonId: 'tour1',
    city: '北京',
    venueId: 'venue1',
    venueName: '北京体育馆',
    startTime: '2024-06-15T19:30:00',
    durationMinutes: 120,
    musicianIds: ['musician1', 'musician2'],
    instrumentIds: ['instrument1', 'instrument3']
  }

  const testInstruments: Instrument[] = [
    { id: 'instrument1', name: '架子鼓', requiresTransport: true },
    { id: 'instrument2', name: '三角钢琴', requiresTransport: true },
    { id: 'instrument3', name: '电吉他', requiresTransport: false },
    { id: 'instrument4', name: '贝斯', requiresTransport: false }
  ]

  describe('checkMusicianOverlap', () => {
    it('should detect musician overlap when shows overlap in time', () => {
      const overlappingShow: Show = {
        ...baseShow,
        id: 'show2',
        city: '上海',
        startTime: '2024-06-15T20:00:00'
      }

      const conflicts = checkMusicianOverlap(baseShow, [overlappingShow])
      expect(conflicts).toHaveLength(1)
      expect(conflicts[0].type).toBe('musician_overlap')
    })

    it('should not detect conflict when shows do not overlap', () => {
      const nonOverlappingShow: Show = {
        ...baseShow,
        id: 'show2',
        city: '上海',
        startTime: '2024-06-16T19:30:00'
      }

      const conflicts = checkMusicianOverlap(baseShow, [nonOverlappingShow])
      expect(conflicts).toHaveLength(0)
    })

    it('should not detect conflict when no shared musicians', () => {
      const noSharedMusicians: Show = {
        ...baseShow,
        id: 'show2',
        city: '上海',
        musicianIds: ['musician3']
      }

      const conflicts = checkMusicianOverlap(baseShow, [noSharedMusicians])
      expect(conflicts).toHaveLength(0)
    })
  })

  describe('checkTransportWindow', () => {
    it('should detect transport window less than 6 hours', () => {
      const shortWindowShow: Show = {
        ...baseShow,
        id: 'show2',
        city: '天津',
        startTime: '2024-06-15T23:00:00'
      }

      const conflicts = checkTransportWindow(baseShow, [shortWindowShow], testInstruments)
      expect(conflicts).toHaveLength(1)
      expect(conflicts[0].type).toBe('transport_window')
    })

    it('should not detect conflict when window is more than 6 hours', () => {
      const longWindowShow: Show = {
        ...baseShow,
        id: 'show2',
        city: '天津',
        startTime: '2024-06-16T10:00:00'
      }

      const conflicts = checkTransportWindow(baseShow, [longWindowShow], testInstruments)
      expect(conflicts).toHaveLength(0)
    })

    it('should not detect conflict when no shared instruments', () => {
      const noSharedInstruments: Show = {
        ...baseShow,
        id: 'show2',
        city: '天津',
        instrumentIds: ['instrument2']
      }

      const conflicts = checkTransportWindow(baseShow, [noSharedInstruments], testInstruments)
      expect(conflicts).toHaveLength(0)
    })

    it('should only consider instruments with requiresTransport=true', () => {
      const showWithPortableInstruments: Show = {
        ...baseShow,
        id: 'show2',
        city: '天津',
        startTime: '2024-06-15T23:00:00',
        instrumentIds: ['instrument3', 'instrument4']
      }

      const conflicts = checkTransportWindow(baseShow, [showWithPortableInstruments], testInstruments)
      expect(conflicts).toHaveLength(0)
    })

    it('should not detect transport conflict when instruments are not provided', () => {
      const shortWindowShow: Show = {
        ...baseShow,
        id: 'show2',
        city: '天津',
        startTime: '2024-06-15T23:00:00'
      }

      const conflicts = checkTransportWindow(baseShow, [shortWindowShow])
      expect(conflicts).toHaveLength(0)
    })

    it('should exclude portable instruments from shared instruments count', () => {
      const showWithMixedInstruments: Show = {
        ...baseShow,
        id: 'show2',
        city: '天津',
        startTime: '2024-06-15T23:00:00',
        instrumentIds: ['instrument1', 'instrument3', 'instrument4']
      }

      const conflicts = checkTransportWindow(baseShow, [showWithMixedInstruments], testInstruments)
      expect(conflicts).toHaveLength(1)
      expect(conflicts[0].details).toContain('1件大型乐器')
    })
  })

  describe('checkVenueAvailability', () => {
    it('should detect venue unavailable', () => {
      const venues: Venue[] = [
        {
          id: 'venue1',
          name: '北京体育馆',
          city: '北京',
          unavailableDates: ['2024-06-15']
        }
      ]

      const conflicts = checkVenueAvailability(baseShow, venues)
      expect(conflicts).toHaveLength(1)
      expect(conflicts[0].type).toBe('venue_unavailable')
    })

    it('should not detect conflict when venue is available', () => {
      const venues: Venue[] = [
        {
          id: 'venue1',
          name: '北京体育馆',
          city: '北京',
          unavailableDates: ['2024-06-16']
        }
      ]

      const conflicts = checkVenueAvailability(baseShow, venues)
      expect(conflicts).toHaveLength(0)
    })

    it('should use local date for venue availability check, not UTC', () => {
      const midnightShow: Show = {
        ...baseShow,
        id: 'show_midnight',
        venueId: 'venue4',
        startTime: '2024-06-21T02:00:00'
      }

      const venues: Venue[] = [
        {
          id: 'venue4',
          name: '深圳湾体育中心',
          city: '深圳',
          unavailableDates: ['2024-06-21']
        }
      ]

      const conflicts = checkVenueAvailability(midnightShow, venues)
      expect(conflicts).toHaveLength(1)
      expect(conflicts[0].message).toContain('2024-06-21')
    })

    it('should handle late night shows correctly with local date', () => {
      const lateNightShow: Show = {
        ...baseShow,
        id: 'show_late',
        venueId: 'venue4',
        startTime: '2024-06-21T23:30:00'
      }

      const venues: Venue[] = [
        {
          id: 'venue4',
          name: '深圳湾体育中心',
          city: '深圳',
          unavailableDates: ['2024-06-21']
        }
      ]

      const conflicts = checkVenueAvailability(lateNightShow, venues)
      expect(conflicts).toHaveLength(1)
      expect(conflicts[0].message).toContain('2024-06-21')
    })
  })

  describe('detectConflicts', () => {
    it('should return all types of conflicts', () => {
      const problematicShow: Show = {
        ...baseShow,
        id: 'show2',
        city: '上海',
        startTime: '2024-06-15T20:00:00'
      }

      const venues: Venue[] = [
        {
          id: 'venue1',
          name: '北京体育馆',
          city: '北京',
          unavailableDates: ['2024-06-15']
        }
      ]

      const conflicts = detectConflicts(baseShow, [problematicShow], venues, testInstruments)
      expect(conflicts.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('detectAllConflicts', () => {
    it('should return conflict map for all shows with conflicts', () => {
      const show1: Show = { ...baseShow }
      const show2: Show = {
        ...baseShow,
        id: 'show2',
        city: '上海',
        startTime: '2024-06-15T20:00:00'
      }
      const show3: Show = {
        ...baseShow,
        id: 'show3',
        city: '广州',
        startTime: '2024-07-01T19:30:00',
        musicianIds: ['musician3']
      }

      const venues: Venue[] = []
      const conflictMap = detectAllConflicts([show1, show2, show3], venues, testInstruments)

      expect(conflictMap.has('show1')).toBe(true)
      expect(conflictMap.has('show2')).toBe(true)
      expect(conflictMap.has('show3')).toBe(false)
    })
  })

  describe('severity field', () => {
    it('should set severity to error for musician_overlap conflicts', () => {
      const overlappingShow: Show = {
        ...baseShow,
        id: 'show2',
        city: '上海',
        startTime: '2024-06-15T20:00:00'
      }

      const conflicts = checkMusicianOverlap(baseShow, [overlappingShow])
      expect(conflicts).toHaveLength(1)
      expect(conflicts[0].severity).toBe('error')
    })

    it('should set severity to warning for transport_window conflicts', () => {
      const shortWindowShow: Show = {
        ...baseShow,
        id: 'show2',
        city: '天津',
        startTime: '2024-06-15T23:00:00'
      }

      const conflicts = checkTransportWindow(baseShow, [shortWindowShow], testInstruments)
      expect(conflicts).toHaveLength(1)
      expect(conflicts[0].severity).toBe('warning')
    })

    it('should set severity to error for venue_unavailable conflicts', () => {
      const venues: Venue[] = [
        {
          id: 'venue1',
          name: '北京体育馆',
          city: '北京',
          unavailableDates: ['2024-06-15']
        }
      ]

      const conflicts = checkVenueAvailability(baseShow, venues)
      expect(conflicts).toHaveLength(1)
      expect(conflicts[0].severity).toBe('error')
    })

    it('should include severity in detectAllConflicts results', () => {
      const show1: Show = { ...baseShow }
      const show2: Show = {
        ...baseShow,
        id: 'show2',
        city: '上海',
        startTime: '2024-06-15T20:00:00'
      }

      const venues: Venue[] = [
        {
          id: 'venue1',
          name: '北京体育馆',
          city: '北京',
          unavailableDates: ['2024-06-15']
        },
        {
          id: 'venue2',
          name: '上海体育馆',
          city: '上海',
          unavailableDates: []
        }
      ]

      const conflictMap = detectAllConflicts([show1, show2], venues, testInstruments)
      const show1Conflicts = conflictMap.get('show1') || []

      expect(show1Conflicts.length).toBeGreaterThanOrEqual(2)

      const musicianConflict = show1Conflicts.find(c => c.type === 'musician_overlap')
      expect(musicianConflict).toBeDefined()
      expect(musicianConflict?.severity).toBe('error')

      const venueConflict = show1Conflicts.find(c => c.type === 'venue_unavailable')
      expect(venueConflict).toBeDefined()
      expect(venueConflict?.severity).toBe('error')
    })
  })
})
