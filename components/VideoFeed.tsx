import React, { useEffect, useRef, useState, useCallback } from 'react';
import { analyzeFrame } from '../services/geminiService';
import { BoundingBox, ObjectType, ViolationRecord } from '../types';
import { Camera, Settings, AlertOctagon, Upload, MonitorPlay, FileVideo, ImageIcon } from 'lucide-react';

interface VideoFeedProps {
  onViolation: (violation: ViolationRecord) => void;
  onStatsUpdate: (motorcycles: number, compliant: number, violations: number, processingTime: number) => void;
  isActive: boolean;
}

type SourceType = 'webcam' | 'file';

const VideoFeed: React.FC<VideoFeedProps> = ({ onViolation, onStatsUpdate, isActive }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [sourceType, setSourceType] = useState<SourceType>('webcam');
  const [fileType, setFileType] = useState<'video' | 'image' | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  
  const [isReady, setIsReady] = useState(false);
  const [detections, setDetections] = useState<BoundingBox[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize Webcam
  useEffect(() => {
    if (sourceType !== 'webcam') return;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            // Using 'ideal' instead of exact string to prevent errors on devices without rear camera
            facingMode: 'environment'
          },
          audio: false // Explicitly disable audio to prevent unnecessary permission requests
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            setIsReady(true);
            videoRef.current?.play();
          };
        }
        setError(null);
      } catch (err: any) {
        console.error("Camera Error:", err);
        // Handle Permission Denied specifically
        if (err.name === 'NotAllowedError' || err.message.includes('Permission denied')) {
             setError("Camera access denied. Please allow permissions or use Upload mode.");
        } else {
             setError("Could not access camera. " + (err.message || "Unknown error"));
        }
      }
    };

    startCamera();

    return () => {
      // Cleanup tracks
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [sourceType]);

  // Handle File Upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Cleanup previous URL
    if (fileUrl) URL.revokeObjectURL(fileUrl);

    const url = URL.createObjectURL(file);
    setFileUrl(url);
    setSourceType('file');
    setError(null);
    setDetections([]);
    setIsReady(false);

    if (file.type.startsWith('video/')) {
      setFileType('video');
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = url;
        videoRef.current.loop = true;
        videoRef.current.onloadedmetadata = () => {
          setIsReady(true);
          videoRef.current?.play();
        };
      }
    } else if (file.type.startsWith('image/')) {
      setFileType('image');
      setIsReady(true);
      // For images, we trigger one processing pass once the image loads
    } else {
      setError("Unsupported file type. Please upload a video or image.");
    }
  };

  // Inference Logic
  const processFrame = useCallback(async () => {
    if (!canvasRef.current || !isActive || isProcessing) return;
    
    // Determine source element
    let sourceElement: HTMLVideoElement | HTMLImageElement | null = null;
    
    if (sourceType === 'webcam' || (sourceType === 'file' && fileType === 'video')) {
       sourceElement = videoRef.current;
    } else if (sourceType === 'file' && fileType === 'image') {
       sourceElement = imageRef.current;
    }

    if (!sourceElement) return;
    if (sourceType === 'webcam' && !isReady) return; // Wait for webcam

    setIsProcessing(true);
    const startTime = performance.now();

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Get dimensions
    const width = (sourceElement as any).videoWidth || (sourceElement as any).naturalWidth || (sourceElement as any).width;
    const height = (sourceElement as any).videoHeight || (sourceElement as any).naturalHeight || (sourceElement as any).height;

    if (!width || !height) {
        setIsProcessing(false);
        return;
    }

    // Resize canvas
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    // Draw
    ctx.drawImage(sourceElement, 0, 0, width, height);

    // Compress
    const base64Image = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];

    try {
      const boxes = await analyzeFrame(base64Image);
      setDetections(boxes);

      let motorCount = 0;
      let helmetCount = 0;
      let noHelmetCount = 0;
      let detectedPlate = "";

      // First pass to find plates
      const plateBox = boxes.find(b => b.label === ObjectType.LICENSE_PLATE);
      if (plateBox && plateBox.text_content) {
        detectedPlate = plateBox.text_content;
      }

      boxes.forEach(box => {
        if (box.label === ObjectType.MOTORCYCLE) motorCount++;
        if (box.label === ObjectType.HELMET) helmetCount++;
        if (box.label === ObjectType.NO_HELMET) {
          noHelmetCount++;
          
          if (box.confidence > 0.7) {
            onViolation({
              id: crypto.randomUUID(),
              timestamp: new Date(),
              imageUrl: canvas.toDataURL('image/jpeg', 0.5),
              cameraLocation: sourceType === 'webcam' ? "CAM-01 (Main St)" : "Uploaded Footage",
              confidence: box.confidence,
              type: 'NO_HELMET',
              vehicleNumber: detectedPlate || undefined
            });
          }
        }
      });

      const endTime = performance.now();
      onStatsUpdate(motorCount, helmetCount, noHelmetCount, endTime - startTime);

    } catch (err) {
      console.error("Processing failed", err);
    } finally {
      setIsProcessing(false);
    }
  }, [isActive, isProcessing, onStatsUpdate, onViolation, sourceType, fileType, isReady]);

  // Loop Effect
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;

    if (sourceType === 'file' && fileType === 'image' && isReady && isActive && detections.length === 0) {
        // Run once for image if no detections yet
        processFrame();
    } else {
        // Run interval for video/webcam
        intervalId = setInterval(() => {
          processFrame();
        }, 1500);
    }

    return () => clearInterval(intervalId);
  }, [processFrame, sourceType, fileType, isReady, isActive, detections.length]);


  // Overlay
  const drawOverlay = () => {
    if (!detections.length) return null;
    
    return detections.map((box, idx) => {
      const top = box.ymin / 10;
      const left = box.xmin / 10;
      const height = (box.ymax - box.ymin) / 10;
      const width = (box.xmax - box.xmin) / 10;
      
      let borderColor = 'border-blue-500';
      let textColor = 'bg-blue-500';

      if (box.label === ObjectType.NO_HELMET) {
        borderColor = 'border-red-500';
        textColor = 'bg-red-500';
      } else if (box.label === ObjectType.HELMET) {
        borderColor = 'border-green-500';
        textColor = 'bg-green-500';
      } else if (box.label === ObjectType.LICENSE_PLATE) {
        borderColor = 'border-yellow-400';
        textColor = 'bg-yellow-500 text-black';
      }

      return (
        <div
          key={idx}
          className={`absolute border-2 ${borderColor} transition-all duration-200 pointer-events-none`}
          style={{
            top: `${top}%`,
            left: `${left}%`,
            width: `${width}%`,
            height: `${height}%`,
          }}
        >
          <span className={`absolute -top-6 left-0 text-white text-xs px-1 py-0.5 rounded shadow-sm ${textColor} font-bold whitespace-nowrap`}>
             {box.label === ObjectType.LICENSE_PLATE && box.text_content 
                ? `${box.text_content}` 
                : `${box.label.replace('_', ' ')} ${Math.round(box.confidence * 100)}%`
             }
          </span>
        </div>
      );
    });
  };

  return (
    <div className="flex flex-col space-y-4">
      
      {/* Controls / Input */}
      <div className="flex items-center justify-between bg-slate-800 p-3 rounded-lg border border-slate-700">
        <div className="flex gap-2">
            <button 
                onClick={() => setSourceType('webcam')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${sourceType === 'webcam' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
            >
                <MonitorPlay size={16} /> Live Feed
            </button>
            <label className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${sourceType === 'file' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                <Upload size={16} /> Upload Video/Photo
                <input 
                    type="file" 
                    accept="video/*,image/*" 
                    onChange={handleFileUpload} 
                    className="hidden" 
                />
            </label>
        </div>
        {sourceType === 'file' && (
             <div className="text-xs text-slate-400 font-mono">
                 {fileType === 'video' ? <span className="flex items-center gap-1"><FileVideo size={14}/> Video File</span> : null}
                 {fileType === 'image' ? <span className="flex items-center gap-1"><ImageIcon size={14}/> Image File</span> : null}
             </div>
        )}
      </div>

      {/* Viewing Area */}
      <div className="relative w-full bg-black rounded-xl overflow-hidden shadow-2xl border border-slate-700 aspect-video group">
        
        {/* Render Video Element (Used for both Webcam and Uploaded Video) */}
        <video
          ref={videoRef}
          className={`w-full h-full object-contain ${sourceType === 'file' && fileType === 'image' ? 'hidden' : 'block'}`}
          muted
          playsInline
        />

        {/* Render Image Element (Used only for Uploaded Image) */}
        <img 
            ref={imageRef}
            src={fileUrl || undefined}
            alt="Analysis Source"
            className={`w-full h-full object-contain ${sourceType === 'file' && fileType === 'image' ? 'block' : 'hidden'}`}
            onLoad={() => setIsReady(true)}
        />
        
        {/* Hidden Canvas */}
        <canvas ref={canvasRef} className="hidden" />

        {/* UI Overlay */}
        <div className="absolute inset-0 z-10">
          {drawOverlay()}
        </div>

        {/* Status Bar */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
          <div className="bg-slate-900/80 backdrop-blur text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-2 border border-slate-700">
              <div className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`}></div>
              {isProcessing ? 'ANALYZING' : 'READY'}
          </div>
          <div className="bg-slate-900/80 backdrop-blur text-slate-300 text-xs px-3 py-1.5 rounded-full border border-slate-700 font-mono">
              {sourceType === 'webcam' ? 'LIVE-CAM-01' : 'FILE-SOURCE'}
          </div>
        </div>

        {error && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/90 text-white p-6 text-center">
            <div className="max-w-md">
              <AlertOctagon size={48} className="mx-auto text-red-500 mb-4" />
              <h3 className="text-xl font-bold mb-2">Source Error</h3>
              <p className="text-slate-400">{error}</p>
            </div>
          </div>
        )}

        {!isReady && !error && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900 text-white">
              <div className="flex flex-col items-center">
                <Camera className="animate-bounce mb-4 text-blue-500" size={32} />
                <p className="text-slate-400 animate-pulse">
                    {sourceType === 'webcam' ? 'Initializing Camera...' : 'Waiting for file...'}
                </p>
              </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoFeed;