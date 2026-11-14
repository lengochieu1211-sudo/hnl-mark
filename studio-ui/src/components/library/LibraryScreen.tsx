import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpDown,
  Check,
  CheckSquare,
  Download,
  Film,
  FolderOpen,
  LayoutGrid,
  List,
  MoreVertical,
  Pencil,
  Play,
  RefreshCw,
  Search,
  Share2,
  Sliders,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { LibraryStateMode, MediaItem, WatermarkConfig } from '../../types/hnl';
import { WatermarkOverlay } from '../watermark/WatermarkOverlay';

interface LibraryScreenProps {
  items: MediaItem[];
  activeMediaId: string;
  watermarkConfig: WatermarkConfig;
  onSelectActiveMedia: (item: MediaItem) => void;
  onEditMediaInEditor: (item: MediaItem) => void;
  onUpdateMediaMetadata: (
    id: string,
    patch: Partial<Pick<MediaItem, 'createdAt' | 'location' | 'coordinates' | 'customNote' | 'photoCode' | 'title'>>,
  ) => void;
  onDeleteItems: (ids: string[]) => void;
  onRestoreBackupJson: (items: MediaItem[]) => void;
  onTriggerExportSheet: (selectedItems: MediaItem[]) => void;
  onOpenCamera: () => void;
}

type SortMode = 'newest' | 'oldest' | 'code' | 'origin';

