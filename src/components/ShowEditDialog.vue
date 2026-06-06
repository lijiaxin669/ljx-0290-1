<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useTourStore } from '../stores/tourStore'
import { detectConflicts } from '../utils/conflictDetector'
import { X, AlertTriangle, AlertCircle, Check, Users, Music2, MapPin, Calendar, Clock, Trash2, Save } from 'lucide-vue-next'
import type { Show, Conflict } from '../types'
import ReschedulePanel from './ReschedulePanel.vue'

const props = defineProps<{
  showId: string | null
  isNew: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved'): void
}>()

const store = useTourStore()

const form = ref({
  city: '',
  venueId: '',
  venueName: '',
  startTime: '',
  durationMinutes: 120,
  musicianIds: [] as string[],
  instrumentIds: [] as string[]
})

const pendingStartTime = ref('')
const hasPendingChanges = ref(false)
const showConflictsOnSave = ref(false)

const currentShow = computed(() => {
  if (!props.showId) return null
  return store.getShowById(props.showId)
})

const availableVenues = computed(() => {
  return store.venues
})

const cityVenues = computed(() => {
  return store.venues.filter(v => v.city === form.value.city)
})

const currentConflicts = computed((): Conflict[] => {
  if (!form.value.venueId || !form.value.startTime) return []
  
  const tempShow: Show = {
    id: props.showId || 'temp_new_show',
    tourSeasonId: store.selectedTourSeasonId || '',
    city: form.value.city,
    venueId: form.value.venueId,
    venueName: form.value.venueName,
    startTime: form.value.startTime ? new Date(form.value.startTime).toISOString() : new Date().toISOString(),
    durationMinutes: form.value.durationMinutes,
    musicianIds: form.value.musicianIds,
    instrumentIds: form.value.instrumentIds
  }
  return detectConflicts(tempShow, store.shows, store.venues, store.instruments)
})

const currentConflictErrorCount = computed(() => {
  return currentConflicts.value.filter(c => c.severity === 'error').length
})

const currentConflictWarningCount = computed(() => {
  return currentConflicts.value.filter(c => c.severity === 'warning').length
})

watch(() => [props.showId, props.isNew], ([newShowId, isNew]) => {
  if (isNew) {
    const now = new Date()
    now.setMinutes(0, 0, 0)
    now.setHours(19, 30, 0, 0)
    form.value = {
      city: '',
      venueId: '',
      venueName: '',
      startTime: now.toISOString().slice(0, 16),
      durationMinutes: 120,
      musicianIds: [],
      instrumentIds: []
    }
    pendingStartTime.value = now.toISOString()
    hasPendingChanges.value = false
    showConflictsOnSave.value = false
  } else if (newShowId && currentShow.value) {
    const show = currentShow.value
    form.value = {
      city: show.city,
      venueId: show.venueId,
      venueName: show.venueName,
      startTime: show.startTime.slice(0, 16),
      durationMinutes: show.durationMinutes,
      musicianIds: [...show.musicianIds],
      instrumentIds: [...show.instrumentIds]
    }
    pendingStartTime.value = show.startTime
    hasPendingChanges.value = false
    showConflictsOnSave.value = false
  }
}, { immediate: true, deep: true })

watch(form, () => {
  if (props.isNew) return
  if (currentShow.value) {
    hasPendingChanges.value = true
    pendingStartTime.value = new Date(form.value.startTime).toISOString()
  }
}, { deep: true })

function selectVenue(venueId: string) {
  const venue = store.venues.find(v => v.id === venueId)
  if (venue) {
    form.value.venueId = venueId
    form.value.venueName = venue.name
    form.value.city = venue.city
  }
}

function toggleMusician(musicianId: string) {
  const idx = form.value.musicianIds.indexOf(musicianId)
  if (idx === -1) {
    form.value.musicianIds.push(musicianId)
  } else {
    form.value.musicianIds.splice(idx, 1)
  }
}

function toggleInstrument(instrumentId: string) {
  const idx = form.value.instrumentIds.indexOf(instrumentId)
  if (idx === -1) {
    form.value.instrumentIds.push(instrumentId)
  } else {
    form.value.instrumentIds.splice(idx, 1)
  }
}

function handleSave() {
  if (currentConflicts.value.length > 0 && !showConflictsOnSave.value) {
    showConflictsOnSave.value = true
    return
  }

  if (props.isNew) {
    store.addShow({
      tourSeasonId: store.selectedTourSeasonId || '',
      city: form.value.city,
      venueId: form.value.venueId,
      venueName: form.value.venueName,
      startTime: new Date(form.value.startTime).toISOString(),
      durationMinutes: form.value.durationMinutes,
      musicianIds: form.value.musicianIds,
      instrumentIds: form.value.instrumentIds
    })
  } else if (props.showId) {
    store.updateShow(props.showId, {
      city: form.value.city,
      venueId: form.value.venueId,
      venueName: form.value.venueName,
      startTime: new Date(form.value.startTime).toISOString(),
      durationMinutes: form.value.durationMinutes,
      musicianIds: form.value.musicianIds,
      instrumentIds: form.value.instrumentIds
    })
  }
  emit('saved')
  emit('close')
}

function handleDelete() {
  if (props.showId && confirm('确定要删除这场演出吗？')) {
    store.deleteShow(props.showId)
    emit('close')
  }
}

function jumpToConflict(relatedShowId?: string) {
  if (relatedShowId) {
    store.selectedShowId = relatedShowId
  }
}

function getConflictIcon(type: string) {
  return AlertTriangle
}

