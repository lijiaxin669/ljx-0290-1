<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTourStore } from '../stores/tourStore'
import { getConflictTypeLabel, type Conflict, type ConflictType } from '../types'
import { ChevronLeft, ChevronRight, AlertTriangle, AlertCircle, Check, X, Filter, Clock, MapPin } from 'lucide-vue-next'

const store = useTourStore()

const emit = defineEmits<{
  (e: 'highlightShow', showId: string): void
  (e: 'selectShow', showId: string): void
}>()

const isCollapsed = ref(false)
const onlyUnresolved = ref(true)
const activeTab = ref<ConflictType | 'all'>('all')

const tabs: { key: ConflictType | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'musician_overlap', label: '乐手撞档' },
  { key: 'transport_window', label: '运输窗口' },
  { key: 'venue_unavailable', label: '场馆不可用' }
]

const filteredConflicts = computed(() => {
  let conflicts = store.allConflictsWithResolved

  if (activeTab.value !== 'all') {
    conflicts = conflicts.filter(c => c.type === activeTab.value)
  }

  if (onlyUnresolved.value) {
    conflicts = conflicts.filter(c => !c.resolved)
  }

  return conflicts
})

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function handleConflictClick(conflict: Conflict) {
  emit('highlightShow', conflict.showId)
}

function handleShowSelect(showId: string) {
  emit('selectShow', showId)
}

function toggleResolved(conflict: Conflict, e: Event) {
  e.stopPropagation()
  store.markConflictResolved(conflict, !conflict.resolved)
}

function getConflictIcon(type: ConflictType) {
  return AlertTriangle
}

function getConflictColor(conflict: Conflict) {
  const severity = conflict.severity || 'warning'
  if (conflict.resolved) {
    return 'text-gray-400 bg-gray-50 border-gray-200 opacity-60'
  }
  switch (severity) {
    case 'error':
      return 'text-red-600 bg-red-50 border-red-200'
    case 'warning':
      return 'text-amber-600 bg-amber-50 border-amber-200'
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

function getShowInfo(showId: string) {
  const show = store.getShowById(showId)
  return show || null
}

function getSeverityBadgeColor(severity?: 'error' | 'warning') {
  switch (severity) {
    case 'error':
      return 'bg-red-500 text-white'
    case 'warning':
      return 'bg-amber-500 text-white'
    default:
      return 'bg-gray-500 text-white'
  }
}
</script>

<template>
  <aside
    :class="[
      'h-full border-l border-gray-200 bg-white flex flex-col transition-all duration-300',
      isCollapsed ? 'w-12' : 'w-80'
    ]"
  >
    <div class="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
      <div v-if="!isCollapsed" class="flex items-center gap-2">
        <AlertTriangle class="w-5 h-5 text-red-500" />
        <span class="font-bold text-gray-900">冲突工作台</span>
      </div>
      <button
        @click="isCollapsed = !isCollapsed"
        class="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
        :title="isCollapsed ? '展开' : '收起'"
      >
        <ChevronRight v-if="isCollapsed" class="w-4 h-4 text-gray-600" />
        <ChevronLeft v-else class="w-4 h-4 text-gray-600" />
      </button>
    </div>

    <div v-if="!isCollapsed" class="flex-1 overflow-hidden flex flex-col">
      <div class="p-3 border-b border-gray-200 space-y-3">
        <div class="flex items-center gap-2">
          <span
            :class="[
              'px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1',
              getSeverityBadgeColor('error')
            ]"
          >
            <AlertCircle class="w-3 h-3" />
            错误 {{ store.errorCount }}
          </span>
          <span
            :class="[
              'px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1',
              getSeverityBadgeColor('warning')
            ]"
          >
            <AlertTriangle class="w-3 h-3" />
            警告 {{ store.warningCount }}
          </span>
        </div>

        <div class="flex items-center gap-2">
          <label class="flex items-center gap-1.5 cursor-pointer text-sm text-gray-600">
            <input
              type="checkbox"
              v-model="onlyUnresolved"
              class="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
            />
            <Filter class="w-3.5 h-3.5" />
            仅看未处理
          </label>
        </div>

        <div class="flex gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            @click="activeTab = tab.key"
            :class="[
              'flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors',
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            ]"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-2 space-y-2">
        <div v-if="filteredConflicts.length === 0" class="text-center py-8 text-gray-400">
          <Check class="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p class="text-sm">暂无冲突</p>
        </div>

        <div
          v-for="(conflict, idx) in filteredConflicts"
          :key="idx"
          :class="[
            'p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all group',
            getConflictColor(conflict)
          ]"
          @click="handleConflictClick(conflict)"
        >
          <div class="flex items-start gap-2">
            <component
              :is="getConflictIcon(conflict.type)"
              class="w-4 h-4 mt-0.5 flex-shrink-0"
            />
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-2">
                <span class="text-xs font-medium opacity-70">
                  {{ getConflictTypeLabel(conflict.type) }}
                </span>
                <span
                  v-if="conflict.severity"
                  :class="[
                    'text-xs px-1.5 py-0.5 rounded font-medium',
                    conflict.severity === 'error' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  ]"
                >
                  {{ conflict.severity === 'error' ? '错误' : '警告' }}
                </span>
              </div>

              <div
                v-if="getShowInfo(conflict.showId)"
                class="mt-1.5 space-y-0.5"
              >
                <div class="flex items-center gap-1 text-sm font-medium">
                  <MapPin class="w-3 h-3 flex-shrink-0" />
                  <span class="truncate">
                    {{ getShowInfo(conflict.showId)!.city }} · {{ getShowInfo(conflict.showId)!.venueName }}
                  </span>
                </div>
                <div class="flex items-center gap-1 text-xs opacity-70">
                  <Clock class="w-3 h-3 flex-shrink-0" />
                  <span>
                    {{ formatDateTime(getShowInfo(conflict.showId)!.startTime) }}
                  </span>
                </div>
              </div>

              <div class="text-sm mt-1.5 font-medium">
                {{ conflict.message }}
              </div>
              <div class="text-xs opacity-70 mt-0.5">
                {{ conflict.details }}
              </div>

              <div class="flex items-center justify-between mt-2 pt-2 border-t border-current/10">
                <button
                  @click="handleShowSelect(conflict.showId)"
                  class="text-xs underline opacity-70 hover:opacity-100"
                >
                  查看详情
                </button>
                <button
                  @click="toggleResolved(conflict, $event)"
                  :class="[
                    'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors',
                    conflict.resolved
                      ? 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  ]"
                >
                  <Check v-if="conflict.resolved" class="w-3 h-3" />
                  <X v-else class="w-3 h-3" />
                  {{ conflict.resolved ? '已处理' : '标记已处理' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="p-3 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
        共 {{ store.allConflictsWithResolved.length }} 个冲突，
        未处理 {{ store.unresolvedConflicts.length }} 个
      </div>
    </div>

    <div
      v-if="isCollapsed"
      class="flex-1 flex flex-col items-center py-4 gap-3"
    >
      <div
        :class="[
          'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
          getSeverityBadgeColor('error')
        ]"
        :title="`${store.errorCount} 个错误`"
      >
        {{ store.errorCount }}
      </div>
      <div
        :class="[
          'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
          getSeverityBadgeColor('warning')
        ]"
        :title="`${store.warningCount} 个警告`"
      >
        {{ store.warningCount }}
      </div>
    </div>
  </aside>
</template>
