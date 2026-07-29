import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../services/db';
import type { GalleryAlbum, GalleryImage, SubscriptionYear } from '../../services/db';
import { 
  Image as ImageIcon, Plus, Search, Calendar, 
  Trash2, CheckCircle, AlertCircle, 
  Loader2, Upload, Download, Eye, MapPin,
  ChevronLeft, ChevronRight, Edit3, Settings 
} from 'lucide-react';
import { YearFilter } from '../../components/YearFilter';
import { Modal } from '../../components/Modal';
import { SidePanel } from '../../components/SidePanel';
import { ConfirmModal } from '../../components/ConfirmModal';

// Canvas image compressor utility
const compressImage = (file: File, maxWidth = 1400, quality = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export const Gallery: React.FC = () => {
  // Data States
  const [albums, setAlbums] = useState<GalleryAlbum[]>([]);
  const [years, setYears] = useState<SubscriptionYear[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');

  // Selected Album for Lightbox Detail
  const [selectedAlbum, setSelectedAlbum] = useState<GalleryAlbum | null>(null);
  const [albumImages, setAlbumImages] = useState<GalleryImage[]>([]);

  // Modals
  const [isAlbumModalOpen, setIsAlbumModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [currentId, setCurrentId] = useState<string | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [programmeType, setProgrammeType] = useState('Religious Programme');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [venue, setVenue] = useState('Vellikkeel Mahall');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'published' | 'draft'>('published');
  const [relatedCampaignId, setRelatedCampaignId] = useState('');
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);

  // Dynamic Programme Types State
  const [programmeTypes, setProgrammeTypes] = useState<string[]>(() => {
    const saved = localStorage.getItem('mahall_programme_types');
    return saved ? JSON.parse(saved) : ['Religious Programme', 'Educational Programme', 'Community Programme', 'Ramadan Programme', 'Eid Programme'];
  });
  const [isManageTypesOpen, setIsManageTypesOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [editingTypeIndex, setEditingTypeIndex] = useState<number | null>(null);
  const [editingTypeName, setEditingTypeName] = useState('');
  const [isCompressingPhotos, setIsCompressingPhotos] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const handleAddProgrammeType = () => {
    if (!newTypeName.trim()) return;
    const name = newTypeName.trim();
    if (programmeTypes.includes(name)) {
      showToast('error', 'Programme type already exists');
      return;
    }
    const updated = [...programmeTypes, name];
    setProgrammeTypes(updated);
    localStorage.setItem('mahall_programme_types', JSON.stringify(updated));
    setNewTypeName('');
    showToast('success', `Added "${name}" programme type`);
  };

  const handleEditProgrammeType = (index: number) => {
    if (!editingTypeName.trim()) return;
    const name = editingTypeName.trim();
    const updated = [...programmeTypes];
    updated[index] = name;
    setProgrammeTypes(updated);
    localStorage.setItem('mahall_programme_types', JSON.stringify(updated));
    setEditingTypeIndex(null);
    setEditingTypeName('');
    showToast('success', 'Programme type updated');
  };

  const handleDeleteProgrammeType = (index: number) => {
    const typeToRemove = programmeTypes[index];
    const updated = programmeTypes.filter((_, idx) => idx !== index);
    setProgrammeTypes(updated);
    localStorage.setItem('mahall_programme_types', JSON.stringify(updated));
    if (programmeType === typeToRemove) {
      setProgrammeType(updated[0] || 'General Programme');
    }
    showToast('success', `Removed "${typeToRemove}"`);
  };

  const [isSaving, setIsSaving] = useState(false);
  const [albumToDelete, setAlbumToDelete] = useState<GalleryAlbum | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [albumList, yearList] = await Promise.all([
        db.galleryAlbums.get(),
        db.years.get(),
      ]);
      setAlbums(albumList);
      setYears(yearList);
    } catch (err) {
      console.error('Failed to load gallery albums:', err);
      showToast('error', 'Failed to load gallery albums');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredAlbums = useMemo(() => {
    // Resolve the selected year's numeric value from subscription_years
    const selectedYear = years.find((y) => y.id === selectedYearId)?.year ?? null;

    return albums.filter((a) => {
      const matchSearch =
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.description && a.description.toLowerCase().includes(searchQuery.toLowerCase()));

      // Compare year extracted from event_date against numeric year from subscription_years
      const matchYear = !selectedYearId || !selectedYear ||
        new Date(a.event_date).getFullYear() === selectedYear;
      const matchType = !selectedType || a.programme_type === selectedType;

      return matchSearch && matchYear && matchType;
    });
  }, [albums, searchQuery, selectedYearId, selectedType, years]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedYearId, selectedType]);

  const totalPages = Math.ceil(filteredAlbums.length / itemsPerPage) || 1;
  const paginatedAlbums = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredAlbums.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredAlbums, currentPage, itemsPerPage]);

  const openAlbumDetail = async (album: GalleryAlbum) => {
    setSelectedAlbum(album);
    try {
      const imgs = await db.galleryImages.getByAlbum(album.id);
      setAlbumImages(imgs);
    } catch (e) {
      console.error('Error fetching album images:', e);
    }
  };

  const openAddModal = () => {
    setModalMode('add');
    setCurrentId(null);
    setTitle('');
    setProgrammeType('Religious Programme');
    setEventDate(new Date().toISOString().split('T')[0]);
    setVenue('Vellikkeel Mahall');
    setDescription('');
    setVisibility('published');
    setRelatedCampaignId('');
    setUploadedImageUrls([]);
    setCoverIndex(0);
    setIsAlbumModalOpen(true);
  };

  const handleSaveAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('error', 'Album title is required');
      return;
    }

    setIsSaving(true);
    try {
      const cover = uploadedImageUrls[coverIndex] || uploadedImageUrls[0] || null;
      const year = new Date(eventDate).getFullYear();

      const payload: Omit<GalleryAlbum, 'id' | 'created_at' | 'updated_at'> = {
        title: title.trim(),
        programme_type: programmeType,
        event_date: eventDate,
        year: year,
        venue: venue.trim() || null,
        description: description.trim() || null,
        cover_image: cover,
        visibility: visibility,
        related_campaign_id: relatedCampaignId || null,
        created_by: null,
      };

      if (modalMode === 'add') {
        const newAlbum = await db.galleryAlbums.create(payload);
        // Add uploaded images
        await Promise.all(
          uploadedImageUrls.map((url, idx) =>
            db.galleryImages.create({
              album_id: newAlbum.id,
              image_url: url,
              caption: `${title} image ${idx + 1}`,
              sort_order: idx,
            })
          )
        );
        showToast('success', 'Gallery album created successfully');
      } else if (currentId) {
        await db.galleryAlbums.update(currentId, payload);
        showToast('success', 'Gallery album updated');
      }

      setIsAlbumModalOpen(false);
      loadData();
    } catch (err) {
      console.error('Error saving album:', err);
      showToast('error', 'Failed to save album');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAlbum = (album: GalleryAlbum, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setAlbumToDelete(album);
  };

  const handleConfirmDeleteAlbum = async () => {
    if (!albumToDelete) return;
    setIsDeleting(true);
    try {
      await db.galleryAlbums.delete(albumToDelete.id);
      showToast('success', `Album "${albumToDelete.title}" deleted successfully`);
      if (selectedAlbum?.id === albumToDelete.id) setSelectedAlbum(null);
      setAlbumToDelete(null);
      loadData();
    } catch (err) {
      showToast('error', 'Failed to delete album');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsCompressingPhotos(true);
    let addedCount = 0;
    try {
      for (const file of Array.from(files)) {
        if (file.size > 8 * 1024 * 1024) {
          showToast('error', `"${file.name}" exceeds 8MB size limit. Skipped.`);
          continue;
        }
        const compressedDataUrl = await compressImage(file);
        setUploadedImageUrls((prev) => [...prev, compressedDataUrl]);
        addedCount++;
      }
      if (addedCount > 0) {
        showToast('success', `${addedCount} photo(s) compressed & added successfully!`);
      }
    } catch (err) {
      showToast('error', 'Error processing selected photo files.');
    } finally {
      setIsCompressingPhotos(false);
    }
  };

  const handleRemoveUploadedPhoto = (indexToRemove: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setUploadedImageUrls((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    if (coverIndex === indexToRemove) {
      setCoverIndex(0);
    } else if (coverIndex > indexToRemove) {
      setCoverIndex((prev) => prev - 1);
    }
  };

  const handleDownloadAlbum = async (album: GalleryAlbum, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const images = await db.galleryImages.getByAlbum(album.id);
      const downloadUrl = images[0]?.image_url || album.cover_image || 'https://images.unsplash.com/photo-1542810634-71277d95dcbb?auto=format&fit=crop&q=80&w=800';
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${album.title.replace(/\s+/g, '_')}_Cover.jpg`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast('success', `Downloading photos for "${album.title}"...`);
    } catch (err) {
      showToast('error', 'Could not download album photos.');
    }
  };

  return (
    <div className="gallery-page animate-fade-in">
      {/* Toast */}
      {toastMessage && (
        <div className={`toast-notification ${toastMessage.type}`}>
          {toastMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="canvas-header-bar margin-bottom-lg">
        <div className="canvas-title-group">
          <div>
            <h2 className="canvas-page-title">Gallery & Programme Archives</h2>
            <p className="summary-card-sub">Manage Mahall programmes, events, and community photographs.</p>
          </div>
        </div>

        <div className="header-action-btns">
          <button className="pill-btn-primary" onClick={openAddModal}>
            <Plus size={16} />
            <span>+ Add Gallery Album</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-card filter-bar margin-bottom-lg">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search albums by title or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-selectors-grid">
          <YearFilter selectedYearId={selectedYearId} onChange={setSelectedYearId} showAllOption={true} />

          <select className="custom-select-pill" value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
            <option value="">All Programme Types</option>
            {programmeTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ALBUMS VISUAL GRID */}
      {loading ? (
        <div className="loading-spinner-box"><Loader2 size={24} className="spinner" /></div>
      ) : filteredAlbums.length === 0 ? (
        <div className="glass-card notif-empty">No gallery albums found matching filters.</div>
      ) : (
        <>
          <div className="gallery-albums-grid">
            {paginatedAlbums.map((album, idx) => (
              <div
                key={album.id}
                className="gallery-album-card scroll-animate-card"
                style={{ animationDelay: `${idx * 60}ms` }}
                onClick={() => openAlbumDetail(album)}
              >
                <div className="album-card-media">
                  <img
                    src={album.cover_image || 'https://images.unsplash.com/photo-1542810634-71277d95dcbb?auto=format&fit=crop&q=80&w=800'}
                    alt={album.title}
                    loading="lazy"
                  />
                  <div className="album-card-scrim" />
                  <div className="album-card-top-badges">
                    <span className="album-type-chip">{album.programme_type || 'Programme'}</span>
                    <span className="album-count-chip">
                      <ImageIcon size={12} />
                      <span>Album</span>
                    </span>
                  </div>
                </div>

                <div className="album-card-content">
                  <h3 className="album-card-title" title={album.title}>
                    {album.title}
                  </h3>

                  <div className="album-card-meta">
                    <div className="album-meta-item">
                      <Calendar size={13} className="text-emerald" />
                      <span>{album.event_date}</span>
                    </div>
                    {album.venue && (
                      <div className="album-meta-item">
                        <MapPin size={13} className="text-emerald" />
                        <span>{album.venue}</span>
                      </div>
                    )}
                  </div>

                  {album.description && (
                    <p className="album-card-description">{album.description}</p>
                  )}

                  <div className="album-card-actions">
                    <button
                      type="button"
                      className="album-btn-download"
                      onClick={(e) => handleDownloadAlbum(album, e)}
                      title="Download high-resolution photos"
                    >
                      <Download size={14} />
                      <span>Download</span>
                    </button>

                    <button
                      type="button"
                      className="album-btn-view"
                      onClick={() => openAlbumDetail(album)}
                    >
                      <Eye size={14} />
                      <span>View Album</span>
                    </button>

                    <button
                      type="button"
                      className="album-btn-delete"
                      onClick={(e) => handleDeleteAlbum(album, e)}
                      title="Delete album"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* GALLERY PAGINATION BAR */}
          {filteredAlbums.length > itemsPerPage && (
            <div className="glass-card padding-md margin-top-lg flex-between align-items-center flex-wrap gap-md">
              <span className="font-xs color-subtle font-weight-700">
                Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredAlbums.length)} of {filteredAlbums.length} albums
              </span>

              <div className="flex-row-gap-xs align-items-center">
                <button
                  type="button"
                  className="pill-btn-ghost font-xs"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                >
                  <ChevronLeft size={15} /> Prev
                </button>

                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pg) => (
                  <button
                    key={pg}
                    type="button"
                    className={`pagination-num-btn ${currentPage === pg ? 'active' : ''}`}
                    onClick={() => setCurrentPage(pg)}
                  >
                    {pg}
                  </button>
                ))}

                <button
                  type="button"
                  className="pill-btn-ghost font-xs"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                >
                  Next <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ALBUM DETAIL LIGHTBOX MODAL */}
      <Modal
        isOpen={Boolean(selectedAlbum)}
        onClose={() => setSelectedAlbum(null)}
        title={selectedAlbum?.title || ''}
        subtitle={`${selectedAlbum?.event_date} • ${selectedAlbum?.venue || 'Mahall Central'}`}
        icon={<ImageIcon size={20} />}
        size="lg"
        footer={
          <div className="album-modal-footer-wrap">
            <button className="album-footer-btn danger" onClick={() => selectedAlbum && handleDeleteAlbum(selectedAlbum)}>
              <Trash2 size={15} /> Delete Album
            </button>
            <div className="album-footer-actions-right">
              {selectedAlbum && (
                <button className="album-footer-btn primary" onClick={() => handleDownloadAlbum(selectedAlbum)}>
                  <Download size={15} /> Download Photos
                </button>
              )}
              <button className="album-footer-btn secondary" onClick={() => setSelectedAlbum(null)}>
                Close
              </button>
            </div>
          </div>
        }
      >
        {selectedAlbum && (
          <div className="flex-col gap-md">
            <p className="font-sm color-subtle margin-0">{selectedAlbum.description || 'Programme event gallery photographs'}</p>

            <div className="gallery-photo-grid">
              {albumImages.length === 0 ? (
                <div className="notif-empty full-width">No images loaded in this album yet.</div>
              ) : (
                albumImages.map((img) => (
                  <div key={img.id} className="photo-preview-chip shadow-sm">
                    <img 
                      src={img.image_url} 
                      alt={img.caption || 'Gallery photo'} 
                      loading="lazy" 
                      decoding="async" 
                      style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 12, objectFit: 'cover' }}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ADD / EDIT ALBUM RIGHT SIDE PANEL */}
      <SidePanel
        isOpen={isAlbumModalOpen}
        onClose={() => setIsAlbumModalOpen(false)}
        title={modalMode === 'edit' ? 'Edit Gallery Album' : 'Create Gallery Album'}
        subtitle="Upload photos and organize community event albums."
        icon={<ImageIcon size={20} />}
        size="lg"
        footer={
          <>
            <button type="button" className="pill-btn-ghost" onClick={() => setIsAlbumModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="album-side-panel-form" className="pill-btn-primary" disabled={isSaving || isCompressingPhotos}>
              {isSaving ? 'Saving...' : modalMode === 'edit' ? 'Update Album' : 'Save Album'}
            </button>
          </>
        }
      >
        <form id="album-side-panel-form" onSubmit={handleSaveAlbum} className="flex-col gap-md">
          <div className="form-card">
            <div className="form-card-header margin-bottom-sm">
              <ImageIcon size={16} className="text-primary" />
              <span className="form-card-title margin-left-xs">Album Information</span>
            </div>

            <div className="flex-col gap-sm">
              <div className="form-group">
                <label className="form-label">Album Title *</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  placeholder="e.g. Rabeeh Programme 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="form-grid-2col">
                <div className="form-group">
                  <div className="flex-between align-items-center margin-bottom-xs">
                    <label className="form-label margin-bottom-0">Programme Type</label>
                    <button
                      type="button"
                      className="pill-btn-ghost font-xs padding-xs"
                      onClick={() => setIsManageTypesOpen(true)}
                      title="Manage Programme Types"
                    >
                      <Settings size={12} /> Manage Types
                    </button>
                  </div>
                  <select className="custom-select-pill" value={programmeType} onChange={(e) => setProgrammeType(e.target.value)}>
                    {programmeTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Event Date *</label>
                  <input type="date" className="form-control" required value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Venue</label>
                <input type="text" className="form-control" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="e.g. Mahall Auditorium" />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-control" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Album highlights..." />
              </div>
            </div>
          </div>

          <div className="form-card">
            <div className="form-card-header margin-bottom-sm">
              <Upload size={16} className="text-success" />
              <span className="form-card-title margin-left-xs">Dynamic Multi-Photo Upload</span>
            </div>

            {/* INTERACTIVE FILE DROPZONE */}
            <label htmlFor="file-upload-input" className="upload-dropzone margin-bottom-md cursor-pointer">
              {isCompressingPhotos ? (
                <>
                  <Loader2 size={28} className="spinner text-emerald" />
                  <div className="font-xs font-weight-700 text-dark">Optimizing & compressing photos...</div>
                </>
              ) : (
                <>
                  <Upload size={28} className="text-emerald" />
                  <div className="font-xs font-weight-700 text-dark">Click or Drag photos to upload</div>
                  <p className="font-xs color-subtle">JPG, PNG, WEBP files (Multiple selection allowed • Auto-optimized)</p>
                </>
              )}
              <input
                id="file-upload-input"
                type="file"
                multiple
                accept="image/*"
                className="display-none"
                onChange={handleFilesSelected}
              />
            </label>

            {/* COMPACT THUMBNAIL GRID */}
            {uploadedImageUrls.length > 0 && (
              <div className="upload-thumbnail-grid">
                {uploadedImageUrls.map((url, idx) => (
                  <div
                    key={idx}
                    className={`compact-photo-chip ${coverIndex === idx ? 'cover-selected' : ''}`}
                    onClick={() => setCoverIndex(idx)}
                    title="Click to set as Cover Image"
                  >
                    <img src={url} alt={`preview ${idx}`} />
                    {coverIndex === idx && <span className="chip-cover-pill">Cover</span>}
                    <button
                      type="button"
                      className="chip-remove-btn"
                      onClick={(e) => handleRemoveUploadedPhoto(idx, e)}
                      title="Remove photo"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>
      </SidePanel>

      {/* MANAGE PROGRAMME TYPES MODAL */}
      <Modal
        isOpen={isManageTypesOpen}
        onClose={() => setIsManageTypesOpen(false)}
        title="Manage Programme Types"
        subtitle="Add, edit, or remove programme categories for albums."
        icon={<Settings size={20} />}
        size="md"
        footer={
          <button className="pill-btn-ghost font-xs" onClick={() => setIsManageTypesOpen(false)}>
            Done
          </button>
        }
      >
        <div className="flex-col gap-md">
          {/* Add New Type Input */}
          <div className="flex-row-gap-xs align-items-center">
            <input
              type="text"
              className="form-control font-xs"
              placeholder="New Programme Type Name..."
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
            />
            <button type="button" className="pill-btn-primary font-xs" onClick={handleAddProgrammeType}>
              <Plus size={14} /> Add
            </button>
          </div>

          {/* List of Existing Types */}
          <div className="flex-col gap-xs margin-top-xs">
            {programmeTypes.map((type, idx) => (
              <div key={type} className="glass-card padding-xs flex-between align-items-center">
                {editingTypeIndex === idx ? (
                  <div className="flex-row-gap-xs width-100">
                    <input
                      type="text"
                      className="form-control font-xs"
                      value={editingTypeName}
                      onChange={(e) => setEditingTypeName(e.target.value)}
                      autoFocus
                    />
                    <button type="button" className="pill-btn-primary font-xs" onClick={() => handleEditProgrammeType(idx)}>
                      Save
                    </button>
                    <button type="button" className="pill-btn-ghost font-xs" onClick={() => setEditingTypeIndex(null)}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="font-xs font-weight-600 text-dark">{type}</span>
                    <div className="flex-row-gap-xs">
                      <button
                        type="button"
                        className="pill-btn-ghost font-xs padding-xs"
                        onClick={() => {
                          setEditingTypeIndex(idx);
                          setEditingTypeName(type);
                        }}
                        title="Edit Type"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        type="button"
                        className="pill-btn-danger font-xs padding-xs"
                        onClick={() => handleDeleteProgrammeType(idx)}
                        title="Delete Type"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* CONFIRMATION POPUP MODAL FOR DELETING ALBUM */}
      <ConfirmModal
        isOpen={Boolean(albumToDelete)}
        onClose={() => setAlbumToDelete(null)}
        onConfirm={handleConfirmDeleteAlbum}
        title="Delete Gallery Album?"
        message={
          <>
            Are you sure you want to delete album <strong>"{albumToDelete?.title}"</strong> and all uploaded event photos? This action cannot be undone.
          </>
        }
        confirmText="Delete Album"
        isLoading={isDeleting}
      />
    </div>
  );
};

export default Gallery;
