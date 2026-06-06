<script setup lang="ts">import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useTourStore } from '../stores/tourStore';
import { ChevronLeft, ChevronRight, Clock, AlertTriangle, AlertCircle, GripHorizontal, MapPin, Download } from 'lucide-vue-next';
import type { Show, DragState } from '../types';
const store = useTourStore();
const emit = defineEmits<{
 (e: 'selectShow', showId: string): void;
 (e: 'exportPNG'): void;
 (e: 'highlightShow', showId: string): void;
}>();

defineExpose({
 highlightShow
});
const scrollContainerRef = ref<HTMLDivElement | null>(null);
const timelineInnerRef = ref<HTMLDivElement | null>(null);
const dragState = ref<DragState>({
 isDragging: false,
 showId: null,
 startX: 0,
 originalStartTime: ''
});
const hoveredShow = ref<string | null>(null);
const isScrolled = ref(false);
const highlightedShowId = ref<string | null>(null);
let highlightTimeout: ReturnType<typeof setTimeout> | null = null;
const PIXELS_PER_HOUR = 60;
const ROW_HEIGHT = 48;
const HEADER_HEIGHT = 56;
const CITY_LABEL_WIDTH = 100;
const viewDates = computed(() => {
 const dates: Date[] = [];
 const days = store.viewMode === 'week' ? 7 : 30;
 for (let i = 0; i < days; i++) {
 const date = new Date(store.viewStartDate);
 date.setHours(0, 0, 0, 0);
 date.setDate(date.getDate() + i);
 dates.push(date);
 }
 return dates;
});
const totalWidth = computed(() => {
 const days = store.viewMode === 'week' ? 7 : 30;
 return days * 24 * PIXELS_PER_HOUR;
});
const allShows = computed(() => store.shows);
const showsByCity = computed(() => store.showsByCity);
const conflictMap = computed(() => store.conflictMap);
function getShowConflicts(showId: string) {
 return conflictMap.value.get(showId) || [];
}
function getShowPosition(show: Show) {
 const startDate = new Date(show.startTime);
 const viewStart = new Date(store.viewStartDate);
 viewStart.setHours(0, 0, 0, 0);
 const diffMs = startDate.getTime() - viewStart.getTime();
 const diffHours = diffMs / (1000 * 60 * 60);
 const left = diffHours * PIXELS_PER_HOUR;
 const width = (show.durationMinutes / 60) * PIXELS_PER_HOUR;
 return { left, width };
}
function isShowInView(show: Show): boolean {
 const pos = getShowPosition(show);
 return pos.left >= -500 && pos.left < totalWidth.value + 500;
}
function formatDate(date: Date): string {
 return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}
function formatWeekday(date: Date): string {
 return date.toLocaleDateString('zh-CN', { weekday: 'short' });
}
function scrollToFirstShow() {
 if (!scrollContainerRef.value || allShows.value.length === 0)
 return;
 const sortedShows = [...allShows.value].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
 const firstShow = sortedShows[0];
 const pos = getShowPosition(firstShow);
 const targetScroll = Math.max(0, pos.left - 200);
 scrollContainerRef.value.scrollTo({
 left: targetScroll,
 behavior: 'smooth'
 });
}
function scrollToShow(showId: string) {
 if (!scrollContainerRef.value)
 return;
 const show = store.getShowById(showId);
 if (!show)
 return;
 const pos = getShowPosition(show);
 const targetScroll = Math.max(0, pos.left - 200);
 scrollContainerRef.value.scrollTo({
 left: targetScroll,
 behavior: 'smooth'
 });
}
async function handleViewChange() {
 isScrolled.value = false;
 await nextTick();
 scrollToFirstShow();
}
watch(() => store.viewMode, handleViewChange);
watch(() => store.viewStartDate, handleViewChange);
watch(() => store.shows.length, async () => {
 await nextTick();
 if (!isScrolled.value) {
 scrollToFirstShow();
 }
});
watch(() => store.selectedShowId, (newShowId) => {
 if (newShowId) {
 scrollToShow(newShowId);
 }
});
onMounted(async () => {
 await nextTick();
 setTimeout(() => {
 scrollToFirstShow();
 isScrolled.value = true;
 }, 100);
});
function startDrag(e: MouseEvent, show: Show) {
 e.preventDefault();
 e.stopPropagation();
 dragState.value = {
 isDragging: true,
 showId: show.id,
 startX: e.clientX,
 originalStartTime: show.startTime
 };
 document.addEventListener('mousemove', onDrag);
 document.addEventListener('mouseup', endDrag);
}
function onDrag(e: MouseEvent) {
 if (!dragState.value.isDragging || !dragState.value.showId)
 return;
 const show = store.getShowById(dragState.value.showId);
 if (!show)
 return;
 const deltaX = e.clientX - dragState.value.startX;
 const deltaHours = deltaX / PIXELS_PER_HOUR;
 const originalDate = new Date(dragState.value.originalStartTime);
 const newDate = new Date(originalDate.getTime() + deltaHours * 60 * 60 * 1000);
 store.updateShow(show.id, {
 startTime: newDate.toISOString()
 });
}
function endDrag() {
 dragState.value.isDragging = false;
 dragState.value.showId = null;
 document.removeEventListener('mousemove', onDrag);
 document.removeEventListener('mouseup', endDrag);
}
onUnmounted(() => {
 document.removeEventListener('mousemove', onDrag);
 document.removeEventListener('mouseup', endDrag);
});
function selectShow(showId: string) {
 store.selectedShowId = showId;
 emit('selectShow', showId);
}
function highlightShow(showId: string) {
 if (highlightTimeout) {
 clearTimeout(highlightTimeout);
 }
 highlightedShowId.value = showId;
 scrollToShow(showId);
 highlightTimeout = setTimeout(() => {
 highlightedShowId.value = null;
 }, 2000);
}

