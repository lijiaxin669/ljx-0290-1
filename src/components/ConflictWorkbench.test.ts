import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ConflictWorkbench from './ConflictWorkbench.vue'
import { useTourStore } from '../stores/tourStore'

describe('ConflictWorkbench.vue', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    localStorage.clear()
    pinia = createPinia()
    setActivePinia(pinia)
  })

  function createWrapper() {
    const store = useTourStore()
    store.initializeStore()

    return mount(ConflictWorkbench, {
      global: {
        plugins: [pinia],
        stubs: {
          ChevronLeft: { template: '<span class="chevron-left" />' },
          ChevronRight: { template: '<span class="chevron-right" />' },
          AlertTriangle: { template: '<span class="alert-triangle" />' },
          AlertCircle: { template: '<span class="alert-circle" />' },
          Check: { template: '<span class="check" />' },
          X: { template: '<span class="x" />' },
          Filter: { template: '<span class="filter" />' },
          Clock: { template: '<span class="clock" />' },
          MapPin: { template: '<span class="map-pin" />' }
        }
      },
      props: {}
    })
  }

  describe('Tab 切换过滤', () => {
    it('默认显示全部 Tab', () => {
      const wrapper = createWrapper()
      const tabs = wrapper.findAll('button')
      const allTab = tabs.find(t => t.text().includes('全部'))
      expect(allTab?.classes()).toContain('bg-white')
    })

    it('点击「乐手撞档」Tab 应仅显示乐手撞档冲突', async () => {
      const wrapper = createWrapper()
      const store = useTourStore()

      const tabs = wrapper.findAll('button')
      const musicianTab = tabs.find(t => t.text().includes('乐手撞档'))
      expect(musicianTab).toBeDefined()

      await musicianTab!.trigger('click')

      const musicianConflicts = store.allConflictsWithResolved.filter(
        c => c.type === 'musician_overlap'
      )

      const visibleConflicts = wrapper.findAll('.rounded-lg.border.cursor-pointer')
      if (musicianConflicts.length > 0) {
        visibleConflicts.forEach(card => {
          expect(card.text()).toContain('乐手撞档')
        })
      }
    })

    it('点击「运输窗口」Tab 应仅显示运输窗口冲突', async () => {
      const wrapper = createWrapper()
      const store = useTourStore()

      const tabs = wrapper.findAll('button')
      const transportTab = tabs.find(t => t.text().includes('运输窗口'))
      expect(transportTab).toBeDefined()

      await transportTab!.trigger('click')

      const transportConflicts = store.allConflictsWithResolved.filter(
        c => c.type === 'transport_window'
      )

      const visibleConflicts = wrapper.findAll('.rounded-lg.border.cursor-pointer')
      if (transportConflicts.length > 0) {
        visibleConflicts.forEach(card => {
          expect(card.text()).toContain('运输窗口')
        })
      }
    })

    it('点击「场馆不可用」Tab 应仅显示场馆不可用冲突', async () => {
      const wrapper = createWrapper()
      const store = useTourStore()

      const tabs = wrapper.findAll('button')
      const venueTab = tabs.find(t => t.text().includes('场馆不可用'))
      expect(venueTab).toBeDefined()

      await venueTab!.trigger('click')

      const venueConflicts = store.allConflictsWithResolved.filter(
        c => c.type === 'venue_unavailable'
      )

      const visibleConflicts = wrapper.findAll('.rounded-lg.border.cursor-pointer')
      if (venueConflicts.length > 0) {
        visibleConflicts.forEach(card => {
          expect(card.text()).toContain('场馆不可用')
        })
      }
    })

    it('Tab 切换后点击「全部」应显示所有类型冲突', async () => {
      const wrapper = createWrapper()
      const store = useTourStore()

      const tabs = wrapper.findAll('button')
      const venueTab = tabs.find(t => t.text().includes('场馆不可用'))
      await venueTab!.trigger('click')

      const allTab = tabs.find(t => t.text().includes('全部'))
      await allTab!.trigger('click')

      const visibleConflicts = wrapper.findAll('.rounded-lg.border.cursor-pointer')
      expect(visibleConflicts.length).toBe(store.unresolvedConflicts.length)
    })
  })

  describe('onlyUnresolved 开关', () => {
    it('默认开启 onlyUnresolved，仅显示未处理冲突', () => {
      const wrapper = createWrapper()
      const store = useTourStore()

      const checkbox = wrapper.find('input[type="checkbox"]')
      expect(checkbox.exists()).toBe(true)
      expect(checkbox.element.checked).toBe(true)

      const visibleConflicts = wrapper.findAll('.rounded-lg.border.cursor-pointer')
      expect(visibleConflicts.length).toBe(store.unresolvedConflicts.length)
    })

    it('关闭 onlyUnresolved 后应显示所有冲突（包括已处理）', async () => {
      const wrapper = createWrapper()
      const store = useTourStore()

      const venueConflict = store.allConflicts.find(c => c.type === 'venue_unavailable')
      if (venueConflict) {
        store.markConflictResolved(venueConflict, true)
      }

      const checkbox = wrapper.find('input[type="checkbox"]')
      await checkbox.setValue(false)

      const visibleConflicts = wrapper.findAll('.rounded-lg.border.cursor-pointer')
      expect(visibleConflicts.length).toBe(store.allConflictsWithResolved.length)
    })

    it('已处理冲突应有不同的样式（透明度降低）', async () => {
      const wrapper = createWrapper()
      const store = useTourStore()

      const venueConflict = store.allConflicts.find(c => c.type === 'venue_unavailable')
      if (venueConflict) {
        store.markConflictResolved(venueConflict, true)
      }

      const checkbox = wrapper.find('input[type="checkbox"]')
      await checkbox.setValue(false)

      const resolvedCards = wrapper.findAll('.opacity-60')
      if (venueConflict) {
        expect(resolvedCards.length).toBeGreaterThan(0)
      }
    })

    it('onlyUnresolved 开关切换后应正确更新过滤结果', async () => {
      const wrapper = createWrapper()
      const store = useTourStore()

      const initialCount = store.unresolvedConflicts.length
      const venueConflict = store.allConflicts.find(c => c.type === 'venue_unavailable')
      if (venueConflict) {
        store.markConflictResolved(venueConflict, true)
      }

      const checkbox = wrapper.find('input[type="checkbox"]')
      await checkbox.setValue(false)
      let visibleCount = wrapper.findAll('.rounded-lg.border.cursor-pointer').length
      expect(visibleCount).toBe(store.allConflictsWithResolved.length)

      await checkbox.setValue(true)
      visibleCount = wrapper.findAll('.rounded-lg.border.cursor-pointer').length
      expect(visibleCount).toBeLessThan(initialCount)
    })
  })

  describe('点击冲突触发 highlightShow 事件', () => {
    it('点击冲突卡片应触发 highlightShow 事件并传入 showId', async () => {
      const wrapper = createWrapper()
      const store = useTourStore()

      const conflictCards = wrapper.findAll('.rounded-lg.border.cursor-pointer')
      expect(conflictCards.length).toBeGreaterThan(0)

      const firstCard = conflictCards[0]
      await firstCard.trigger('click')

      const emitted = wrapper.emitted()
      expect(emitted).toHaveProperty('highlightShow')
      expect(emitted.highlightShow).toHaveLength(1)

      const firstConflict = store.unresolvedConflicts[0]
      expect(emitted.highlightShow[0]).toEqual([firstConflict.showId])
    })

    it('不同冲突卡片点击应传递对应的 showId', async () => {
      const wrapper = createWrapper()
      const store = useTourStore()

      const conflictCards = wrapper.findAll('.rounded-lg.border.cursor-pointer')
      if (conflictCards.length >= 2) {
        await conflictCards[1].trigger('click')

        const emitted = wrapper.emitted()
        expect(emitted.highlightShow).toHaveLength(1)

        const secondConflict = store.unresolvedConflicts[1]
        expect(emitted.highlightShow[0]).toEqual([secondConflict.showId])
      }
    })
  })

  describe('错误和警告计数显示', () => {
    it('应正确显示 errorCount 和 warningCount', () => {
      const wrapper = createWrapper()
      const store = useTourStore()

      const badges = wrapper.findAll('.rounded-full')
      const errorBadge = badges.find(b => b.text().includes('错误'))
      const warningBadge = badges.find(b => b.text().includes('警告'))

      if (store.errorCount > 0) {
        expect(errorBadge?.text()).toContain(store.errorCount.toString())
      }
      if (store.warningCount > 0) {
        expect(warningBadge?.text()).toContain(store.warningCount.toString())
      }
    })

    it('底部统计应显示正确的冲突总数和未处理数', () => {
      const wrapper = createWrapper()
      const store = useTourStore()

      const footer = wrapper.find('.border-t.border-gray-200')
      expect(footer.exists()).toBe(true)
      const footerText = footer.text()
      expect(footerText).toContain(`共 ${store.allConflictsWithResolved.length} 个冲突`)
      expect(footerText).toContain(`未处理 ${store.unresolvedConflicts.length} 个`)
    })
  })

  describe('收起/展开功能', () => {
    it('默认处于展开状态', () => {
      const wrapper = createWrapper()
      expect(wrapper.classes()).toContain('w-80')
    })

    it('点击收起按钮应切换为收起状态', async () => {
      const wrapper = createWrapper()
      const collapseButton = wrapper.find('button[title="收起"]')
      expect(collapseButton.exists()).toBe(true)

      await collapseButton.trigger('click')

      expect(wrapper.classes()).toContain('w-12')
    })

    it('收起状态下应显示数字徽标', async () => {
      const wrapper = createWrapper()
      const collapseButton = wrapper.find('button[title="收起"]')
      await collapseButton.trigger('click')

      const badges = wrapper.findAll('.rounded-full')
      expect(badges.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('冲突详情内容', () => {
    it('冲突卡片应显示冲突类型标签', () => {
      const wrapper = createWrapper()
      const conflictCards = wrapper.findAll('.rounded-lg.border.cursor-pointer')

      if (conflictCards.length > 0) {
        const firstCard = conflictCards[0]
        const typeLabel = firstCard.find('.opacity-70')
        expect(typeLabel.exists()).toBe(true)
        expect(['乐手撞档', '运输窗口', '场馆不可用']).toContain(typeLabel.text())
      }
    })

    it('冲突卡片应显示城市和场馆信息', () => {
      const wrapper = createWrapper()
      const store = useTourStore()
      const conflictCards = wrapper.findAll('.rounded-lg.border.cursor-pointer')

      if (conflictCards.length > 0 && store.unresolvedConflicts.length > 0) {
        const firstConflict = store.unresolvedConflicts[0]
        const show = store.getShowById(firstConflict.showId)
        if (show) {
          const firstCard = conflictCards[0]
          expect(firstCard.text()).toContain(show.city)
          expect(firstCard.text()).toContain(show.venueName)
        }
      }
    })

    it('冲突卡片应显示 message 内容', () => {
      const wrapper = createWrapper()
      const store = useTourStore()
      const conflictCards = wrapper.findAll('.rounded-lg.border.cursor-pointer')

      if (conflictCards.length > 0 && store.unresolvedConflicts.length > 0) {
        const firstConflict = store.unresolvedConflicts[0]
        const firstCard = conflictCards[0]
        expect(firstCard.text()).toContain(firstConflict.message)
      }
    })
  })

  describe('标记已处理按钮', () => {
    it('点击「标记已处理」按钮应调用 markConflictResolved', async () => {
      const wrapper = createWrapper()
      const store = useTourStore()

      const initialUnresolvedCount = store.unresolvedConflicts.length
      const conflictCards = wrapper.findAll('.rounded-lg.border.cursor-pointer')

      if (conflictCards.length > 0) {
        const resolveButton = conflictCards[0].find('button.bg-green-100')
        expect(resolveButton.exists()).toBe(true)
        expect(resolveButton.text()).toContain('标记已处理')

        await resolveButton.trigger('click')

        expect(store.unresolvedConflicts.length).toBe(initialUnresolvedCount - 1)
      }
    })

    it('已处理的冲突按钮文字变为「已处理」', async () => {
      const wrapper = createWrapper()
      const store = useTourStore()

      const conflictCards = wrapper.findAll('.rounded-lg.border.cursor-pointer')
      if (conflictCards.length > 0) {
        const resolveButton = conflictCards[0].find('button.bg-green-100')
        await resolveButton.trigger('click')

        const checkbox = wrapper.find('input[type="checkbox"]')
        await checkbox.setValue(false)

        const allCards = wrapper.findAll('.rounded-lg.border.cursor-pointer')
        const resolvedCard = allCards.find(c => c.classes().includes('opacity-60'))
        if (resolvedCard) {
          const buttons = resolvedCard.findAll('button')
          const resolveButtonAfter = buttons.at(1)
          expect(resolveButtonAfter?.text()).toContain('已处理')
        }
      }
    })
  })
})
