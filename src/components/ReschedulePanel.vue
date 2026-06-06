<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useTourStore } from '../stores/tourStore'
import type { RescheduleSuggestion, Show } from '../types'
import { Sparkles, Clock, Check, AlertTriangle, Calendar, ArrowRight, RefreshCw } from 'lucide-vue-next'

const props = defineProps<{
  showId: string | null
  isNew?: boolean
}>()

const emit = defineEmits<{
  (e: 'apply', newStartTime: string): void
  (e: 'refresh'): void
}>()

const store = useTourStore()
const isLoading = ref(false)
const suggestions = ref<RescheduleSuggestion[]>([])

const currentShow = computed((): Show | null => {
  if (!props.showId) return null
  return store.getShowById(props.showId) || null
})

function loadSuggestions() {
  if (!props.showId || props.isNew) {
    suggestions.value = []
    return
  }

  isLoading.value = true
  setTimeout(() => {
    suggestions.value = store.getSuggestionsForShowAction(props.showId!)
    isLoading.value = false
  }, 100)
}

watch(() => [props.showId, props.isNew], () => {
  loadSuggestions()
}, { immediate: true })

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short'
  })
}

function formatTimeDiff(days: number): string {
  if (days === 0) return '当天'
  if (days > 0) return `延后 ${days} 天`
  return `提前 ${Math.abs(days)} 天`
}

function getTimeDiffColor(days: number): string {
  const absDays = Math.abs(days)
  if (absDays <= 3) return 'text-green-600'
  if (absDays <= 7) return 'text-amber-600'
  return 'text-gray-600'
}

function handleApply(suggestion: RescheduleSuggestion) {
  emit('apply', suggestion.newStartTime)
}

function handleRefresh() {
  loadSuggestions()
  emit('refresh')
}
</script>

<template>
  <div v-if="showId && !isNew" class="border-t border-gray-200 pt-4">
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2 text-indigo-600 font-medium">
        <Sparkles class="w-4 h-4" />
        <span>智能改期建议</span>
      </div>
      <button
        @click="handleRefresh"
        :disabled="isLoading"
        class="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
        title="刷新建议"
      >
        <RefreshCw :class="['w-4 h-4', isLoading ? 'animate-spin' : '']" />
      </button>
    </div>

    <div v-if="isLoading" class="text-center py-6 text-gray-400">
      <RefreshCw class="w-6 h-6 mx-auto mb-2 animate-spin" />
      <p class="text-sm">正在计算最佳改期方案...</p>
    </div>

    <div v-else-if="suggestions.length === 0" class="text-center py-6 text-gray-400">
      <Calendar class="w-8 h-8 mx-auto mb-2 opacity-50" />
      <p class="text-sm">暂无可用的改期建议</p>
      <p class="text-xs mt-1">请尝试更换场馆或扩大搜索范围</p>
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="(suggestion, idx) in suggestions"
        :key="idx"
        class="p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200 hover:shadow-md transition-all"
      >
        <div class="flex items-start gap-2">
          <div class="flex-shrink-0 w-6 h-6 bg-indigo-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
            {{ idx + 1 }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 text-sm">
              <span class="text-gray-500">原时间</span>
              <span class="font-medium text-gray-700">
                {{ formatDateTime(currentShow?.startTime || '') }}
              </span>
            </div>
            <div class="flex items-center gap-2 my-1">
              <ArrowRight class="w-4 h-4 text-indigo-500" />
            </div>
            <div class="flex items-center gap-2 text-sm">
              <span class="text-gray-500">建议</span>
              <span class="font-medium text-indigo-700">
                {{ formatDateTime(suggestion.newStartTime) }}
              </span>
              <span :class="['text-xs font-medium', getTimeDiffColor(suggestion.timeDiffDays)]">
                ({{ formatTimeDiff(suggestion.timeDiffDays) }})
              </span>
            </div>

            <div class="flex items-center gap-3 mt-2 pt-2 border-t border-indigo-200/50">
              <div class="flex items-center gap-1 text-xs">
                <Clock class="w-3 h-3 text-gray-400" />
                <span class="text-gray-500">
                  {{ Math.abs(suggestion.timeDiffDays) }} 天
                </span>
              </div>
              <div
                :class="[
                  'flex items-center gap-1 text-xs',
                  suggestion.remainingConflicts === 0 ? 'text-green-600' : 'text-amber-600'
                ]"
              >
                <Check v-if="suggestion.remainingConflicts === 0" class="w-3 h-3" />
                <AlertTriangle v-else class="w-3 h-3" />
                <span>
                  {{ suggestion.remainingConflicts === 0 ? '无冲突' : `剩余 ${suggestion.remainingConflicts} 个冲突` }}
                </span>
              </div>
            </div>

            <button
              @click="handleApply(suggestion)"
              class="w-full mt-2 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <Check class="w-4 h-4" />
              应用建议
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
