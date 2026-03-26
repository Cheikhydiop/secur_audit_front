import { useRef, useState, useCallback, useEffect } from "react";
import ReactDOM from "react-dom";
import { Camera, X, Check, RotateCcw, ImagePlus, Trash2, ZoomIn } from "lucide-react";

interface CameraCaptureProps {
    photos: string[];
    onPhotosChange: (photos: string[]) => void;
    onPhotoDelete?: (photoUrl: string) => void;
}

export function CameraCapture({ photos, onPhotosChange, onPhotoDelete }: CameraCaptureProps) {
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<"camera" | "preview">("camera");
    const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
    const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
    }, []);

    const startCamera = useCallback(async (facing: "environment" | "user") => {
        setCameraError(null);
        stopCamera();
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false,
            });
            streamRef.current = stream;
            // petit délai pour que le videoRef soit monté
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            }, 50);
        } catch {
            setCameraError("Accès caméra refusé. Autorisez dans les paramètres du navigateur.");
        }
    }, [stopCamera]);

    // Démarre la caméra quand le dialog s'ouvre
    useEffect(() => {
        if (open && mode === "camera") {
            startCamera(facingMode);
        }
        return () => {
            if (!open) stopCamera();
        };
    }, [open, mode]);

    // Nettoyage au démontage du composant
    useEffect(() => {
        return () => stopCamera();
    }, [stopCamera]);

    const handleClose = useCallback(() => {
        stopCamera();
        setOpen(false);
        setCapturedPhoto(null);
        setMode("camera");
        setCameraError(null);
    }, [stopCamera]);

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
        stopCamera();
        setCapturedPhoto(dataUrl);
        setMode("preview");
    };

    const resizeImage = (dataUrl: string): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1024;
                const MAX_HEIGHT = 1024;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    // Conversion en JPEG avec compression décente (0.8)
                    resolve(canvas.toDataURL('image/jpeg', 0.8));
                } else {
                    resolve(dataUrl); // Fallback
                }
            };
            img.src = dataUrl;
        });
    };

    const confirmPhoto = async () => {
        if (!capturedPhoto) return;
        const resized = await resizeImage(capturedPhoto);
        onPhotosChange([...photos, resized]);
        handleClose();
    };


    const retakePhoto = () => {
        setCapturedPhoto(null);
        setMode("camera");
    };

    const flipCamera = () => {
        const next = facingMode === "environment" ? "user" : "environment";
        setFacingMode(next);
        startCamera(next);
    };

    const removePhoto = (index: number) => {
        const removed = photos[index];
        onPhotosChange(photos.filter((_, i) => i !== index));
        if (onPhotoDelete && removed) {
            onPhotoDelete(removed);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const dataUrl = ev.target?.result as string;
            const resized = await resizeImage(dataUrl);
            onPhotosChange([...photos, resized]);
        };
        reader.readAsDataURL(file);
        e.target.value = "";
    };


    // ─── Modal rendu via createPortal (zéro Radix, zéro conflit DOM) ───
    const modal = open
        ? ReactDOM.createPortal(
            <div
                className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
                onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
            >
                <div
                    className="w-full max-w-lg rounded-3xl overflow-hidden bg-gray-950 shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-sonatel-orange/20 flex items-center justify-center">
                                <Camera className="w-4 h-4 text-sonatel-orange" />
                            </div>
                            <div>
                                <p className="text-sm font-black text-white">Capture Photo</p>
                                <p className="text-[11px] text-white/50">
                                    {mode === "camera"
                                        ? "Positionnez l'appareil puis capturez"
                                        : "Vérifiez avant de confirmer"}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleClose}
                            className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                        >
                            <X className="w-4 h-4 text-white" />
                        </button>
                    </div>

                    {/* Vidéo / Preview */}
                    <div className="relative bg-black" style={{ aspectRatio: "16/9" }}>
                        {cameraError ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6">
                                <div className="w-14 h-14 rounded-2xl bg-red-500/20 flex items-center justify-center">
                                    <Camera className="w-7 h-7 text-red-400" />
                                </div>
                                <p className="text-white/80 text-sm text-center font-medium">{cameraError}</p>
                                <button
                                    type="button"
                                    onClick={() => startCamera(facingMode)}
                                    className="px-4 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition-colors"
                                >
                                    Réessayer
                                </button>
                            </div>
                        ) : mode === "camera" ? (
                            <>
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-full h-full object-cover"
                                />
                                {/* Grille cadrage */}
                                <div
                                    className="absolute inset-0 pointer-events-none"
                                    style={{
                                        backgroundImage:
                                            "linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)",
                                        backgroundSize: "33.33% 33.33%",
                                    }}
                                />
                            </>
                        ) : capturedPhoto ? (
                            <img src={capturedPhoto} alt="Aperçu" className="w-full h-full object-cover" />
                        ) : null}
                    </div>

                    {/* Canvas caché */}
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Footer */}
                    <div className="px-5 py-5 bg-gray-950 flex items-center justify-between gap-4">
                        {mode === "camera" ? (
                            <>
                                <button
                                    type="button"
                                    onClick={flipCamera}
                                    className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                                    title="Changer de caméra"
                                >
                                    <RotateCcw className="w-5 h-5 text-white" />
                                </button>

                                <button
                                    type="button"
                                    onClick={capturePhoto}
                                    className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-xl hover:scale-95 active:scale-90 transition-transform"
                                    disabled={!!cameraError}
                                >
                                    <div className="w-12 h-12 rounded-full bg-sonatel-orange" />
                                </button>

                                <div className="w-11" />
                            </>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={retakePhoto}
                                    className="flex items-center gap-2 px-5 h-11 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-colors"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    Reprendre
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmPhoto}
                                    className="flex items-center gap-2 px-6 h-11 rounded-2xl bg-sonatel-orange hover:bg-orange-500 text-white font-bold text-sm transition-colors shadow-lg shadow-orange-500/30"
                                >
                                    <Check className="w-4 h-4" />
                                    Utiliser cette photo
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>,
            document.body
        )
        : null;

    // ─── Lightbox via createPortal ───
    const lightbox = lightboxPhoto
        ? ReactDOM.createPortal(
            <div
                className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                style={{ backgroundColor: "rgba(0,0,0,0.92)" }}
                onClick={() => setLightboxPhoto(null)}
            >
                <button
                    type="button"
                    className="absolute top-4 right-4 w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                    onClick={() => setLightboxPhoto(null)}
                >
                    <X className="w-5 h-5 text-white" />
                </button>
                <img
                    src={lightboxPhoto}
                    alt="Photo plein écran"
                    className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                />
            </div>,
            document.body
        )
        : null;

    return (
        <>
            {/* Boutons */}
            <div className="space-y-3">
                <div className="flex gap-2 flex-wrap">
                    <button
                        type="button"
                        onClick={() => setOpen(true)}
                        className="flex items-center gap-2 px-4 h-10 rounded-xl bg-sonatel-orange/10 hover:bg-sonatel-orange/20 text-sonatel-orange font-bold text-xs transition-all border border-sonatel-orange/20 hover:border-sonatel-orange/40"
                    >
                        <Camera className="w-4 h-4" />
                        Prendre une photo
                    </button>

                    <label className="flex items-center gap-2 px-4 h-10 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold text-xs transition-all border border-gray-200 cursor-pointer">
                        <ImagePlus className="w-4 h-4" />
                        Depuis la galerie
                        <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                    </label>
                </div>

                {/* Miniatures */}
                {photos.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {photos.map((photo, index) => (
                            <div
                                key={index}
                                className="relative group w-16 h-16 rounded-xl overflow-hidden border-2 border-gray-100 shadow-sm"
                            >
                                <img src={photo} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setLightboxPhoto(photo)}
                                        className="w-6 h-6 bg-white/90 rounded-lg flex items-center justify-center hover:bg-white"
                                    >
                                        <ZoomIn className="w-3 h-3 text-gray-700" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => removePhoto(index)}
                                        className="w-6 h-6 bg-red-500 rounded-lg flex items-center justify-center hover:bg-red-600"
                                    >
                                        <Trash2 className="w-3 h-3 text-white" />
                                    </button>
                                </div>
                                <div className="absolute top-1 left-1 w-4 h-4 bg-sonatel-orange rounded-md flex items-center justify-center">
                                    <span className="text-white text-[8px] font-black">{index + 1}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Portails */}
            {modal}
            {lightbox}
        </>
    );
}
