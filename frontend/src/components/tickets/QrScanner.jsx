import { useEffect, useRef, useState } from 'react';

// Live camera QR scanner. Uses the browser's built-in BarcodeDetector where it exists (Chrome on Android/Mac)
// and the small jsQR library everywhere else (iPhone Safari, Firefox, Chrome on Windows/Linux).
// Mount it to start the camera, unmount it to stop. The same code is not reported again for 4 seconds.
export default function QrScanner({ onScan, onError }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const last = useRef({ value: '', at: 0 });
  const handlers = useRef({ onScan, onError });
  const [ready, setReady] = useState(false);
  handlers.current = { onScan, onError };

  useEffect(() => {
    let stopped = false;
    let timer;
    let stream;

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('This browser cannot use the camera. Type the ticket ID instead.');
        let detect;
        if ('BarcodeDetector' in window) {
          const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
          detect = async (video) => (await detector.detect(video))[0]?.rawValue || '';
        } else {
          const jsQR = (await import('jsqr')).default;
          detect = async (video) => {
            const canvas = canvasRef.current;
            const w = video.videoWidth;
            const h = video.videoHeight;
            if (!w || !h) return '';
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(video, 0, 0, w, h);
            return jsQR(ctx.getImageData(0, 0, w, h).data, w, h)?.data || '';
          };
        }

        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (stopped) { stream.getTracks().forEach((t) => t.stop()); return; }
        const video = videoRef.current;
        video.srcObject = stream;
        await video.play();
        setReady(true);

        const tick = async () => {
          if (stopped) return;
          try {
            const value = await detect(video);
            const now = Date.now();
            if (value && (value !== last.current.value || now - last.current.at > 4000)) {
              last.current = { value, at: now };
              await handlers.current.onScan(value);
            }
          } catch {
            // a single bad frame is fine
          }
          timer = setTimeout(tick, 250);
        };
        tick();
      } catch (e) {
        handlers.current.onError?.(e.name === 'NotAllowedError' ? 'Camera permission was denied. Allow the camera in your browser settings and try again.' : e.message || 'Could not start the camera.');
      }
    })();

    return () => {
      stopped = true;
      clearTimeout(timer);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-black">
      <video ref={videoRef} className="aspect-square w-full object-cover" muted playsInline />
      <canvas ref={canvasRef} className="hidden" />
      {!ready && <p className="absolute inset-0 flex items-center justify-center text-sm text-white/80">Starting camera...</p>}
      <div className="pointer-events-none absolute inset-8 rounded-xl border-2 border-white/70" />
    </div>
  );
}
