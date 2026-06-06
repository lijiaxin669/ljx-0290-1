<script setup lang="ts">
import { computed } from 'vue'
import { useTourStore } from '../stores/tourStore'
import { ChevronRight, ChevronDown, MapPin, Calendar, AlertTriangle, AlertCircle, Music, Users } from 'lucide-vue-next'

const store = useTourStore()

const emit = defineEmits<{
  (e: 'selectShow', showId: string): void
  (e: 'addShow'): void
}>()

const selectedSeason = computed(() => store.selectedTourSeason)
const cities = computed(() => store.cities)
const showsByCity = computed(() => store.showsByCity)
const conflictMap = computed(() => store.conflictMap)
const expandedCities = computed(() => new Set(store.expandedCities))

function getShowConflicts(showId: string) {
  return conflictMap.value.get(showId) || []
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    weekday: 'short'
  })
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

function selectShow(showId: string) {
  store.selectedShowId = showId
  emit('selectShow', showId)
}
</script>

<template>
  <div class="h-full flex flex-col bg-gray-50 border-r border-gray-200">
    <div class="p-4 border-b border-gray-200 bg-white">
      <h1 class="text-lg font-bold text-gray-900 flex items-center gap-2">
        <Music class="w-5 h-5 text-indigo-600" />
        巡演排期管理
      </h1>
      <p class="text-sm text-gray-500 mt-1">弦外之音 - 全国巡演</p>
    </div>

    <div class="flex-1 overflow-y-auto">
      <div v-if="selectedSeason" class="p-2">
        <div class="mb-2">
          <div class="flex items-center gap-2 px-3 py-2 bg-indigo-50 rounded-lg">
            <ChevronDown class="w-4 h-4 text-indigo-600" />
            <span class="font-medium text-indigo-900 text-sm">{{ selectedSeason.name }}</span>
          </div>
        </div>

        <div class="space-y-1">
          <div v-for="city in cities" :key="city" class="city-group">
            <button
              @click="store.toggleCityExpanded(city)"
              class="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight
                v-if="!expandedCities.has(city)"
                class="w-4 h-4 text-gray-400"
              />
              <ChevronDown
                v-else
                class="w-4 h-4 text-gray-400"
              />
              <MapPin class="w-4 h-4 text-gray-500" />
              <span class="font-medium text-gray-700 text-sm">{{ city }}</span>
              <span class="ml-auto text-xs text-gray-400">
                {{ showsByCity.get(city)?.length || 0 }} 场
              </span>
            </button>

            <div v-if="expandedCities.has(city)" class="ml-6 mt-1 space-y-1">
              <div
                v-for="show in showsByCity.get(city) || []"
                :key="show.id"
                @click="selectShow(show.id)"
                :class="[
                  'flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm',
                  store.selectedShowId === show.id
                    ? 'bg-indigo-100 text-indigo-900'
                    : 'hover:bg-gray-100 text-gray-600'
                ]"
              >
                <Calendar class="w-3.5 h-3.5 flex-shrink-0" />
                <div class="flex-1 min-w-0">
                  <div class="font-medium truncate">{{ show.venueName }}</div>
                  <div class="text-xs opacity-70">
                    {{ formatDate(show.startTime) }} {{ formatTime(show.startTime) }}
                  </div>
                </div>
                <AlertTriangle
                  v-if="getShowConflicts(show.id).length > 0"
                  class="w-4 h-4 text-red-500 flex-shrink-0"
                  :title="`${getShowConflicts(show.id).length} 个冲突`"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="p-4 border-t border-gray-200 bg-white">
      <button
        @click="emit('addShow')"
        class="w-full py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm flex items-center justify-center gap-2"
      >
        <Calendar class="w-4 h-4" />
        新增场次
      </button>

      <div v-if="store.unresolvedConflicts.length > 0" class="mt-4">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-xs font-medium text-red-600 flex items-center gap-1">
            <AlertCircle class="w-3.5 h-3.5" />
            错误 {{ store.errorCount }}
          </span>
          <span class="text-xs font-medium text-amber-600 flex items-center gap-1">
            <AlertTriangle class="w-3.5 h-3.5" />
            警告 {{ store.warningCount }}
          </span>
        </div>
        <div class="space-y-2 max-h-40 overflow-y-auto">
          <div
            v-for="(conflict, idx) in store.unresolvedConflicts.slice(0, 5)"
            :key="idx"
            @click="selectShow(conflict.showId)"
            :class="[
              'text-xs p-2 rounded cursor-pointer hover:shadow-sm transition-colors',
              conflict.severity === 'error'
                ? 'bg-red-50 text-red-700 hover:bg-red-100'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            ]"
          >
            {{ conflict.message }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
