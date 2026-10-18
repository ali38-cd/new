/**
 * Audio extraction and WAV encoding utilities for video and voice cloning
 */

/**
 * Encodes an AudioBuffer into standard 16-bit PCM RIFF WAV format
 */
export function encodeAudioBufferToWav(buffer: AudioBuffer, maxFrames?: number): ArrayBuffer {
  const numChannels = Math.min(buffer.numberOfChannels, 2);
  const sampleRate = buffer.sampleRate;
  const totalFrames = maxFrames ? Math.min(buffer.length, maxFrames) : buffer.length;
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataByteLength = totalFrames * blockAlign;

  const arrayBuffer = new ArrayBuffer(44 + dataByteLength);
  const view = new DataView(arrayBuffer);

  // Helper to write ASCII strings
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF header
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataByteLength, true);
  writeString(8, 'WAVE');

  // "fmt " sub-chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // SubChunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // BitsPerSample

  // "data" sub-chunk
  writeString(36, 'data');
  view.setUint32(40, dataByteLength, true);

  // Interleave and write 16-bit samples
  const channelData: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channelData.push(buffer.getChannelData(c));
  }

  let offset = 44;
  for (let i = 0; i < totalFrames; i++) {
    for (let c = 0; c < numChannels; c++) {
      const sample = Math.max(-1, Math.min(1, channelData[c][i] || 0));
      // Convert float [-1.0, 1.0] to signed 16-bit integer [-32768, 32767]
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return arrayBuffer;
}

/**
 * Extracts spoken voice audio from any video Blob or File in the browser
 */
export async function extractAudioFromVideoBlob(
  videoBlob: Blob,
  maxDurationSec = 25
): Promise<{ audioBase64: string; mimeType: string; durationSec: number } | null> {
  try {
    const arrayBuffer = await videoBlob.arrayBuffer();
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtxClass) return null;

    const audioCtx = new AudioCtxClass();
    try {
      // Decode the media container's audio track (MP4/AAC, WebM/Opus)
      const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));

      const sampleRate = decodedBuffer.sampleRate;
      const maxFrames = Math.floor(sampleRate * maxDurationSec);
      const targetFrames = Math.min(decodedBuffer.length, maxFrames);
      const durationSec = targetFrames / sampleRate;

      const wavBuffer = encodeAudioBufferToWav(decodedBuffer, targetFrames);

      // Convert ArrayBuffer to base64
      const uint8 = new Uint8Array(wavBuffer);
      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < uint8.length; i += chunkSize) {
        binary += String.fromCharCode.apply(null, Array.from(uint8.subarray(i, i + chunkSize)));
      }
      const base64 = btoa(binary);

      return {
        audioBase64: base64,
        mimeType: 'audio/wav',
        durationSec: Number(durationSec.toFixed(1)),
      };
    } finally {
      if (audioCtx.state !== 'closed') {
        await audioCtx.close().catch(() => {});
      }
    }
  } catch (err) {
    console.warn('Audio extraction from video note (video might be muted or silent):', err);
    return null;
  }
}