function getShowColor(show: Show): string {
 if (highlightedShowId.value === show.id) {
 return 'bg-yellow-400 border-yellow-500 shadow-lg shadow-yellow-400/50 ring-4 ring-yellow-300 animate-pulse';
 }
 const conflicts = getShowConflicts(show.id);
 if (conflicts.length > 0) {
 return 'bg-red-500 border-red-600 shadow-lg shadow-red-500/30';
 }
 if (store.selectedShowId === show.id) {
 return 'bg-indigo-600 border-indigo-700 shadow-lg shadow-indigo-500/30';
 }
 return 'bg-indigo-500 border-indigo-600 hover:bg-indigo-600';
}
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200">
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          <button
            @click="store.navigateView('prev')"
            class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft class="w-5 h-5 text-gray-600" />
          </button>
          <span class="font-medium text-gray-900 min-w-[160px] text-center">
            {{ formatDate(viewDates[0]) }} - {{ formatDate(viewDates[viewDates.length - 1]) }}
          </span>
          <button
            @click="store.navigateView('next')"
            class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight class="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div class="flex items-center bg-gray-100 rounded-lg p-1">
          <button
            @click="store.setViewMode('week')"
            :class="[
              'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              store.viewMode === 'week'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            ]"
          >
            周视图
          </button>
          <button
            @click="store.setViewMode('month')"
            :class="[
              'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              store.viewMode === 'month'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            ]"
          >
            月视图
          </button>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          @click="scrollToFirstShow"
          class="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
        >
          <MapPin class="w-4 h-4" />
          回到首场
        </button>
        <button
          @click="emit('exportPNG')"
          class="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
        >
          <Download class="w-4 h-4" />
          导出 PNG
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-hidden relative">
      <div 
        class="absolute inset-0 overflow-auto" 
        ref="scrollContainerRef"
        style="scroll-behavior: smooth;"
      >
        <div
          class="relative"
          ref="timelineInnerRef"
          :style="{
            width: `${totalWidth + CITY_LABEL_WIDTH}px`,
            minHeight: `${Math.max(store.cities.length * ROW_HEIGHT + HEADER_HEIGHT, 400)}px`
          }"
        >
          <div
            class="sticky top-0 left-0 z-10 bg-gray-50 border-b border-gray-200 flex"
            :style="{ height: `${HEADER_HEIGHT}px` }"
          >
            <div
              class="flex-shrink-0 border-r border-gray-200 flex items-center px-3 sticky left-0 bg-gray-50 z-20"
              :style="{ width: `${CITY_LABEL_WIDTH}px` }"
            >
              <span class="text-sm font-medium text-gray-700">城市</span>
            </div>
            
            <div class="flex flex-1">
              <div
                v-for="(date, idx) in viewDates"
                :key="idx"
                :class="[
                  'flex flex-col items-center justify-center border-r border-gray-200 text-sm',
                  date.getDay() === 0 || date.getDay() === 6 ? 'bg-orange-50' : ''
                ]"
                :style="{ width: `${24 * PIXELS_PER_HOUR}px` }"
              >
                <span class="font-medium text-gray-900">{{ formatDate(date) }}</span>
                <span :class="['text-xs', date.getDay() === 0 || date.getDay() === 6 ? 'text-orange-600' : 'text-gray-500']">
                  {{ formatWeekday(date) }}
                </span>
              </div>
            </div>
          </div>

          <div class="relative">
            <div
              v-for="(city, cityIdx) in store.cities"
              :key="city"
              class="flex border-b border-gray-100"
              :style="{ height: `${ROW_HEIGHT}px` }"
            >
              <div
                class="flex-shrink-0 border-r border-gray-200 flex items-center px-3 bg-gray-50 sticky left-0 z-10"
                :style="{ width: `${CITY_LABEL_WIDTH}px` }"
              >
                <div class="flex items-center gap-1.5">
                  <MapPin class="w-3.5 h-3.5 text-gray-400" />
                  <span class="text-sm font-medium text-gray-700 truncate">{{ city }}</span>
                </div>
              </div>
              
              <div class="flex-1 relative">
                <div class="absolute inset-0 flex">
                  <div
                    v-for="(date, dateIdx) in viewDates"
                    :key="dateIdx"
                    :class="[
                      'border-r border-gray-100 h-full',
                      date.getDay() === 0 || date.getDay() === 6 ? 'bg-orange-50/50' : ''
                    ]"
                    :style="{ width: `${24 * PIXELS_PER_HOUR}px` }"
                  />
                </div>

                <div
                  v-for="show in showsByCity.get(city) || []"
                  :key="show.id"
                  :class="[
                    'absolute top-2 bottom-2 rounded-md border cursor-pointer transition-all flex items-center px-2 overflow-hidden group min-w-[80px]',
                    getShowColor(show),
                    store.selectedShowId === show.id ? 'ring-2 ring-offset-2 ring-indigo-400' : '',
                    dragState.isDragging && dragState.showId === show.id ? 'opacity-80 scale-[1.02]' : ''
                  ]"
                  :style="{
                    left: `${getShowPosition(show).left}px`,
                    width: `${Math.max(getShowPosition(show).width, 80)}px`,
                    zIndex: hoveredShow === show.id ? 20 : 10
                  }"
                  @click="selectShow(show.id)"
                  @mousedown="startDrag($event, show)"
                  @mouseenter="hoveredShow = show.id"
                  @mouseleave="hoveredShow = null"
                >
                  <GripHorizontal class="w-4 h-4 text-white/60 cursor-grab flex-shrink-0" />
                  <div class="ml-1 min-w-0 flex-1">
                    <div class="text-white text-xs font-medium truncate">
                      {{ show.venueName }}
                    </div>
                    <div class="text-white/70 text-xs flex items-center gap-1">
                      <Clock class="w-3 h-3 flex-shrink-0" />
                      {{ new Date(show.startTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }}
                    </div>
                  </div>
                  <AlertTriangle
                    v-if="getShowConflicts(show.id).length > 0"
                    class="w-4 h-4 text-yellow-300 flex-shrink-0 ml-1"
                    :title="`${getShowConflicts(show.id).length} 个冲突`"
                  />
                </div>
              </div>
            </div>

            <div
              v-if="allShows.length === 0"
              class="absolute inset-0 flex items-center justify-center text-gray-400 py-16"
            >
              <div class="text-center">
                <MapPin class="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p class="text-sm">暂无场次安排</p>
                <p class="text-xs mt-1">点击左侧「新增场次」按钮添加</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="px-4 py-2 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
      <div class="flex items-center gap-4">
        <span class="flex items-center gap-1">
          <span class="w-3 h-3 bg-indigo-500 rounded"></span>
          正常场次
        </span>
        <span class="flex items-center gap-1">
          <span class="w-3 h-3 bg-red-500 rounded"></span>
          存在冲突
        </span>
        <span v-if="store.errorCount > 0" class="flex items-center gap-1 text-red-600 font-medium">
          <AlertCircle class="w-3 h-3" />
          错误 {{ store.errorCount }}
        </span>
        <span v-if="store.warningCount > 0" class="flex items-center gap-1 text-amber-600 font-medium">
          <AlertTriangle class="w-3 h-3" />
          警告 {{ store.warningCount }}
        </span>
      </div>
      <span>拖拽甘特条可调整场次时间 | 点击可查看详情</span>
    </div>
  </div>
</template>