export const LibraryScreen: React.FC<LibraryScreenProps> = ({
  items,
  activeMediaId,
  watermarkConfig,
  onSelectActiveMedia,
  onEditMediaInEditor,
  onUpdateMediaMetadata,
  onDeleteItems,
  onRestoreBackupJson,
  onTriggerExportSheet,
  onOpenCamera,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [originFilter, setOriginFilter] = useState<'all' | 'saved-project' | 'newly-picked'>('all');
  const [multiSelect, setMultiSelect] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [libraryState, setLibraryState] = useState<LibraryStateMode>('populated');
  const [showActionsMenu, setShowActionsMenu] = useState<boolean>(false);

  // Lightbox + Edit Stamp Modal
  const [lightboxItem, setLightboxItem] = useState<MediaItem | null>(null);
  const [editingMetadata, setEditingMetadata] = useState<boolean>(false);
  const [draftDate, setDraftDate] = useState<string>('');
  const [draftLocation, setDraftLocation] = useState<string>('');
  const [draftCoords, setDraftCoords] = useState<string>('');
  const [draftNote, setDraftNote] = useState<string>('');
  const [draftCode, setDraftCode] = useState<string>('');
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const restoreInputRef = useRef<HTMLInputElement | null>(null);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = items.filter((it) => {
      if (originFilter !== 'all' && it.origin !== originFilter) return false;
      if (!q) return true;
      return (
        it.title.toLowerCase().includes(q) ||
        it.location.toLowerCase().includes(q) ||
        it.photoCode.toLowerCase().includes(q) ||
        it.customNote.toLowerCase().includes(q)
      );
    });

    return [...list].sort((a, b) => {
      if (sortMode === 'newest') return b.createdAt.localeCompare(a.createdAt);
      if (sortMode === 'oldest') return a.createdAt.localeCompare(b.createdAt);
      if (sortMode === 'code') return a.photoCode.localeCompare(b.photoCode);
      return a.origin.localeCompare(b.origin);
    });
  }, [items, searchQuery, sortMode, originFilter]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const openLightbox = (item: MediaItem) => {
    onSelectActiveMedia(item);
    setLightboxItem(item);
    setEditingMetadata(false);
    setDraftDate(item.createdAt.slice(0, 16));
    setDraftLocation(item.location);
    setDraftCoords(item.coordinates);
    setDraftNote(item.customNote);
    setDraftCode(item.photoCode);
  };

  const handleSaveMetadata = () => {
    if (!lightboxItem) return;
    const normalizedIso = draftDate.length === 16 ? `${draftDate}:00` : draftDate;
    onUpdateMediaMetadata(lightboxItem.id, {
      createdAt: normalizedIso,
      location: draftLocation,
      coordinates: draftCoords,
      customNote: draftNote,
      photoCode: draftCode,
    });
    setLightboxItem((prev) =>
      prev
        ? {
            ...prev,
            createdAt: normalizedIso,
            location: draftLocation,
            coordinates: draftCoords,
            customNote: draftNote,
            photoCode: draftCode,
          }
        : null,
    );
    setEditingMetadata(false);
    setStatusNotice('Đã cập nhật thông tin hiển thị. Dữ liệu gốc không bị thay đổi.');
    window.setTimeout(() => setStatusNotice(null), 2400);
  };

  const handleBackupDownload = () => {
    setShowActionsMenu(false);
    onTriggerExportSheet(items);
  };
  const handleRestoreFile = (_file: File | undefined) => {
    setStatusNotice('Dự án HNL mới dùng ZIP chứa media gốc; JSON cũ không có ảnh/video nên không được khôi phục như dữ liệu thật.');
  };

  const formatDuration = (sec?: number) => {
    if (!sec) return '00:00';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const effectiveState: LibraryStateMode =
    libraryState === 'populated' && items.length === 0 ? 'empty' : libraryState;

  return (
    <div className="px-4 py-3 space-y-3 max-w-6xl mx-auto">
      <input
        ref={restoreInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          handleRestoreFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      {/* Header + Menu */}
      <div className="flex items-center justify-between gap-2 relative">
        <div>
          <h1 className="text-[17px] font-semibold text-[#F8FAFC]">Thư viện HNL Mark</h1>
          <p className="text-[12px] text-[#94A3B8] font-mono-tabular">
            {filteredItems.length} mục · {items.filter((i) => i.origin === 'saved-project').length} đã lưu dự án
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setMultiSelect((m) => !m);
              setSelectedIds([]);
            }}
            className={`min-h-[40px] px-3 rounded-xl text-xs font-medium flex items-center gap-1.5 border transition ${
              multiSelect
                ? 'bg-[#E2B74B] text-[#060B14] border-[#E2B74B]'
                : 'bg-[#111C30] text-[#F8FAFC] border-white/[0.08] hover:bg-[#17253D]'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>{multiSelect ? `Đã chọn (${selectedIds.length})` : 'Chọn nhiều'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowActionsMenu((s) => !s)}
            className="min-w-[44px] min-h-[44px] rounded-xl bg-[#111C30] border border-white/[0.08] text-[#F8FAFC] hover:bg-[#17253D] flex items-center justify-center"
            aria-label="Menu lưu, chia sẻ và sao lưu"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>

        {showActionsMenu && (
          <div className="absolute right-0 top-12 z-30 w-56 rounded-2xl bg-[#111C30] border border-white/15 shadow-2xl py-1.5 text-[13px]">
            <button
              type="button"
              onClick={() => {
                setShowActionsMenu(false);
                const targets =
                  selectedIds.length > 0
                    ? items.filter((it) => selectedIds.includes(it.id))
                    : filteredItems;
                onTriggerExportSheet(targets);
              }}
              className="w-full min-h-[44px] px-3.5 flex items-center gap-2.5 text-left text-[#F8FAFC] hover:bg-white/[0.06]"
            >
              <Share2 className="w-4 h-4 text-[#E2B74B]" />
              <span>Lưu &amp; Chia sẻ ({selectedIds.length || filteredItems.length})</span>
            </button>
            <button
              type="button"
              onClick={handleBackupDownload}
              className="w-full min-h-[44px] px-3.5 flex items-center gap-2.5 text-left text-[#F8FAFC] hover:bg-white/[0.06]"
            >
              <Download className="w-4 h-4 text-[#94A3B8]" />
              <span>Sao lưu dự án ZIP (bao gồm ảnh/video gốc)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowActionsMenu(false);
                restoreInputRef.current?.click();
              }}
              className="w-full min-h-[44px] px-3.5 flex items-center gap-2.5 text-left text-[#F8FAFC] hover:bg-white/[0.06]"
            >
              <Upload className="w-4 h-4 text-[#94A3B8]" />
              <span>Khôi phục từ sao lưu</span>
            </button>
          </div>
        )}
      </div>

      {/* Search + Sort + Grid/List Toggle */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên, mã ảnh, địa điểm..."
            className="w-full h-10 pl-9 pr-3 rounded-xl bg-[#111C30] border border-white/[0.08] text-[13.5px] text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none focus:border-[#E2B74B]"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <div className="relative flex items-center bg-[#111C30] border border-white/[0.08] rounded-xl px-2.5 h-10">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#94A3B8] mr-1.5 shrink-0" />
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              aria-label="Sắp xếp thư viện"
              className="bg-transparent text-[13px] text-[#F8FAFC] focus:outline-none pr-1"
            >
              <option value="newest" className="bg-[#0B1424]">Mới nhất</option>
              <option value="oldest" className="bg-[#0B1424]">Cũ nhất</option>
              <option value="code" className="bg-[#0B1424]">Mã ảnh</option>
              <option value="origin" className="bg-[#0B1424]">Phân loại nguồn</option>
            </select>
          </div>

          <div className="flex items-center bg-[#111C30] border border-white/[0.08] rounded-xl p-0.5 h-10">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`w-9 h-8 rounded-lg flex items-center justify-center transition ${
                viewMode === 'grid' ? 'bg-[#E2B74B] text-[#060B14]' : 'text-[#94A3B8]'
              }`}
              aria-label="Hiển thị dạng lưới"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`w-9 h-8 rounded-lg flex items-center justify-center transition ${
                viewMode === 'list' ? 'bg-[#E2B74B] text-[#060B14]' : 'text-[#94A3B8]'
              }`}
              aria-label="Hiển thị dạng danh sách"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Origin Filter + State QA Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-white/[0.07]">
        <div className="flex items-center gap-1 bg-[#0B1424] p-1 rounded-xl border border-white/[0.06]">
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'saved-project', label: 'Đã lưu dự án' },
            { id: 'newly-picked', label: 'Ảnh mới chọn' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setOriginFilter(f.id as typeof originFilter)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                originFilter === f.id
                  ? 'bg-[#17253D] text-[#E2B74B]'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Interactive State Switcher (Populated / Empty / Loading / Error) */}
        <div className="flex items-center gap-1 text-[11px]">
          <span className="text-[#64748B] mr-1">Trạng thái:</span>
          {([
            { id: 'populated', label: 'Có ảnh' },
            { id: 'empty', label: 'Trống' },
            { id: 'loading', label: 'Đang tải' },
            { id: 'error', label: 'Lỗi' },
          ] as { id: LibraryStateMode; label: string }[]).map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setLibraryState(st.id)}
              className={`px-2 py-1 rounded-md transition ${
                libraryState === st.id
                  ? 'bg-white/15 text-[#F8FAFC] font-medium'
                  : 'text-[#64748B] hover:text-[#94A3B8]'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {statusNotice && (
        <div className="px-3 py-2 rounded-xl bg-[#111C30] border border-[#E2B74B]/40 text-xs text-[#E2B74B]">
          {statusNotice}
        </div>
      )}

      {/* Multi-select batch action bar */}
      {multiSelect && selectedIds.length > 0 && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#17253D] border border-[#E2B74B]/30">
          <span className="text-xs font-medium text-[#F8FAFC]">
            Đã chọn {selectedIds.length} mục
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onTriggerExportSheet(items.filter((i) => selectedIds.includes(i.id)))}
              className="min-h-[36px] px-3 rounded-lg bg-[#E2B74B] text-[#060B14] text-xs font-semibold flex items-center gap-1"
            >
              <Share2 className="w-3.5 h-3.5" />
              Xuất ({selectedIds.length})
            </button>
            <button
              type="button"
              onClick={() => {
                onDeleteItems(selectedIds);
                setSelectedIds([]);
              }}
              className="min-h-[36px] px-3 rounded-lg bg-[#EF4444]/15 text-[#EF4444] text-xs font-medium flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Xóa
            </button>
          </div>
        </div>
      )}

      {/* 4 Library States */}
      {effectiveState === 'loading' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 py-2">
          {[1, 2, 3, 4].map((idx) => (
            <div
              key={idx}
              className="aspect-[4/3] rounded-2xl bg-[#111C30] animate-pulse border border-white/[0.05]"
            />
          ))}
        </div>
      )}

      {effectiveState === 'error' && (
        <div className="py-12 px-4 rounded-2xl bg-[#0D1626] border border-[#EF4444]/25 text-center space-y-3">
          <AlertTriangle className="w-9 h-9 text-[#EF4444] mx-auto" />
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-[#F8FAFC]">Không thể đọc bộ nhớ thư viện dự án</h2>
            <p className="text-xs text-[#94A3B8] max-w-sm mx-auto">
              Quyền truy cập tệp cục bộ đang bị tạm khóa hoặc tệp chỉ mục bị gián đoạn (Trạng thái kiểm thử lỗi).
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLibraryState('populated')}
            className="min-h-[44px] px-4 rounded-xl bg-[#17253D] hover:bg-[#1F3150] text-xs font-semibold text-[#E2B74B] inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-4 h-4" />
            Thử tải lại
          </button>
        </div>
      )}

      {effectiveState === 'empty' && (
        <div className="py-12 px-4 rounded-2xl bg-[#0D1626] border border-white/[0.08] text-center space-y-3">
          <FolderOpen className="w-9 h-9 text-[#64748B] mx-auto" />
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-[#F8FAFC]">Chưa có ảnh hoặc video trong thư viện</h2>
            <p className="text-xs text-[#94A3B8] max-w-sm mx-auto">
              Chụp ảnh trực tiếp từ Camera APK hoặc chọn ảnh từ thiết bị để bắt đầu đóng dấu thời gian.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenCamera}
            className="min-h-[44px] px-4 rounded-xl bg-[#E2B74B] text-[#060B14] text-xs font-bold inline-flex items-center gap-1.5"
          >
            Mở Camera ngay
          </button>
        </div>
      )}

      {effectiveState === 'populated' && (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3'
              : 'flex flex-col divide-y divide-white/[0.07]'
          }
        >
          {filteredItems.map((item) => {
            const isSelected = selectedIds.includes(item.id);
            const isActive = item.id === activeMediaId;
            const originLabel =
              item.origin === 'saved-project' ? 'Đã lưu dự án' : 'Ảnh mới chọn';

            if (viewMode === 'list') {
              return (
                <div
                  key={item.id}
                  onClick={() => (multiSelect ? toggleSelect(item.id) : openLightbox(item))}
                  className={`py-2.5 px-2 flex items-center gap-3 cursor-pointer rounded-xl transition hover:bg-white/[0.03] ${
                    isActive ? 'bg-[#111C30]' : ''
                  }`}
                >
                  {multiSelect && (
                    <span
                      className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-[#E2B74B] border-[#E2B74B] text-[#060B14]'
                          : 'border-white/30'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </span>
                  )}

                  <div className="relative w-16 h-12 rounded-lg overflow-hidden bg-[#060B14] shrink-0">
                    <img
                      src={item.url}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    {item.kind === 'video' && (
                      <span className="absolute inset-0 bg-black/35 flex items-center justify-center">
                        <Play className="w-4 h-4 text-white fill-white" />
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-medium text-[#F8FAFC] truncate">
                      {item.title}
                    </div>
                    <div className="text-[11.5px] text-[#94A3B8] truncate flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono-tabular text-[#E2B74B]">{item.photoCode}</span>
                      <span>·</span>
                      <span className={item.origin === 'saved-project' ? 'text-emerald-400' : 'text-sky-400'}>
                        {originLabel}
                      </span>
                      <span>·</span>
                      <span className="font-mono-tabular">{item.createdAt.slice(0, 10)}</span>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={item.id}
                onClick={() => (multiSelect ? toggleSelect(item.id) : openLightbox(item))}
                className={`group rounded-2xl overflow-hidden bg-[#111C30] border transition cursor-pointer ${
                  isSelected || isActive
                    ? 'border-[#E2B74B]'
                    : 'border-white/[0.08] hover:border-white/25'
                }`}
              >
                <div className="relative aspect-[4/3] bg-[#060B14] overflow-hidden">
                  <img
                    src={item.url}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                  />

                  {item.kind === 'video' && (
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/75 text-white text-[11px] font-mono-tabular flex items-center gap-1">
                      <Film className="w-3 h-3 text-[#E2B74B]" />
                      <span>{formatDuration(item.durationSec)}</span>
                    </div>
                  )}

                  {multiSelect && (
                    <div
                      className={`absolute top-2 right-2 w-6 h-6 rounded-lg border flex items-center justify-center ${
                        isSelected
                          ? 'bg-[#E2B74B] border-[#E2B74B] text-[#060B14]'
                          : 'bg-black/50 border-white/50'
                      }`}
                    >
                      {isSelected && <Check className="w-4 h-4" />}
                    </div>
                  )}
                </div>

                <div className="p-2.5 space-y-1">
                  <div className="text-[13px] font-medium text-[#F8FAFC] truncate">
                    {item.title}
                  </div>
                  {/* Zero-Pill clean typographic metadata */}
                  <div className="text-[11px] text-[#94A3B8] flex items-center gap-1.5 truncate">
                    <span className={item.origin === 'saved-project' ? 'text-emerald-400 font-medium' : 'text-sky-400 font-medium'}>
                      {originLabel}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-tabular">{item.photoCode}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Viewer & Inline Stamp Metadata Editor */}
      {lightboxItem && (
        <div className="fixed inset-0 z-50 bg-[#04070E]/95 backdrop-blur-md flex flex-col">
          <div
            className="flex items-center justify-between px-3 py-2.5 border-b border-white/10"
            style={{ paddingTop: 'max(10px, var(--hnl-safe-top))' }}
          >
            <button
              type="button"
              onClick={() => setLightboxItem(null)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-white/10 text-white"
              aria-label="Đóng xem ảnh lớn"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="min-w-0 text-center">
              <div className="text-sm font-semibold text-[#F8FAFC] truncate">
                {lightboxItem.title}
              </div>
              <div className="text-[11px] text-[#94A3B8] font-mono-tabular">
                {lightboxItem.origin === 'saved-project' ? 'Đã lưu dự án' : 'Ảnh mới chọn'} ·{' '}
                {lightboxItem.resolutionLabel}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEditingMetadata((e) => !e)}
              className={`min-h-[40px] px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${
                editingMetadata
                  ? 'bg-[#E2B74B] text-[#060B14]'
                  : 'bg-[#111C30] text-[#E2B74B] border border-white/10'
              }`}
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Sửa dấu</span>
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col lg:flex-row gap-4 items-center justify-center">
            <div className="relative w-full max-w-2xl aspect-[4/3] rounded-2xl overflow-hidden bg-black border border-white/10 shrink-0">
              <img
                src={lightboxItem.url}
                alt={lightboxItem.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <WatermarkOverlay
                config={{
                  ...watermarkConfig,
                  templateId: lightboxItem.templateId,
                  dateTimeIso: lightboxItem.createdAt,
                  locationText: lightboxItem.location,
                  coordinates: lightboxItem.coordinates,
                  customNote: lightboxItem.customNote,
                }}
              />
            </div>

            {editingMetadata && (
              <div className="w-full max-w-md rounded-2xl bg-[#111C30] border border-white/10 p-4 space-y-3">
                <div className="text-sm font-semibold text-[#F8FAFC]">
                  Sửa lại dấu ngày giờ &amp; thông tin ảnh
                </div>
                <div className="space-y-2">
                  <label className="block space-y-1">
                    <span className="text-xs text-[#94A3B8]">Ngày giờ chụp</span>
                    <input
                      type="datetime-local"
                      value={draftDate}
                      onChange={(e) => setDraftDate(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-lg bg-[#0B1424] border border-white/10 text-[13px] text-white"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs text-[#94A3B8]">Mã ảnh</span>
                    <input
                      type="text"
                      value={draftCode}
                      onChange={(e) => setDraftCode(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-lg bg-[#0B1424] border border-white/10 text-[13px] text-white font-mono-tabular"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs text-[#94A3B8]">Địa điểm</span>
                    <input
                      type="text"
                      value={draftLocation}
                      onChange={(e) => setDraftLocation(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-lg bg-[#0B1424] border border-white/10 text-[13px] text-white"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs text-[#94A3B8]">Tọa độ GPS</span>
                    <input
                      type="text"
                      value={draftCoords}
                      onChange={(e) => setDraftCoords(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-lg bg-[#0B1424] border border-white/10 text-[13px] text-white font-mono-tabular"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs text-[#94A3B8]">Ghi chú tùy chỉnh</span>
                    <input
                      type="text"
                      value={draftNote}
                      onChange={(e) => setDraftNote(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-lg bg-[#0B1424] border border-white/10 text-[13px] text-white"
                    />
                  </label>
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditingMetadata(false)}
                    className="min-h-[40px] px-3.5 rounded-xl bg-white/[0.06] text-xs font-medium text-[#94A3B8]"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveMetadata}
                    className="min-h-[40px] px-4 rounded-xl bg-[#E2B74B] text-[#060B14] text-xs font-bold"
                  >
                    Áp dụng thay đổi
                  </button>
                </div>
              </div>
            )}
          </div>

          <div
            className="px-4 py-3 border-t border-white/10 bg-[#0B1424] flex items-center justify-center gap-3"
            style={{ paddingBottom: 'max(14px, var(--hnl-safe-bottom))' }}
          >
            <button
              type="button"
              onClick={() => {
                const target = lightboxItem;
                setLightboxItem(null);
                onEditMediaInEditor(target);
              }}
              className="min-h-[44px] px-4 rounded-xl bg-[#111C30] border border-white/10 text-xs font-semibold text-[#F8FAFC] flex items-center gap-1.5"
            >
              <Sliders className="w-4 h-4 text-[#E2B74B]" />
              Chỉnh sửa ảnh
            </button>
            <button
              type="button"
              onClick={() => {
                const target = lightboxItem;
                setLightboxItem(null);
                onTriggerExportSheet([target]);
              }}
              className="min-h-[44px] px-5 rounded-xl bg-[#E2B74B] text-[#060B14] text-xs font-bold flex items-center gap-1.5"
            >
              <Share2 className="w-4 h-4" />
              Lưu / Chia sẻ
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
