<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useTourStore } from '../stores/tourStore'
import TourTree from '../components/TourTree.vue'
import TimelineView from '../components/TimelineView.vue'
import ShowEditDialog from '../components/ShowEditDialog.vue'
import ConflictWorkbench from '../components/ConflictWorkbench.vue'
import html2canvas from 'html2canvas'

const store = useTourStore()

const timelineRef = ref<HTMLElement | null>(null)
const timelineViewRef = ref<InstanceType<typeof TimelineView> | null>(null)
const showEditDialog = ref(false)
const isNewShow = ref(false)
const isExporting = ref(false)

onMounted(() => {
  store.initializeStore()
})

function handleSelectShow(showId: string) {
  isNewShow.value = false
  store.selectedShowId = showId
  showEditDialog.value = true
}

function handleHighlightShow(showId: string) {
  timelineViewRef.value?.highlightShow(showId)
}

function handleAddShow() {
  isNewShow.value = true
  store.selectedShowId = null
  showEditDialog.value = true
}

function handleCloseDialog() {
  showEditDialog.value = false
  isNewShow.value = false
}

async function handleExportPNG() {
  if (!timelineRef.value || isExporting.value) return
  
  isExporting.value = true
  
  try {
    await nextTick()
    
    const canvas = await html2canvas(timelineRef.value, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false
    })
    
    const link = document.createElement('a')
    link.download = `巡演排期_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  } catch (error) {
    console.error('导出 PNG 失败:', error)
    alert('导出失败，请重试')
  } finally {
    isExporting.value = false
  }
}
</script>

<template>
  <div class="h-screen flex flex-col bg-gray-100">
    <header class="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 flex-shrink-0">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        </div>
        <div>
          <h1 class="font-bold text-gray-900">弦外之音 · 巡演排期系统</h1>
          <p class="text-xs text-gray-500">Tour Schedule Manager</p>
        </div>
      </div>
      
      <div class="flex items-center gap-4">
        <div class="text-sm text-gray-500">
          <span class="inline-flex items-center gap-1">
            <span class="w-2 h-2 bg-green-500 rounded-full"></span>
            数据自动保存至本地
          </span>
        </div>
        <button
          @click="handleExportPNG"
          :disabled="isExporting"
          class="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg v-if="!isExporting" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ isExporting ? '导出中...' : '导出 PNG' }}
        </button>
      </div>
    </header>

    <div class="flex-1 flex overflow-hidden">
      <aside class="w-72 flex-shrink-0 border-r border-gray-200">
        <TourTree
          @select-show="handleSelectShow"
          @add-show="handleAddShow"
        />
      </aside>

      <main class="flex-1 overflow-hidden" ref="timelineRef">
        <TimelineView
          ref="timelineViewRef"
          @select-show="handleSelectShow"
          @export-p-n-g="handleExportPNG"
        />
      </main>

      <ConflictWorkbench
        @highlight-show="handleHighlightShow"
        @select-show="handleSelectShow"
      />
    </div>

    <ShowEditDialog
      :show-id="store.selectedShowId"
      :is-new="isNewShow"
      v-if="showEditDialog"
      @close="handleCloseDialog"
      @saved="handleCloseDialog"
    />
  </div>
</template>
