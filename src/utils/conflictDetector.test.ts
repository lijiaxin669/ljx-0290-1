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

  describe('transport window boundary tests', () => {
    const transportInstruments: Instrument[] = [
      { id: 'inst1', name: '架子鼓', requiresTransport: true },
      { id: 'inst2', name: '三角钢琴', requiresTransport: true },
      { id: 'inst3', name: '电吉他', requiresTransport: false }
    ]

    const createShowWithTransport = (id: string, startTime: string, instrumentIds: string[]): Show => ({
      id,
      tourSeasonId: 'tour1',
      city: '城市' + id,
      venueId: 'venue1',
      venueName: '场馆1',
      startTime,
      durationMinutes: 120,
      musicianIds: ['musician1'],
      instrumentIds
    })

    it('两场合共享 requiresTransport 乐器，间隔 5.9 小时应报警', () => {
      const showA = createShowWithTransport('showA', '2024-06-20T19:30:00', ['inst1', 'inst3'])
      const showB = createShowWithTransport('showB', '2024-06-21T03:24:00', ['inst1', 'inst2'])

      const conflicts = checkTransportWindow(showA, [showB], transportInstruments)

      expect(conflicts).toHaveLength(1)
      expect(conflicts[0].type).toBe('transport_window')
      expect(conflicts[0].severity).toBe('warning')
      expect(conflicts[0].message).toContain('5.9')
      expect(conflicts[0].details).toContain('1件大型乐器')
    })

    it('两场合共享 requiresTransport 乐器，间隔恰好 6.0 小时不报警', () => {
      const showA = createShowWithTransport('showA', '2024-06-20T19:30:00', ['inst1'])
      const showB = createShowWithTransport('showB', '2024-06-21T03:30:00', ['inst1'])

      const conflicts = checkTransportWindow(showA, [showB], transportInstruments)

      expect(conflicts).toHaveLength(0)
    })

    it('两场合共享 requiresTransport 乐器，间隔 6.1 小时不报警', () => {
      const showA = createShowWithTransport('showA', '2024-06-20T19:30:00', ['inst1'])
      const showB = createShowWithTransport('showB', '2024-06-21T03:36:00', ['inst1'])

      const conflicts = checkTransportWindow(showA, [showB], transportInstruments)

      expect(conflicts).toHaveLength(0)
    })

    it('两场合无共享 requiresTransport 乐器，间隔 1 小时不报警', () => {
      const showA = createShowWithTransport('showA', '2024-06-20T19:30:00', ['inst1'])
      const showB = createShowWithTransport('showB', '2024-06-20T22:30:00', ['inst2'])

      const conflicts = checkTransportWindow(showA, [showB], transportInstruments)

      expect(conflicts).toHaveLength(0)
    })

    it('两场合共享非运输乐器（requiresTransport=false），间隔 1 小时不报警', () => {
      const showA = createShowWithTransport('showA', '2024-06-20T19:30:00', ['inst3'])
      const showB = createShowWithTransport('showB', '2024-06-20T22:30:00', ['inst3'])

      const conflicts = checkTransportWindow(showA, [showB], transportInstruments)

      expect(conflicts).toHaveLength(0)
    })

    it('多场合共享运输乐器，应分别检测间隔', () => {
      const showMain = createShowWithTransport('main', '2024-06-20T19:30:00', ['inst1'])
      const showClose = createShowWithTransport('close', '2024-06-20T23:00:00', ['inst1'])
      const showFar = createShowWithTransport('far', '2024-06-21T08:00:00', ['inst1'])

      const conflicts = checkTransportWindow(showMain, [showClose, showFar], transportInstruments)

      expect(conflicts).toHaveLength(1)
      expect(conflicts[0].relatedShowId).toBe('close')
    })
  })

  describe('跨日午夜场与场馆 unavailableDates 校验', () => {
    const midnightVenues: Venue[] = [
      {
        id: 'venue_shenzhen',
        name: '深圳湾体育中心',
        city: '深圳',
        unavailableDates: ['2024-06-21']
      }
    ]

    it('跨日午夜场（凌晨 02:00）应匹配当日 unavailableDates', () => {
      const midnightShow: Show = {
        id: 'show_midnight',
        tourSeasonId: 'tour1',
        city: '深圳',
        venueId: 'venue_shenzhen',
        venueName: '深圳湾体育中心',
        startTime: '2024-06-21T02:00:00',
        durationMinutes: 120,
        musicianIds: ['musician1'],
        instrumentIds: ['instrument1']
      }

      const conflicts = checkVenueAvailability(midnightShow, midnightVenues)

      expect(conflicts).toHaveLength(1)
      expect(conflicts[0].type).toBe('venue_unavailable')
      expect(conflicts[0].message).toContain('2024-06-21')
    })

    it('凌晨 00:00 应匹配当日 unavailableDates', () => {
      const midnightShow: Show = {
        id: 'show_zero',
        tourSeasonId: 'tour1',
        city: '深圳',
        venueId: 'venue_shenzhen',
        venueName: '深圳湾体育中心',
        startTime: '2024-06-21T00:00:00',
        durationMinutes: 120,
        musicianIds: ['musician1'],
        instrumentIds: ['instrument1']
      }

      const conflicts = checkVenueAvailability(midnightShow, midnightVenues)

      expect(conflicts).toHaveLength(1)
      expect(conflicts[0].message).toContain('2024-06-21')
    })

    it('前一天 23:59 应匹配前一日 unavailableDates', () => {
      const lateNightShow: Show = {
        id: 'show_late',
        tourSeasonId: 'tour1',
        city: '深圳',
        venueId: 'venue_shenzhen',
        venueName: '深圳湾体育中心',
        startTime: '2024-06-20T23:59:00',
        durationMinutes: 120,
        musicianIds: ['musician1'],
        instrumentIds: ['instrument1']
      }

      const conflicts = checkVenueAvailability(lateNightShow, midnightVenues)

      expect(conflicts).toHaveLength(0)
    })

    it('show4 凌晨档与场馆 unavailableDates 同日校验（模拟真实场景）', () => {
      const show4: Show = {
        id: 'show4',
        tourSeasonId: 'tour1',
        city: '深圳',
        venueId: 'venue_shenzhen',
        venueName: '深圳湾体育中心',
        startTime: '2024-06-21T02:00:00',
        durationMinutes: 120,
        musicianIds: ['musician1', 'musician2', 'musician3', 'musician5'],
        instrumentIds: ['instrument1', 'instrument2', 'instrument3', 'instrument4']
      }

      const show3: Show = {
        id: 'show3',
        tourSeasonId: 'tour1',
        city: '广州',
        venueId: 'venue_guangzhou',
        venueName: '广州天河体育馆',
        startTime: '2024-06-20T19:30:00',
        durationMinutes: 120,
        musicianIds: ['musician1', 'musician2', 'musician3', 'musician5'],
        instrumentIds: ['instrument1', 'instrument2', 'instrument3', 'instrument4']
      }

      const allInstruments: Instrument[] = [
        { id: 'instrument1', name: '架子鼓', requiresTransport: true },
        { id: 'instrument2', name: '低音提琴', requiresTransport: true },
        { id: 'instrument3', name: '三角钢琴', requiresTransport: true },
        { id: 'instrument4', name: '电吉他', requiresTransport: false }
      ]

      const allVenues: Venue[] = [
        ...midnightVenues,
        {
          id: 'venue_guangzhou',
          name: '广州天河体育馆',
          city: '广州',
          unavailableDates: []
        }
      ]

      const conflicts = detectConflicts(show4, [show3, show4], allVenues, allInstruments)

      const venueConflict = conflicts.find(c => c.type === 'venue_unavailable')
      expect(venueConflict).toBeDefined()
      expect(venueConflict?.severity).toBe('error')

      const transportConflict = conflicts.find(c => c.type === 'transport_window')
      expect(transportConflict).toBeDefined()
      expect(transportConflict?.severity).toBe('warning')
      expect(transportConflict?.message).toContain('4.5')

      const musicianConflict = conflicts.find(c => c.type === 'musician_overlap')
      expect(musicianConflict).toBeUndefined()
    })
  })

  describe('detectAllConflicts 双向检测', () => {
    it('乐手撞档应双向检测（show1 vs show2 和 show2 vs show1）', () => {
      const show1: Show = {
        ...baseShow,
        id: 'show1'
      }
      const show2: Show = {
        ...baseShow,
        id: 'show2',
        city: '上海',
        startTime: '2024-06-15T20:00:00'
      }

      const conflictMap = detectAllConflicts([show1, show2], [], testInstruments)

      expect(conflictMap.has('show1')).toBe(true)
      expect(conflictMap.has('show2')).toBe(true)

      const show1Conflicts = conflictMap.get('show1') || []
      const show2Conflicts = conflictMap.get('show2') || []

      expect(show1Conflicts.find(c => c.type === 'musician_overlap')).toBeDefined()
      expect(show2Conflicts.find(c => c.type === 'musician_overlap')).toBeDefined()
    })
  })
})
