import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../services/db';
import type { GalleryAlbum, GalleryImage, SubscriptionYear } from '../../services/db';
import { 
  Image as ImageIcon, Plus, Search, Calendar, 
  Trash2, CheckCircle, AlertCircle, 
  X, Loader2, Upload 
} from 'lucide-react';
import { YearFilter } from '../../components/YearFilter';

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
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([
    'https://images.unsplash.com/photo-1542810634-71277d95dcbb?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?auto=format&fit=crop&q=80&w=800',
  ]);
  const [coverIndex, setCoverIndex] = useState(0);

  const [isSaving, setIsSaving] = useState(false);
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
    setUploadedImageUrls([
      'https://images.unsplash.com/photo-1542810634-71277d95dcbb?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?auto=format&fit=crop&q=80&w=800',
    ]);
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

  const handleDeleteAlbum = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this gallery album and all photos?')) return;
    try {
      await db.galleryAlbums.delete(id);
      showToast('success', 'Album deleted successfully');
      if (selectedAlbum?.id === id) setSelectedAlbum(null);
      loadData();
    } catch (err) {
      showToast('error', 'Failed to delete album');
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
      <div className="canvas-header-bar margin-bottom">
        <div className="canvas-title-group">
          <div className="canvas-title-icon-box">
            <ImageIcon size={20} color="#ffffff" />
          </div>
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
      <div className="glass-card filter-bar margin-bottom">
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
        <div className="report-stats-grid">
          {filteredAlbums.map((album) => (
            <div key={album.id} className="glass-card album-card-wrapper" onClick={() => openAlbumDetail(album)}>
              <div className="album-cover-box">
                <img src={album.cover_image || 'https://images.unsplash.com/photo-1542810634-71277d95dcbb?auto=format&fit=crop&q=80&w=800'} alt={album.title} />
                <span className="album-type-badge">{album.programme_type}</span>
              </div>
              <div className="album-info-body padding">
                <h3 className="summary-card-title">{album.title}</h3>
                <p className="font-xs text-muted margin-top"><Calendar size={12} /> {album.event_date} • {album.venue || 'Mahall'}</p>
                <div className="album-card-footer margin-top">
                  <span className="badge-pill success">{album.visibility}</span>
                  <button className="action-btn delete" onClick={(e) => handleDeleteAlbum(album.id, e)}><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ALBUM DETAIL LIGHTBOX */}
      {selectedAlbum && (
        <div className="modal-overlay">
          <div className="modal-dialog-card glass-card animate-fade-in" style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <div>
                <h3>{selectedAlbum.title}</h3>
                <p className="font-xs text-muted">{selectedAlbum.event_date} • {selectedAlbum.venue}</p>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedAlbum(null)}><X size={18} /></button>
            </div>

            <div className="modal-body-scroll">
              <p className="font-sm margin-bottom">{selectedAlbum.description || 'Programme event gallery photographs'}</p>

              <div className="gallery-photo-grid">
                {albumImages.length === 0 ? (
                  <p className="font-xs text-muted">No images loaded yet.</p>
                ) : (
                  albumImages.map((img) => (
                    <div key={img.id} className="photo-thumb-box">
                      <img src={img.image_url} alt={img.caption || 'Gallery photo'} />
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="pill-btn-secondary" onClick={() => setSelectedAlbum(null)}>Close</button>
              <button className="pill-btn-danger" onClick={() => handleDeleteAlbum(selectedAlbum.id)}>Delete Album</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD ALBUM MODAL */}
      {isAlbumModalOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog-card glass-card animate-fade-in">
            <div className="modal-header">
              <h3>+ Add Gallery Album</h3>
              <button className="modal-close-btn" onClick={() => setIsAlbumModalOpen(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveAlbum} className="modal-body-scroll">
              <div className="form-group">
                <label>Album Title *</label>
                <input type="text" required placeholder="e.g. Rabeeh Programme 2026" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>

              <div className="form-row-grid">
                <div className="form-group">
                  <label>Programme Type</label>
                  <select value={programmeType} onChange={(e) => setProgrammeType(e.target.value)}>
                    <option value="Religious Programme">Religious Programme</option>
                    <option value="Educational Programme">Educational Programme</option>
                    <option value="Community Programme">Community Programme</option>
                    <option value="Ramadan Programme">Ramadan Programme</option>
                    <option value="Eid Programme">Eid Programme</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Event Date *</label>
                  <input type="date" required value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label>Venue</label>
                <input type="text" value={venue} onChange={(e) => setVenue(e.target.value)} />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>

              {/* Multi-Image Drag & Drop Simulation */}
              <div className="form-group">
                <label>Images (Previews & Cover Selection)</label>
                <div className="upload-dropzone margin-y text-center padding border-dashed">
                  <Upload size={24} className="text-emerald" />
                  <p className="font-xs">JPG, PNG, WEBP files supported.</p>
                </div>
                <div className="flex-row-gap">
                  {uploadedImageUrls.map((url, idx) => (
                    <div
                      key={idx}
                      className={`photo-preview-chip ${coverIndex === idx ? 'cover-selected' : ''}`}
                      onClick={() => setCoverIndex(idx)}
                    >
                      <img src={url} alt={`preview ${idx}`} />
                      {coverIndex === idx && <span className="cover-badge">Cover</span>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="pill-btn-secondary" onClick={() => setIsAlbumModalOpen(false)}>Cancel</button>
                <button type="submit" className="pill-btn-primary" disabled={isSaving}>Save Album</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Gallery;