function getConflictColor(type: string) {
  switch (type) {
    case 'musician_overlap':
      return 'text-orange-600 bg-orange-50 border-orange-200'
    case 'transport_window':
      return 'text-amber-600 bg-amber-50 border-amber-200'
    case 'venue_unavailable':
      return 'text-red-600 bg-red-50 border-red-200'
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

function handleApplySuggestion(newStartTime: string) {
  form.value.startTime = newStartTime.slice(0, 16)
  pendingStartTime.value = newStartTime
  hasPendingChanges.value = true
}

function refreshSuggestions() {
}
</script>

<template>
  <div v-if="showId || isNew" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col m-4">
      <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
        <h2 class="text-lg font-bold text-gray-900">
          {{ isNew ? '新增场次' : '编辑场次' }}
        </h2>
        <button
          @click="emit('close')"
          class="p-2 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <X class="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-6">
        <div v-if="currentConflicts.length > 0" class="mb-6">
          <div class="flex items-center gap-3 mb-3">
            <div class="flex items-center gap-2 text-red-600 font-medium">
              <AlertCircle class="w-5 h-5" />
              <span>错误 {{ currentConflictErrorCount }}</span>
            </div>
            <div class="flex items-center gap-2 text-amber-600 font-medium">
              <AlertTriangle class="w-5 h-5" />
              <span>警告 {{ currentConflictWarningCount }}</span>
            </div>
          </div>
          <div class="space-y-2">
            <div
              v-for="(conflict, idx) in currentConflicts"
              :key="idx"
              :class="[
                'p-3 rounded-lg border cursor-pointer hover:shadow-md transition-shadow',
                conflict.severity === 'error'
                  ? 'text-red-600 bg-red-50 border-red-200'
                  : 'text-amber-600 bg-amber-50 border-amber-200'
              ]"
              @click="jumpToConflict(conflict.relatedShowId)"
            >
              <div class="flex items-start gap-2">
                <component
                  :is="conflict.severity === 'error' ? AlertCircle : AlertTriangle"
                  class="w-4 h-4 mt-0.5 flex-shrink-0"
                />
                <div class="flex-1">
                  <div class="font-medium text-sm">{{ conflict.message }}</div>
                  <div class="text-xs opacity-70 mt-1">{{ conflict.details }}</div>
                  <div v-if="conflict.relatedShowId" class="text-xs mt-1 underline">
                    点击跳转至关联场次
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <ReschedulePanel
          :show-id="showId"
          :is-new="isNew"
          @apply="handleApplySuggestion"
          @refresh="refreshSuggestions"
        />

        <div class="space-y-5">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <MapPin class="w-4 h-4" />
              选择场馆
            </label>
            <select
              v-model="form.venueId"
              @change="selectVenue(form.venueId)"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">请选择场馆</option>
              <option v-for="venue in availableVenues" :key="venue.id" :value="venue.id">
                {{ venue.city }} - {{ venue.name }}
              </option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Calendar class="w-4 h-4" />
                日期时间
              </label>
              <input
                v-model="form.startTime"
                type="datetime-local"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Clock class="w-4 h-4" />
                预计时长（分钟）
              </label>
              <input
                v-model.number="form.durationMinutes"
                type="number"
                min="30"
                step="30"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Users class="w-4 h-4" />
              随行乐手
            </label>
            <div class="grid grid-cols-2 gap-2">
              <div
                v-for="musician in store.musicians"
                :key="musician.id"
                @click="toggleMusician(musician.id)"
                :class="[
                  'p-3 rounded-lg border cursor-pointer transition-all',
                  form.musicianIds.includes(musician.id)
                    ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-200'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                ]"
              >
                <div class="flex items-center gap-2">
                  <div
                    :class="[
                      'w-5 h-5 rounded border-2 flex items-center justify-center',
                      form.musicianIds.includes(musician.id)
                        ? 'bg-indigo-600 border-indigo-600'
                        : 'border-gray-300'
                    ]"
                  >
                    <Check v-if="form.musicianIds.includes(musician.id)" class="w-3 h-3 text-white" />
                  </div>
                  <div>
                    <div class="font-medium text-sm">{{ musician.name }}</div>
                    <div class="text-xs text-gray-500">{{ musician.role }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Music2 class="w-4 h-4" />
              需运输乐器
            </label>
            <div class="grid grid-cols-2 gap-2">
              <div
                v-for="instrument in store.instruments"
                :key="instrument.id"
                @click="toggleInstrument(instrument.id)"
                :class="[
                  'p-3 rounded-lg border cursor-pointer transition-all',
                  form.instrumentIds.includes(instrument.id)
                    ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-200'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                ]"
              >
                <div class="flex items-center gap-2">
                  <div
                    :class="[
                      'w-5 h-5 rounded border-2 flex items-center justify-center',
                      form.instrumentIds.includes(instrument.id)
                        ? 'bg-indigo-600 border-indigo-600'
                        : 'border-gray-300'
                    ]"
                  >
                    <Check v-if="form.instrumentIds.includes(instrument.id)" class="w-3 h-3 text-white" />
                  </div>
                  <div>
                    <div class="font-medium text-sm flex items-center gap-2">
                      {{ instrument.name }}
                      <span
                        v-if="instrument.requiresTransport"
                        class="text-xs px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded"
                      >
                        需运输
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
        <button
          v-if="!isNew"
          @click="handleDelete"
          class="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 class="w-4 h-4" />
          删除场次
        </button>
        <div v-else></div>

        <div class="flex items-center gap-3">
          <button
            @click="emit('close')"
            class="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            @click="handleSave"
            :class="[
              'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium',
              currentConflicts.length > 0 && !showConflictsOnSave
                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            ]"
          >
            <Save class="w-4 h-4" />
            {{ currentConflicts.length > 0 && !showConflictsOnSave ? '仍要保存' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
