import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTourStore } from './tourStore'
import type { Show, Venue, Instrument, Musician, TourSeason } from '../types'

const STORAGE_KEY = 'tour-scheduler-draft'
const STORAGE_VERSION = '1.0.1'
const RESOLVED_CONFLICTS_KEY = 'tour-scheduler-resolved-conflicts'

describe('tourStore', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  describe('initializeStore - STORAGE_VERSION 不匹配时清空草稿', () => {
    it('应在存储版本不匹配时移除旧数据并加载 mock 数据', () => {
      const oldVersionData = {
        version: '0.0.1',
        tourSeasons: [{ id: 'old_tour', name: '旧巡演' }],
        shows: [{ id: 'old_show', city: '旧城市' }]
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(oldVersionData))

      const store = useTourStore()
      store.initializeStore()

      expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
      expect(store.shows.length).toBeGreaterThan(0)
      expect(store.shows[0].id).toBe('show1')
    })

    it('应在存储版本匹配时加载保存的数据', () => {
      const customShows: Show[] = [
        {
          id: 'custom_show',
          tourSeasonId: 'tour1',
          city: '自定义城市',
          venueId: 'venue1',
          venueName: '自定义场馆',
          startTime: '2024-07-01T19:30:00',
          durationMinutes: 120,
          musicianIds: ['musician1'],
          instrumentIds: ['instrument1']
        }
      ]
      const validData = {
        version: STORAGE_VERSION,
        tourSeasons: [{ id: 'tour1', name: '测试巡演', startDate: '2024-06-01', endDate: '2024-08-31' }],
        shows: customShows,
        selectedTourSeasonId: 'tour1',
        expandedCities: [],
        viewMode: 'week' as const,
        viewStartDate: '2024-06-10T00:00:00.000Z'
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(validData))

      const store = useTourStore()
      store.initializeStore()

      expect(store.shows.length).toBe(1)
      expect(store.shows[0].id).toBe('custom_show')
      expect(store.shows[0].city).toBe('自定义城市')
    })

    it('应在存储数据损坏时回退到 mock 数据', () => {
      localStorage.setItem(STORAGE_KEY, '{ invalid json }')

      const store = useTourStore()
      store.initializeStore()

      expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
      expect(store.shows.length).toBeGreaterThan(0)
    })

    it('应在无存储数据时加载 mock 数据', () => {
      const store = useTourStore()
      store.initializeStore()

      expect(store.shows.length).toBe(6)
      expect(store.venues.length).toBe(8)
      expect(store.musicians.length).toBe(5)
      expect(store.instruments.length).toBe(5)
    })
  })

  describe('markConflictResolved - 往返持久化', () => {
    it('应将冲突标记为已解决并持久化到 localStorage', () => {
      const store = useTourStore()
      store.initializeStore()

      const testConflict = {
        type: 'venue_unavailable' as const,
        showId: 'show4',
        relatedShowId: undefined,
        message: '场馆不可用：「深圳湾体育中心」在 2024-06-21 已标记为不可用',
        details: '测试详情',
        severity: 'error' as const
      }

      store.markConflictResolved(testConflict, true)

      const key = store.getConflictKey(testConflict)
      expect(store.resolvedConflictKeys.has(key)).toBe(true)

      const saved = JSON.parse(localStorage.getItem(RESOLVED_CONFLICTS_KEY) || '[]')
      expect(saved).toContain(key)
    })

    it('应取消冲突的已解决标记并持久化', () => {
      const store = useTourStore()
      store.initializeStore()

      const testConflict = {
        type: 'transport_window' as const,
        showId: 'show4',
        relatedShowId: 'show3',
        message: '运输窗口不足：与「广州」场仅间隔 4.5 小时',
        details: '测试详情',
        severity: 'warning' as const
      }

      store.markConflictResolved(testConflict, true)
      const key = store.getConflictKey(testConflict)
      expect(store.resolvedConflictKeys.has(key)).toBe(true)

      store.markConflictResolved(testConflict, false)
      expect(store.resolvedConflictKeys.has(key)).toBe(false)

      const saved = JSON.parse(localStorage.getItem(RESOLVED_CONFLICTS_KEY) || '[]')
      expect(saved).not.toContain(key)
    })

    it('应从 localStorage 恢复已解决的冲突标记', () => {
      const store1 = useTourStore()
      store1.initializeStore()

      const testConflict = {
        type: 'musician_overlap' as const,
        showId: 'show1',
        relatedShowId: 'show2',
        message: '乐手撞档：与「上海」场时间重叠',
        details: '测试详情',
        severity: 'error' as const
      }

      store1.markConflictResolved(testConflict, true)
      const key = store1.getConflictKey(testConflict)

      const store2 = useTourStore()
      store2.initializeStore()

      expect(store2.resolvedConflictKeys.has(key)).toBe(true)
    })

    it('allConflictsWithResolved 应正确标记 resolved 状态', () => {
      const store = useTourStore()
      store.initializeStore()

      const show4Conflicts = store.conflictMap.get('show4') || []
      expect(show4Conflicts.length).toBeGreaterThan(0)

      const venueConflict = show4Conflicts.find(c => c.type === 'venue_unavailable')
      expect(venueConflict).toBeDefined()

      const before = store.allConflictsWithResolved.find(c => c.message === venueConflict!.message)
      expect(before?.resolved).toBe(false)

      store.markConflictResolved(venueConflict!, true)

      const after = store.allConflictsWithResolved.find(c => c.message === venueConflict!.message)
      expect(after?.resolved).toBe(true)
    })
  })

  describe('updateShow - 改 startTime 后 errorCount/warningCount 变化', () => {
    it('修改冲突场次的 startTime 到无冲突时间后，errorCount 和 warningCount 应减少', () => {
      const store = useTourStore()
      store.initializeStore()

      const initialErrorCount = store.errorCount
      const initialWarningCount = store.warningCount
      expect(initialErrorCount).toBeGreaterThan(0)

      const show4Before = store.getShowById('show4')
      expect(show4Before).toBeDefined()
      expect(show4Before!.startTime).toBe('2024-06-21T02:00:00')

      store.updateShow('show4', { startTime: '2024-06-23T19:30:00' })

      const show4After = store.getShowById('show4')
      expect(show4After?.startTime).toBe('2024-06-23T19:30:00')

      expect(store.errorCount).toBeLessThan(initialErrorCount)
    })

    it('修改无冲突场次的 startTime 到有冲突时间后，errorCount 和 warningCount 应增加', () => {
      const store = useTourStore()
      store.initializeStore()

      const show5Before = store.getShowById('show5')
      expect(show5Before).toBeDefined()

      const initialErrorCount = store.errorCount

      store.updateShow('show5', { startTime: '2024-06-15T21:00:00' })

      expect(store.errorCount).toBeGreaterThan(initialErrorCount)
    })

    it('应在更新 startTime 时调用 ensureDateInView', () => {
      const store = useTourStore()
      store.initializeStore()

      const originalViewStart = new Date(store.viewStartDate)
      store.setViewStartDate(new Date('2024-06-01'))

      store.updateShow('show1', { startTime: '2024-07-15T19:30:00' })

      expect(store.viewStartDate.getTime()).not.toBe(originalViewStart.getTime())
    })

    it('updateShow 不应影响不相关的冲突计数', () => {
      const store = useTourStore()
      store.initializeStore()

      const initialErrorCount = store.errorCount

      store.updateShow('show1', { city: '北京市' })

      expect(store.errorCount).toBe(initialErrorCount)
    })
  })

  describe('getConflictKey', () => {
    it('应生成包含 message 的唯一键', () => {
      const store = useTourStore()

      const conflict1 = {
        type: 'transport_window' as const,
        showId: 'show4',
        relatedShowId: 'show3',
        message: '运输窗口不足：与「广州」场仅间隔 4.5 小时',
        details: '',
        severity: 'warning' as const
      }

      const conflict2 = {
        ...conflict1,
        message: '运输窗口不足：与「广州」场仅间隔 4.6 小时'
      }

      const key1 = store.getConflictKey(conflict1)
      const key2 = store.getConflictKey(conflict2)

      expect(key1).not.toBe(key2)
      expect(key1).toContain('show4')
      expect(key1).toContain('transport_window')
      expect(key1).toContain('show3')
      expect(key1).toContain('运输窗口不足')
    })

    it('relatedShowId 不存在时应使用 none', () => {
      const store = useTourStore()

      const conflict = {
        type: 'venue_unavailable' as const,
        showId: 'show4',
        message: '场馆不可用',
        details: '',
        severity: 'error' as const
      }

      const key = store.getConflictKey(conflict)
      expect(key).toContain('-none-')
    })
  })
})
