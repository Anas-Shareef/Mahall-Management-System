import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../services/db';
import type { GalleryAlbum, GalleryImage, SubscriptionYear } from '../../services/db';
import { 
  Image as ImageIcon, Plus, Search, Calendar, 
  Trash2, CheckCircle, AlertCircle, 
  Loader2, Upload, Download, Eye, MapPin,
  ChevronLeft, ChevronRight 
} from 'lucide-react';
import { YearFilter } from '../../components/YearFilter';
import { Modal } from '../../components/Modal';
import { SidePanel } from '../../components/SidePanel';
import { ConfirmModal } from '../../components/ConfirmModal';

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

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

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

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          setUploadedImageUrls((prev) => [...prev, evt.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
    showToast('success', `${files.length} photo(s) added`);
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

          <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
            <option value="">All Programme Types</option>
            <option value="Religious Programme">Religious Programme</option>
            <option value="Educational Programme">Educational Programme</option>
            <option value="Community Programme">Community Programme</option>
            <option value="Ramadan Programme">Ramadan Programme</option>
            <option value="Eid Programme">Eid Programme</option>
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
          <div className="flex-between width-100 align-items-center">
            <button className="pill-btn-danger font-xs" onClick={() => selectedAlbum && handleDeleteAlbum(selectedAlbum)}>
              <Trash2 size={14} /> Delete Album
            </button>
            <div className="flex-row-gap-xs">
              {selectedAlbum && (
                <button className="album-btn-download font-xs" onClick={() => handleDownloadAlbum(selectedAlbum)}>
                  <Download size={14} /> Download Photos
                </button>
              )}
              <button className="pill-btn-ghost font-xs" onClick={() => setSelectedAlbum(null)}>
                Close
              </button>
            </div>
          </div>
        }
      >
        {selectedAlbum && (
          <div className="flex-col gap-md">
            <p className="font-sm color-subtle">{selectedAlbum.description || 'Programme event gallery photographs'}</p>

            <div className="gallery-photo-grid">
              {albumImages.length === 0 ? (
                <div className="notif-empty full-width">No images loaded in this album yet.</div>
              ) : (
                albumImages.map((img) => (
                  <div key={img.id} className="photo-preview-chip shadow-sm">
                    <img src={img.image_url} alt={img.caption || 'Gallery photo'} />
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
            <button type="submit" form="album-side-panel-form" className="pill-btn-primary" disabled={isSaving}>
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
                  <label className="form-label">Programme Type</label>
                  <select className="form-control" value={programmeType} onChange={(e) => setProgrammeType(e.target.value)}>
                    <option value="Religious Programme">Religious Programme</option>
                    <option value="Educational Programme">Educational Programme</option>
                    <option value="Community Programme">Community Programme</option>
                    <option value="Ramadan Programme">Ramadan Programme</option>
                    <option value="Eid Programme">Eid Programme</option>
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
              <Upload size={28} className="text-emerald" />
              <div className="font-xs font-weight-700 text-dark">Click or Drag photos to upload</div>
              <p className="font-xs color-subtle">JPG, PNG, WEBP files supported (Select multiple files at once)</p>
              <input
                id="file-upload-input"
                type="file"
                multiple
                accept="image/*"
                className="display-none"
                onChange={handleFilesSelected}
              />
            </label>

            <div className="flex-between align-items-center margin-bottom-xs">
              <span className="form-label">Uploaded Photos ({uploadedImageUrls.length}) — Click thumbnail to set as Cover:</span>
              <button
                type="button"
                className="pill-btn-ghost font-xs"
                onClick={() => setUploadedImageUrls((prev) => [...prev, 'https://images.unsplash.com/photo-1542810634-71277d95dcbb?auto=format&fit=crop&q=80&w=800'])}
              >
                + Add Sample Photo
              </button>
            </div>

            {/* COMPACT THUMBNAIL GRID */}
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
          </div>
        </form>
      </SidePanel>

      {/* CONFIRMation POPUP MODAL FOR DELETING ALBUM */}
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
