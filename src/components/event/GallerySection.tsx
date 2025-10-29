"use client";

import { useState, useEffect } from "react";
import type { Event } from "~/types";

interface GallerySectionProps {
  event: Event;
}

export function GallerySection({ event }: GallerySectionProps) {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [deletingImage, setDeletingImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadGalleryImages();
  }, [event.id]);

  const loadGalleryImages = async () => {
    try {
      setLoading(true);
      
      // Chiama direttamente l'endpoint del webservice
      const res = await fetch('https://webservice.sballando.it/api/event/get_photos_event_gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: event.id.toString() }),
      });
      
      const data = await res.json();
      
      if (!data.status || !data.photos) {
        setImages([]);
        return;
      }

      // Aggiungi il dominio base a tutti i path delle foto
      const photos = data.photos.map((photo: string) => {
        return `https://webservice.sballando.it${photo}`;
      });

      setImages(photos);
    } catch (err) {
      console.error('Errore nel caricamento della galleria:', err);
      setImages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePhoto = async (photoUrl: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Previeni l'apertura della modale

    if (!confirm('Sei sicuro di voler eliminare questa foto?')) {
      return;
    }

    setDeletingImage(photoUrl);

    try {
      const res = await fetch('/api/events/gallery/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: event.id.toString(),
          photo_url: photoUrl
        }),
      });

      const data = await res.json();

      if (data.status) {
        // Rimuovi l'immagine dalla lista
        setImages(prev => prev.filter(img => img !== photoUrl));
        
        // Chiudi la modale se l'immagine eliminata era quella selezionata
        if (selectedImage === photoUrl) {
          setSelectedImage(null);
        }
      } else {
        alert(`Errore: ${data.error || 'Impossibile eliminare la foto'}`);
      }
    } catch (err) {
      console.error('Errore nell\'eliminazione della foto:', err);
      alert('Errore nella cancellazione della foto');
    } finally {
      setDeletingImage(null);
    }
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Verifica che sia un'immagine
    if (!file.type.startsWith('image/')) {
      alert('Per favore seleziona un file immagine valido');
      return;
    }

    // Verifica dimensione (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Il file è troppo grande. Dimensione massima: 10MB');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('event_id', event.id.toString());
      formData.append('photo', file);

      const res = await fetch('/api/events/gallery/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.status) {
        // Aggiungi la nuova foto alla lista
        setImages(prev => [...prev, data.photo]);
        alert('✅ Foto caricata con successo!');
      } else {
        alert(`❌ Errore: ${data.error || 'Impossibile caricare la foto'}`);
      }
    } catch (err) {
      console.error('Errore nel caricamento della foto:', err);
      alert('❌ Errore nel caricamento della foto');
    } finally {
      setUploading(false);
      // Reset input file
      e.target.value = '';
    }
  };

  if (loading) {
    return (
      <div className="bg-[#2A3441] rounded-lg p-8">
        <div className="flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          <span className="ml-3 text-white/60">Caricamento galleria...</span>
        </div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="bg-[#2A3441] rounded-lg p-8">
        <div className="text-center">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🖼️</span>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Nessuna foto nella galleria
          </h3>
          <p className="text-white/60 mb-6">
            Non ci sono ancora foto per questo evento
          </p>
          
          {/* Pulsante Upload per galleria vuota */}
          <div className="flex justify-center">
            <input
              type="file"
              id="gallery-upload-empty"
              accept="image/*"
              onChange={handleUploadPhoto}
              className="hidden"
              disabled={uploading}
            />
            <label
              htmlFor="gallery-upload-empty"
              className={`px-6 py-3 rounded-lg transition-colors flex items-center gap-2 cursor-pointer ${
                uploading
                  ? 'bg-[#FC0045]/50 text-white cursor-not-allowed'
                  : 'bg-[#FC0045] hover:bg-[#FC0045]/80 text-white'
              }`}
            >
              {uploading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Caricamento...
                </>
              ) : (
                <>
                  <span>📸</span>
                  Aggiungi Prima Foto
                </>
              )}
            </label>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-[#2A3441] rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              🖼️ Galleria Evento
            </h2>
            <p className="text-white/60 mt-1">
              {images.length} {images.length === 1 ? 'foto' : 'foto'}
            </p>
          </div>
          
          {/* Pulsante Upload */}
          <div>
            <input
              type="file"
              id="gallery-upload"
              accept="image/*"
              onChange={handleUploadPhoto}
              className="hidden"
              disabled={uploading}
            />
            <label
              htmlFor="gallery-upload"
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 cursor-pointer ${
                uploading
                  ? 'bg-[#FC0045]/50 text-white cursor-not-allowed'
                  : 'bg-[#FC0045] hover:bg-[#FC0045]/80 text-white'
              }`}
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Caricamento...
                </>
              ) : (
                <>
                  <span>📸</span>
                  Aggiungi Foto
                </>
              )}
            </label>
          </div>
        </div>

        {/* Griglia immagini */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {images.map((imgUrl, index) => (
            <div
              key={imgUrl}
              className="relative aspect-square rounded-lg overflow-hidden bg-white/5 border border-white/10 hover:border-[#FC0045]/50 transition-all group"
            >
              <div 
                className="w-full h-full cursor-pointer"
                onClick={() => setSelectedImage(imgUrl)}
              >
                <img
                  src={imgUrl}
                  alt={`Foto ${index + 1}`}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center pointer-events-none">
                  <span className="text-white text-2xl opacity-0 group-hover:opacity-100 transition-opacity">
                    🔍
                  </span>
                </div>
              </div>
              
              {/* Pulsante elimina */}
              <button
                onClick={(e) => handleDeletePhoto(imgUrl, e)}
                disabled={deletingImage === imgUrl}
                className={`absolute top-2 right-2 w-9 h-9 rounded-full flex items-center justify-center transition-all z-10 ${
                  deletingImage === imgUrl
                    ? 'bg-red-500/50 cursor-not-allowed'
                    : 'bg-red-500/80 hover:bg-red-500 opacity-0 group-hover:opacity-100'
                }`}
                title="Elimina foto"
              >
                {deletingImage === imgUrl ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <span className="text-white text-lg">🗑️</span>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Modal immagine a schermo intero */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-4 right-4 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white text-2xl transition-colors"
            onClick={() => setSelectedImage(null)}
          >
            ✕
          </button>
          <img
            src={selectedImage}
            alt="Anteprima"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-4 right-4 flex gap-3">
            <button
              onClick={(e) => handleDeletePhoto(selectedImage, e)}
              disabled={deletingImage === selectedImage}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                deletingImage === selectedImage
                  ? 'bg-red-500/50 text-white cursor-not-allowed'
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }`}
            >
              {deletingImage === selectedImage ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Eliminazione...
                </>
              ) : (
                <>
                  <span>🗑️</span>
                  Elimina
                </>
              )}
            </button>
            <a
              href={selectedImage}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-[#FC0045] hover:bg-[#FC0045]/80 text-white rounded-lg transition-colors flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <span>📥</span>
              Apri in nuova tab
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
