import { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, Download, Loader2 } from "lucide-react";

interface PhotoLightboxProps {
    photos: string[];
    initialIndex?: number;
    isOpen: boolean;
    onClose: () => void;
}

export function PhotoLightbox({ photos, initialIndex = 0, isOpen, onClose }: PhotoLightboxProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [zoom, setZoom] = useState(1);
    const [isAnimating, setIsAnimating] = useState(false);
    const [imageLoading, setImageLoading] = useState(true);
    const [imageError, setImageError] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(initialIndex);
            setZoom(1);
            setImageLoading(true);
            setImageError(false);
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => { document.body.style.overflow = "unset"; };
    }, [isOpen, initialIndex]);

    if (!isOpen || photos.length === 0) return null;

    const next = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setIsAnimating(true);
        setTimeout(() => {
            setCurrentIndex((prev) => (prev + 1) % photos.length);
            setZoom(1);
            setIsAnimating(false);
        }, 200);
    };

    const prev = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setIsAnimating(true);
        setTimeout(() => {
            setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
            setZoom(1);
            setIsAnimating(false);
        }, 200);
    };

    const handleZoom = (e: React.MouseEvent) => {
        e.stopPropagation();
        setZoom(prev => prev === 1 ? 2 : 1);
    };

    return ReactDOM.createPortal(
        <div
            className="fixed inset-0 z-[10000] bg-black/95 backdrop-blur-xl flex flex-col animate-in fade-in duration-300"
            onClick={onClose}
        >
            {/* Header Controls */}
            <div className="flex items-center justify-between p-6 z-50">
                <div className="flex flex-col">
                    <span className="text-white font-black text-sm uppercase tracking-widest">Preuve d'Audit</span>
                    <span className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">
                        Photo {currentIndex + 1} sur {photos.length}
                    </span>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-white/10 rounded-2xl p-1 backdrop-blur-md border border-white/10">
                        <button onClick={(e) => { e.stopPropagation(); setZoom(z => Math.max(1, z - 0.5)); }} className="p-3 text-white hover:text-sonatel-orange transition-colors"><ZoomOut className="w-4 h-4" /></button>
                        <div className="w-px h-4 bg-white/10 mx-1" />
                        <button onClick={(e) => { e.stopPropagation(); setZoom(z => Math.min(3, z + 0.5)); }} className="p-3 text-white hover:text-sonatel-orange transition-colors"><ZoomIn className="w-4 h-4" /></button>
                    </div>

                    <button
                        onClick={() => window.open(photos[currentIndex], '_blank')}
                        className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/10 text-white hover:text-sonatel-orange transition-all border border-white/10"
                    >
                        <Maximize2 className="w-4 h-4" />
                    </button>

                    <button
                        onClick={onClose}
                        className="w-12 h-12 flex items-center justify-center rounded-2xl bg-sonatel-orange text-white hover:scale-110 active:scale-95 transition-all shadow-lg shadow-orange-500/20"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Main Container */}
            <div className="flex-1 relative flex items-center justify-center overflow-hidden p-4 md:p-12">
                {/* Navigation Buttons */}
                {photos.length > 1 && (
                    <>
                        <button
                            onClick={prev}
                            className="absolute left-8 z-50 w-16 h-16 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white transition-all backdrop-blur-md group"
                        >
                            <ChevronLeft className="w-8 h-8 group-hover:-translate-x-1 transition-transform" />
                        </button>
                        <button
                            onClick={next}
                            className="absolute right-8 z-50 w-16 h-16 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white transition-all backdrop-blur-md group"
                        >
                            <ChevronRight className="w-8 h-8 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </>
                )}

                {/* Image Display */}
                <div
                    className={`relative transition-all duration-500 ease-out flex items-center justify-center ${isAnimating ? "opacity-0 scale-95 blur-xl" : "opacity-100 scale-100 blur-0"}`}
                    style={{ transform: `scale(${zoom})`, cursor: zoom > 1 ? 'grab' : 'zoom-in' }}
                    onClick={handleZoom}
                >
                    {imageLoading && (
                        <div className="flex items-center justify-center">
                            <Loader2 className="h-12 w-12 text-white animate-spin" />
                        </div>
                    )}
                    {imageError ? (
                        <div className="flex flex-col items-center justify-center text-white/60">
                            <Download className="h-16 w-16 mb-4" />
                            <p className="text-lg font-medium">Impossible de charger l'image</p>
                            <p className="text-sm">URL: {photos[currentIndex]}</p>
                        </div>
                    ) : (
                        <img
                            src={photos[currentIndex]}
                            alt="Détail audit"
                            className={`max-w-full max-h-[75vh] object-contain rounded-3xl shadow-[0_40px_100px_rgba(0,0,0,0.5)] border border-white/10 ring-1 ring-white/5 ${imageLoading ? 'hidden' : 'block'}`}
                            onLoad={() => setImageLoading(false)}
                            onError={() => { setImageLoading(false); setImageError(true); }}
                        />
                    )}

                    {/* Label Rubrique Overlay */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-full flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-sonatel-orange shadow-[0_0_10px_rgba(255,102,0,0.5)] animate-pulse" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Inspection Certifiée DG/SECU</span>
                    </div>
                </div>
            </div>

            {/* Thumbnails Strip */}
            {photos.length > 1 && (
                <div className="p-8 flex justify-center gap-4 overflow-x-auto bg-gradient-to-t from-black to-transparent">
                    {photos.map((p, i) => (
                        <button
                            key={i}
                            onClick={(e) => { e.stopPropagation(); setCurrentIndex(i); setZoom(1); }}
                            className={`relative w-16 h-16 rounded-2xl overflow-hidden transition-all duration-300 ${i === currentIndex ? "ring-2 ring-sonatel-orange scale-110 shadow-lg shadow-orange-500/30" : "opacity-40 hover:opacity-100"}`}
                        >
                            <img src={p} className="w-full h-full object-cover" />
                        </button>
                    ))}
                </div>
            )}
        </div>,
        document.body
    );
}
