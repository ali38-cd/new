import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  audioElement: HTMLAudioElement | null;
  isPlaying: boolean;
  accentColor?: string;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  audioElement,
  isPlaying,
  accentColor = '#818cf8',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!audioElement) return;

    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new AudioCtx();
        const analyser = audioCtxRef.current.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;

        // Connect source only once per element
        if (!sourceRef.current) {
          const source = audioCtxRef.current.createMediaElementSource(audioElement);
          source.connect(analyser);
          analyser.connect(audioCtxRef.current.destination);
          sourceRef.current = source;
        }
      }
    } catch (err) {
      // Audio element may already be connected or user gesture needed
      console.warn('AudioContext setup notification:', err);
    }
  }, [audioElement]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      if (isPlaying && analyserRef.current) {
        // Resume AudioContext if suspended
        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume();
        }

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Draw frequency spectrum with neon gradient
        const barWidth = (width / (bufferLength * 0.75)) * 1.5;
        let x = 0;

        for (let i = 0; i < bufferLength * 0.75; i++) {
          const barHeight = (dataArray[i] / 255) * (height - 8);

          // Gradient for bars
          const gradient = ctx.createLinearGradient(0, height, 0, 0);
          gradient.addColorStop(0, 'rgba(99, 102, 241, 0.2)');
          gradient.addColorStop(0.5, 'rgba(129, 140, 248, 0.8)');
          gradient.addColorStop(1, 'rgba(192, 132, 252, 1)');

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.roundRect(x, height - barHeight, Math.max(barWidth - 2, 2), barHeight, [3, 3, 0, 0]);
          ctx.fill();

          x += barWidth;
        }
      } else {
        // Ambient sine wave when idle
        phase += 0.04;
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.35)';

        ctx.beginPath();
        for (let x = 0; x < width; x += 3) {
          const y = height / 2 + Math.sin(x * 0.02 + phase) * 6 + Math.cos(x * 0.04 - phase * 0.5) * 4;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Second subtle wave
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.2)';
        ctx.beginPath();
        for (let x = 0; x < width; x += 3) {
          const y = height / 2 + Math.cos(x * 0.025 - phase * 0.8) * 5;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      animationFrameIdRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [isPlaying]);

  return (
    <div className="w-full h-16 rounded-xl overflow-hidden bg-slate-950/80 border border-slate-800/80 p-1 flex items-center justify-center relative shadow-inner">
      <canvas
        ref={canvasRef}
        width={600}
        height={60}
        className="w-full h-full block"
      />
      <div className="absolute top-1.5 right-2 flex items-center gap-1.5 pointer-events-none">
        <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
        <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase">
          {isPlaying ? 'Live 24kHz Stereo' : 'Aura DSP Ready'}
        </span>
      </div>
    </div>
  );
};
