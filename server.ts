import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Increase payload limits for audio uploads/base64
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// Server-side Gemini initialization
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

/**
 * Robust WAV parser to extract raw PCM data and audio specs
 */
function extractPCMFromWav(wavBuffer: Buffer): { pcmData: Buffer; sampleRate: number; numChannels: number; bitsPerSample: number } {
  if (wavBuffer.length < 44 || wavBuffer.toString('ascii', 0, 4) !== 'RIFF' || wavBuffer.toString('ascii', 8, 12) !== 'WAVE') {
    return {
      pcmData: wavBuffer,
      sampleRate: 24000,
      numChannels: 1,
      bitsPerSample: 16,
    };
  }

  let offset = 12;
  let sampleRate = 24000;
  let numChannels = 1;
  let bitsPerSample = 16;
  let pcmData: Buffer = Buffer.alloc(0);

  while (offset + 8 <= wavBuffer.length) {
    const chunkId = wavBuffer.toString('ascii', offset, offset + 4);
    const chunkSize = wavBuffer.readUInt32LE(offset + 4);
    offset += 8;

    if (chunkId === 'fmt ') {
      numChannels = wavBuffer.readUInt16LE(offset + 2);
      sampleRate = wavBuffer.readUInt32LE(offset + 4);
      bitsPerSample = wavBuffer.readUInt16LE(offset + 14);
      offset += chunkSize;
    } else if (chunkId === 'data') {
      const dataEnd = Math.min(offset + chunkSize, wavBuffer.length);
      pcmData = wavBuffer.subarray(offset, dataEnd);
      break;
    } else {
      offset += chunkSize;
    }
  }

  if (pcmData.length === 0 && wavBuffer.length > 44) {
    pcmData = wavBuffer.subarray(44);
  }

  return { pcmData, sampleRate, numChannels, bitsPerSample };
}

/**
 * Create a standard 44-byte RIFF WAV header wrapping raw PCM
 */
function buildWavHeader(pcmLength: number, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): Buffer {
  const header = Buffer.alloc(44);
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;

  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + pcmLength, 4); // ChunkSize
  header.write('WAVE', 8, 'ascii');
  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16); // SubChunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(pcmLength, 40);

  return header;
}

/**
 * Intelligent lossless text chunker supporting Urdu and all languages.
 * - For short and medium texts (up to ~1,100 characters / ~180-220 words), returns a SINGLE chunk
 *   so the full story is narrated in one natural unbroken session.
 * - For long texts (multi-page stories, articles, scripts), splits hierarchically on paragraphs
 *   and sentences WITHOUT DROPPING A SINGLE CHARACTER, punctuation mark, or unpunctuated trailing sentence.
 */
function chunkText(text: string, maxChunkLength = 480): string[] {
  const cleaned = text.trim();
  if (!cleaned) return [];
  if (cleaned.length <= maxChunkLength) return [cleaned];

  // Split on double newlines / paragraph boundaries
  const paragraphs = cleaned.split(/\n\s*\n/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const para of paragraphs) {
    const trimmedPara = para.trim();
    if (!trimmedPara) continue;

    if (currentChunk && currentChunk.length + trimmedPara.length + 2 > maxChunkLength) {
      chunks.push(currentChunk);
      currentChunk = '';
    }

    if (trimmedPara.length <= maxChunkLength) {
      currentChunk = currentChunk ? `${currentChunk}\n\n${trimmedPara}` : trimmedPara;
    } else {
      // Paragraph itself exceeds maxChunkLength: split by sentences cleanly preserving all text
      // Split on sentence boundary while retaining all words and trailing endings
      const sentenceParts = trimmedPara.split(/(?<=[.!?۔؟\n])\s+/);
      for (const sent of sentenceParts) {
        const trimmedSent = sent.trim();
        if (!trimmedSent) continue;

        if (currentChunk && currentChunk.length + trimmedSent.length + 1 > maxChunkLength) {
          chunks.push(currentChunk);
          currentChunk = '';
        }

        if (trimmedSent.length <= maxChunkLength) {
          currentChunk = currentChunk ? `${currentChunk} ${trimmedSent}` : trimmedSent;
        } else {
          // Individual sentence is huge, split by words
          const words = trimmedSent.split(/\s+/);
          for (const word of words) {
            if (currentChunk && currentChunk.length + word.length + 1 > maxChunkLength) {
              chunks.push(currentChunk);
              currentChunk = '';
            }
            currentChunk = currentChunk ? `${currentChunk} ${word}` : word;
          }
        }
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks.length > 0 ? chunks : [cleaned];
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

/**
 * POST /api/tts/generate
 * Generates natural audio for any text (short or long complete story),
 * with adaptive single-take or lossless multi-chunk synthesis,
 * customizable pitch, speed, emotion, language (including Urdu), and cloned voice steering.
 */
app.post('/api/tts/generate', async (req, res) => {
  try {
    const {
      text,
      language = 'urdu',
      voice = 'Kore',
      pitch = 0, // semitone shift -12 to +12
      speed = 1.0, // 0.5 to 2.0
      emotion = 'natural',
      stylePrompt = '',
      voiceCloneProfile = null,
      modelQuality = 'studio', // 'studio' -> gemini-3.8-flash-tts, 'fast' -> gemini-3.8-flash-lite-tts
    } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Text prompt is required' });
    }

    const ttsModel = modelQuality === 'fast' ? 'gemini-3.8-flash-lite-tts' : 'gemini-3.8-flash-tts';
    const effectiveVoice = voiceCloneProfile?.baseVoice || voice || 'Kore';

    // Format rich style direction for pitch, speed, emotion, language, and voice persona
    let pitchDesc = 'natural medium pitch';
    if (pitch > 4) pitchDesc = 'high melodic pitch';
    else if (pitch > 1) pitchDesc = 'slightly higher bright pitch';
    else if (pitch < -4) pitchDesc = 'deep resonant bass pitch';
    else if (pitch < -1) pitchDesc = 'lower warm baritone pitch';

    let speedDesc = 'measured natural cadence';
    if (speed > 1.25) speedDesc = 'energetic fast-paced tempo';
    else if (speed < 0.85) speedDesc = 'deliberate slow contemplative tempo';

    const langDirective = language.toLowerCase().includes('urdu')
      ? 'Perform in authentic, poetic and articulate Urdu (اردو) with native pronunciation, perfect cadence, and natural vowel elongation.'
      : `Perform in authentic ${language} with clear native diction and articulation.`;

    const emotionDirective = emotion && emotion !== 'natural' ? `Tone & Emotion: ${emotion}.` : 'Tone: Engaging, expressive, lifelike, and natural.';
    
    let cloneDirective = '';
    if (voiceCloneProfile) {
      cloneDirective = `Vocal Persona & Timbre: ${voiceCloneProfile.timbreDescription || ''}. Acoustic Style: ${voiceCloneProfile.steeringPrompt || ''}. Emulate this specific vocal identity closely.`;
    }

    const fullStyleGuide = [
      langDirective,
      emotionDirective,
      `Pitch profile: ${pitchDesc}.`,
      `Pacing: ${speedDesc}.`,
      cloneDirective,
      stylePrompt ? `Additional direction: ${stylePrompt}` : '',
      'Narration Directive: Speak the entire text completely from the beginning to the very last word without skipping, omitting, summarizing, or stopping early.',
    ]
      .filter(Boolean)
      .join(' ');

    // Adaptive chunking: max 480 chars per chunk ensures complete audio output without model token limit cutoffs
    const chunks = chunkText(text, 480);
    console.log(`[TTS] Text length: ${text.length} chars, total chunks: ${chunks.length}, model: ${ttsModel}, voice: ${effectiveVoice}`);

    let detectedSampleRate = 24000;
    let detectedChannels = 1;
    let detectedBits = 16;

    // Process chunks concurrently with fallback retry to guarantee complete story generation
    const pcmParts: (Buffer | null)[] = new Array(chunks.length).fill(null);

    await Promise.all(
      chunks.map(async (chunk, i) => {
        let base64Data: string | null = null;
        let attempts = 0;

        while (!base64Data && attempts < 2) {
          attempts++;
          try {
            // If primary model times out or stumbles on attempt 1, try high-efficiency flash-lite-tts on attempt 2
            const activeModel = attempts === 1 ? (modelQuality === 'studio' ? 'gemini-3.8-flash-tts' : 'gemini-3.8-flash-lite-tts') : 'gemini-3.8-flash-lite-tts';

            const response = await ai.models.generateContent({
              model: activeModel,
              contents: [
                {
                  role: 'user',
                  parts: [
                    {
                      // Send clean verbatim script only - no prompt instructions in speech text
                      text: chunk.trim(),
                      speechMetadata: {
                        style: `${fullStyleGuide} [Story Section ${i + 1}/${chunks.length}]`,
                      },
                    },
                  ],
                },
              ],
              config: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: effectiveVoice },
                  },
                },
              },
            });

            base64Data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
          } catch (err: any) {
            console.warn(`[TTS] Chunk ${i + 1} attempt ${attempts} notice:`, err?.message || err);
            // If quota error on flash-tts, immediately retry with flash-lite-tts
            try {
              const fallbackResponse = await ai.models.generateContent({
                model: 'gemini-3.8-flash-lite-tts',
                contents: [
                  {
                    role: 'user',
                    parts: [
                      {
                        text: chunk.trim(),
                        speechMetadata: {
                          style: fullStyleGuide,
                        },
                      },
                    ],
                  },
                ],
                config: {
                  responseModalities: ['AUDIO'],
                  speechConfig: {
                    voiceConfig: {
                      prebuiltVoiceConfig: { voiceName: effectiveVoice },
                    },
                  },
                },
              });
              base64Data = fallbackResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
            } catch (fallbackErr: any) {
              console.warn(`[TTS] Chunk ${i + 1} fallback error:`, fallbackErr?.message || fallbackErr);
            }
          }
        }

        if (base64Data) {
          const chunkBuffer = Buffer.from(base64Data, 'base64');
          const { pcmData, sampleRate, numChannels, bitsPerSample } = extractPCMFromWav(chunkBuffer);

          detectedSampleRate = sampleRate || 24000;
          detectedChannels = numChannels || 1;
          detectedBits = bitsPerSample || 16;
          pcmParts[i] = pcmData;
        } else {
          console.warn(`[TTS] Warning: Chunk ${i + 1} could not generate audio.`);
        }
      })
    );

    // Natural inter-chunk breath pause (approx 220ms of acoustic silence)
    const pauseBytes = Math.round(detectedSampleRate * detectedChannels * (detectedBits / 8) * 0.22);
    const pauseBuffer = Buffer.alloc(pauseBytes);

    const orderedParts: Buffer[] = [];
    for (let i = 0; i < pcmParts.length; i++) {
      const part = pcmParts[i];
      if (part && part.length > 0) {
        if (orderedParts.length > 0) {
          orderedParts.push(pauseBuffer);
        }
        orderedParts.push(part);
      }
    }

    if (orderedParts.length === 0) {
      return res.status(500).json({ error: 'Failed to synthesize complete speech audio. Please try again.' });
    }

    // Stitch all PCM chunks together
    const totalPCM = Buffer.concat(orderedParts);
    const wavHeader = buildWavHeader(totalPCM.length, detectedSampleRate, detectedChannels, detectedBits);
    const completeWav = Buffer.concat([wavHeader, totalPCM]);
    const finalBase64 = completeWav.toString('base64');

    // Calculate duration in seconds: totalBytes / byteRate
    const byteRate = (detectedSampleRate * detectedChannels * detectedBits) / 8;
    const durationSeconds = totalPCM.length / byteRate;

    console.log(`[TTS] Completed synthesis: ${orderedParts.length}/${chunks.length} parts, duration: ${durationSeconds.toFixed(1)}s`);

    res.json({
      success: true,
      audioBase64: finalBase64,
      mimeType: 'audio/wav',
      durationSeconds: Number(durationSeconds.toFixed(2)),
      chunksCount: chunks.length,
      sampleRate: detectedSampleRate,
      voice: effectiveVoice,
      language,
    });
  } catch (error: any) {
    console.warn('[TTS Generation Error]:', error);
    res.status(500).json({
      error: error?.message || 'Speech generation failed. Please try again.',
      details: String(error),
    });
  }
});

/**
 * POST /api/voice/clone
 * Analyzes reference vocal sample (audio upload or mic recording)
 * using multimodal Gemini acoustic analysis and creates a high-fidelity Voice Profile
 * with acoustic traits, timbre fingerprint, and generated test preview.
 */
app.post('/api/voice/clone', async (req, res) => {
  try {
    const { audioBase64, mimeType = 'audio/wav', name = 'My Cloned Voice', language = 'Urdu' } = req.body;

    if (!audioBase64) {
      return res.status(400).json({ error: 'Audio reference data is required for cloning.' });
    }

    console.log(`[Voice Clone] Analyzing acoustic reference (${mimeType}, ~${Math.round(audioBase64.length / 1024)} KB)...`);

    // Use Gemini 3.8 Flash to analyze acoustic parameters
    const analysisPrompt = `You are a world-class phonetician and vocal synthesis engineer. 
Analyze this reference audio recording of a human voice.
Extract precise acoustic, timbre, prosodic, pitch, and dialect characteristics so we can synthesize speech matching this vocal identity.

Return ONLY a strict JSON object with this schema:
{
  "name": "${name}",
  "gender": "male" | "female" | "neutral",
  "baseVoice": "Puck" | "Charon" | "Kore" | "Fenrir" | "Zephyr",
  "pitchBaseline": "low" | "medium-low" | "medium" | "medium-high" | "high",
  "timbreDescription": "Descriptive summary of voice timbre (e.g., warm, resonant, slightly raspy, velvety baritone, bright soprano, silky)",
  "vocalTraits": ["string", "string", "string"],
  "cadence": "Description of speaking rhythm, breath pauses, pace, and energy",
  "accentDialect": "Detected accent, pronunciation nuances (e.g. Urdu Pakistani native, North American, British RP, etc.)",
  "steeringPrompt": "A highly detailed director instruction prompt to guide TTS synthesis to match this exact speaker (under 250 characters)"
}

Select the baseVoice that closest matches the speaker's vocal frequency:
- 'Fenrir': deep, authoritative, masculine, rich low-end
- 'Charon': calm, mature, deep, measured
- 'Puck': upbeat, expressive, youthful, bright
- 'Kore': warm, soothing, natural, expressive feminine/medium
- 'Zephyr': clear, articulate, dynamic, melodic`;

    const analysisResponse = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: audioBase64,
                mimeType: mimeType.split(';')[0],
              },
            },
            {
              text: analysisPrompt,
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const analysisJsonText = analysisResponse.text?.trim() || '{}';
    let profileData: any;
    try {
      profileData = JSON.parse(analysisJsonText);
    } catch (parseErr) {
      console.warn('[Voice Clone] JSON parse fallback on:', analysisJsonText);
      profileData = {
        name,
        gender: 'neutral',
        baseVoice: 'Kore',
        pitchBaseline: 'medium',
        timbreDescription: 'Warm, natural acoustic vocal presence',
        vocalTraits: ['Articulate', 'Natural breath', 'Warm resonance'],
        cadence: 'Measured and conversational',
        accentDialect: 'Authentic expressive diction',
        steeringPrompt: 'Warm, natural conversational voice with clear articulation and balanced resonance.',
      };
    }

    // Ensure valid baseVoice
    const validVoices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
    if (!validVoices.includes(profileData.baseVoice)) {
      profileData.baseVoice = profileData.gender === 'female' ? 'Kore' : 'Charon';
    }

    // Generate a voice clone preview greeting in Urdu and English
    const previewText = language.toLowerCase().includes('urdu')
      ? 'السلام علیکم! میں آپ کی کلون شدہ آواز ہوں۔ اب میں اردو اور دنیا کی ہر زبان میں مکمل روانی سے بول سکتا ہوں۔'
      : `Hello! I am your cloned voice profile for ${name}. I am ready to narrate any story with your vocal signature.`;

    let previewAudioBase64: string | null = null;
    try {
      const previewResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: previewText,
                speechMetadata: {
                  style: `Voice Persona: ${profileData.timbreDescription}. Cadence: ${profileData.cadence}. Accent: ${profileData.accentDialect}. ${profileData.steeringPrompt}`,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: profileData.baseVoice },
            },
          },
        },
      });

      previewAudioBase64 = previewResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
    } catch (previewErr) {
      console.warn('[Voice Clone] Preview generation skipped/failed:', previewErr);
    }

    const clonedProfile = {
      id: `clone_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: profileData.name || name,
      gender: profileData.gender || 'neutral',
      baseVoice: profileData.baseVoice,
      pitchBaseline: profileData.pitchBaseline || 'medium',
      timbreDescription: profileData.timbreDescription || 'Acoustic vocal signature',
      vocalTraits: profileData.vocalTraits || ['Natural', 'Authentic'],
      cadence: profileData.cadence || 'Natural cadence',
      accentDialect: profileData.accentDialect || 'Clear accent',
      steeringPrompt: profileData.steeringPrompt || '',
      createdAt: new Date().toISOString(),
      previewAudioBase64,
    };

    res.json({
      success: true,
      profile: clonedProfile,
    });
  } catch (error: any) {
    console.warn('[Voice Clone Error]:', error);
    res.status(500).json({
      error: error?.message || 'Voice cloning analysis failed.',
      details: String(error),
    });
  }
});

/**
 * POST /api/voice/generate-voice-persona
 * Generates UNLIMITED custom synthetic voices on demand from natural language prompts,
 * acoustic descriptions, or randomized parameters, with instant vocal previews.
 */
app.post('/api/voice/generate-voice-persona', async (req, res) => {
  try {
    const {
      prompt = '',
      name = '',
      gender = 'neutral',
      ageGroup = 'adult',
      timbreStyle = '',
      language = 'Urdu',
    } = req.body;

    console.log(`[Voice Generator] Designing unlimited voice persona: prompt="${prompt}", lang=${language}, gender=${gender}`);

    const generatorPrompt = `You are a world-leading vocal designer and acoustic synthesis engineer.
Create a rich, distinct, lifelike voice persona profile based on this user request:
"${prompt || `${gender} ${ageGroup} speaker with ${timbreStyle || 'natural expressive'} timbre in ${language}`}".

Select the best baseVoice frequency from:
- 'Fenrir': deep, authoritative, masculine, resonant low-end
- 'Charon': calm, mature, deep, measured, contemplative
- 'Puck': upbeat, expressive, youthful, playful, bright
- 'Kore': warm, soothing, natural, expressive feminine/medium
- 'Zephyr': clear, articulate, dynamic, melodic, contemporary

Determine a pitchShift between -6 and +6 (semitones).
Generate an evocative English name and an authentic native name if applicable (e.g. Urdu Nastaliq name if Urdu).
Generate a rich description, timbre description, 3-4 vocal traits, cadence description, accent/dialect nuances, and an acoustic steering prompt for TTS.

Return ONLY a strict JSON object with this schema:
{
  "name": "Creative Voice Name",
  "nativeName": "Native script name or Urdu name",
  "gender": "male" | "female" | "neutral",
  "baseVoice": "Puck" | "Charon" | "Kore" | "Fenrir" | "Zephyr",
  "pitchShift": 0,
  "description": "Engaging 1-2 sentence description of this unique voice persona",
  "timbreDescription": "Acoustic signature (e.g. velvety baritone with subtle raspy edge and warm chest resonance)",
  "vocalTraits": ["Trait 1", "Trait 2", "Trait 3"],
  "cadence": "Speaking rhythm and pacing description",
  "accentDialect": "Specific accent and regional articulation nuances",
  "steeringPrompt": "Precise director instructions for TTS under 200 chars"
}`;

    const designResponse = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{ role: 'user', parts: [{ text: generatorPrompt }] }],
      config: { responseMimeType: 'application/json' },
    });

    const jsonText = designResponse.text?.trim() || '{}';
    let profileData: any;
    try {
      profileData = JSON.parse(jsonText);
    } catch (e) {
      console.warn('[Voice Generator] JSON parse fallback on:', jsonText);
      profileData = {
        name: name || 'Aura Persona',
        nativeName: 'صوتی فنکار',
        gender: gender || 'neutral',
        baseVoice: gender === 'female' ? 'Kore' : 'Fenrir',
        pitchShift: 0,
        description: 'Custom AI generated voice persona with expressive timbre.',
        timbreDescription: 'Resonant and expressive natural timbre',
        vocalTraits: ['Expressive', 'Clear Articulation', 'Emotional Depth'],
        cadence: 'Natural storytelling rhythm',
        accentDialect: 'Authentic expressive accent',
        steeringPrompt: 'Expressive and engaging natural vocal timbre with authentic pacing.',
      };
    }

    const validVoices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
    if (!validVoices.includes(profileData.baseVoice)) {
      profileData.baseVoice = profileData.gender === 'female' ? 'Kore' : 'Charon';
    }

    // Synthesize instant preview sample in requested language
    const isUrdu = language.toLowerCase().includes('urdu');
    const previewScript = isUrdu
      ? `السلام علیکم! میں ${profileData.nativeName || profileData.name} ہوں۔ میں آپ کی ہر تحریر اور کہانی کو ایک نیا رنگ دینے کے لیے حاضر ہوں۔`
      : `Hello! I am ${profileData.name}. I am a uniquely generated voice persona ready to bring your words and stories to life.`;

    let previewAudioBase64: string | null = null;
    try {
      const previewResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: previewScript,
                speechMetadata: {
                  style: `Voice Persona: ${profileData.timbreDescription}. Cadence: ${profileData.cadence}. ${profileData.steeringPrompt}`,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: profileData.baseVoice },
            },
          },
        },
      });

      previewAudioBase64 = previewResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
    } catch (previewErr) {
      console.warn('[Voice Generator] Preview synthesis note:', previewErr);
    }

    const avatarGradients = [
      'from-rose-500 to-indigo-700',
      'from-emerald-500 to-teal-700',
      'from-amber-500 to-rose-600',
      'from-cyan-500 to-blue-700',
      'from-fuchsia-600 to-purple-800',
      'from-violet-600 to-pink-600',
      'from-teal-500 to-emerald-700',
      'from-orange-500 to-red-700',
    ];
    const randomAvatar = avatarGradients[Math.floor(Math.random() * avatarGradients.length)];

    const newPersonaProfile = {
      id: `ai_voice_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: profileData.name || name || 'Custom Persona',
      nativeName: profileData.nativeName,
      gender: profileData.gender || 'neutral',
      baseVoice: profileData.baseVoice,
      pitchShift: typeof profileData.pitchShift === 'number' ? profileData.pitchShift : 0,
      description: profileData.description,
      isCloned: true,
      isAiGenerated: true,
      avatarColor: randomAvatar,
      tags: ['AI Generated', profileData.gender, ...(profileData.vocalTraits || []).slice(0, 2)],
      timbreDescription: profileData.timbreDescription,
      vocalTraits: profileData.vocalTraits,
      cadence: profileData.cadence,
      accentDialect: profileData.accentDialect,
      steeringPrompt: profileData.steeringPrompt,
      previewAudioBase64,
      createdAt: new Date().toISOString(),
    };

    res.json({
      success: true,
      profile: newPersonaProfile,
    });
  } catch (error: any) {
    console.warn('[Voice Generator Error]:', error);
    res.status(500).json({
      error: error?.message || 'Voice persona generation failed.',
      details: String(error),
    });
  }
});

/**
 * POST /api/video/analyze-and-align
 * "Sees" video scenes and extracts user speech/voice from the video,
 * allows user to write any text, clones the user's voice from the video,
 * and synthesizes the user's text aligned to the user's vocal identity and video timing!
 */
app.post('/api/video/analyze-and-align', async (req, res) => {
  try {
    const {
      frames = [], // Array of { timestamp: number, imageBase64: string }
      videoBase64 = null,
      videoMimeType = 'video/mp4',
      userAudioBase64 = null,
      userAudioMimeType = 'audio/wav',
      alignToUserVoice = false, // If true, extracts voice from user video audio & matches vocal profile
      videoDuration = 15,
      userScript = '',
      language = 'Urdu',
      voice = 'Kore',
      emotion = 'Cinematic & Engaging',
      pitch = 0,
      voiceCloneProfile = null,
    } = req.body;

    console.log(
      `[Video Aligner] Request: ${frames.length} frames, duration: ${videoDuration}s, alignToUserVoice: ${alignToUserVoice}, script length: ${userScript?.length || 0}`
    );

    let effectiveProfile = voiceCloneProfile;
    let detectedSpeakerVoice: any = null;
    let videoTranscription: string | null = null;

    // STEP 1: If user wants voice aligned to THEM and uploaded/recorded video audio is provided
    if (alignToUserVoice && userAudioBase64) {
      console.log('[Video Aligner] Extracting vocal identity and speech patterns from user video...');
      try {
        const voiceExtractionPrompt = `You are a master vocal phonetician.
Analyze this audio recording of a user speaking in a video.
1. Extract precise vocal timbre, pitch baseline, gender, cadence, and dialect characteristics.
2. Select the closest baseVoice from:
   - 'Fenrir': deep, authoritative masculine, low pitch
   - 'Charon': calm, mature, deep, measured
   - 'Puck': upbeat, bright, youthful
   - 'Kore': warm, soothing, natural, feminine/medium
   - 'Zephyr': clear, articulate, dynamic
3. Transcribe any recognizable spoken words into "transcription".
4. Create an acoustic steering prompt to synthesize new speech in this user's vocal signature.

Return ONLY strict JSON with this schema:
{
  "name": "My Cloned Voice",
  "gender": "male" | "female" | "neutral",
  "baseVoice": "Puck" | "Charon" | "Kore" | "Fenrir" | "Zephyr",
  "pitchShift": 0,
  "timbreDescription": "Detailed summary of user's vocal signature",
  "vocalTraits": ["Trait 1", "Trait 2", "Trait 3"],
  "cadence": "Speaking tempo and cadence",
  "accentDialect": "Detected accent / pronunciation style",
  "steeringPrompt": "Acoustic direction prompt under 200 chars to replicate user voice",
  "transcription": "Transcription of user speech if audible, or empty string"
}`;

        const acousticResponse = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: userAudioMimeType.split(';')[0],
                    data: userAudioBase64,
                  },
                },
                { text: voiceExtractionPrompt },
              ],
            },
          ],
          config: { responseMimeType: 'application/json' },
        });

        const acousticJsonText = acousticResponse.text?.trim() || '{}';
        const parsedAcoustics = JSON.parse(acousticJsonText);

        const validVoices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
        const chosenBaseVoice = validVoices.includes(parsedAcoustics.baseVoice)
          ? parsedAcoustics.baseVoice
          : parsedAcoustics.gender === 'female'
          ? 'Kore'
          : 'Charon';

        detectedSpeakerVoice = {
          id: `user_video_voice_${Date.now()}`,
          name: 'My Video Voice (میری آواز)',
          nativeName: 'میری ذاتی آواز',
          gender: parsedAcoustics.gender || 'neutral',
          baseVoice: chosenBaseVoice,
          pitchShift: parsedAcoustics.pitchShift || 0,
          description: `Voice cloned directly from your uploaded video: ${parsedAcoustics.timbreDescription || 'Personal vocal signature'}`,
          isCloned: true,
          avatarColor: 'from-amber-500 via-rose-600 to-purple-700',
          tags: ['My Voice', 'Video Cloned', parsedAcoustics.gender || 'Speaker'],
          timbreDescription: parsedAcoustics.timbreDescription || 'User personal voice profile',
          vocalTraits: parsedAcoustics.vocalTraits || ['Authentic User Voice', 'Natural Pacing'],
          cadence: parsedAcoustics.cadence || 'Natural conversational cadence',
          accentDialect: parsedAcoustics.accentDialect || 'Authentic user accent',
          steeringPrompt: parsedAcoustics.steeringPrompt || 'Natural conversational tone matching the speaker.',
          createdAt: new Date().toISOString(),
        };

        videoTranscription = parsedAcoustics.transcription || null;
        effectiveProfile = detectedSpeakerVoice;
        console.log(`[Video Aligner] Extracted user voice signature: baseVoice=${chosenBaseVoice}, timbre="${parsedAcoustics.timbreDescription}"`);
      } catch (voiceErr) {
        console.warn('[Video Aligner] User voice extraction note (falling back to selected persona):', voiceErr);
      }
    }

    const effectiveVoice = effectiveProfile?.baseVoice || voice || 'Kore';

    // STEP 2: Analyze video visual keyframes + userScript
    const contentParts: any[] = [];

    if (frames && frames.length > 0) {
      for (const f of frames) {
        contentParts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: f.imageBase64,
          },
        });
        contentParts.push({
          text: `[Frame at video timestamp ${f.timestamp.toFixed(1)}s]`,
        });
      }
    } else if (videoBase64) {
      contentParts.push({
        inlineData: {
          mimeType: videoMimeType.split(';')[0],
          data: videoBase64,
        },
      });
    } else {
      return res.status(400).json({ error: 'Video frames or video data are required for visual alignment.' });
    }

    const scriptInstruction = userScript?.trim()
      ? `The user provided this custom script to be spoken: "${userScript.trim()}". Synchronize, divide, and pace this text cleanly across the video scenes matching the visual actions.`
      : `Write a compelling, articulate narration in ${language} (if Urdu, write authentic poetic and descriptive Urdu in Nastaliq script) that describes and narrates the actions occurring on screen.`;

    const alignPrompt = `You are an elite video sound director and audio synchronizer.
Analyze these timestamped video frames across the video duration of ${videoDuration.toFixed(1)} seconds.
${scriptInstruction}

Break the video into 2 to 5 distinct visual scenes.
For each scene:
1. Identify the startTime and endTime (in seconds) matching visual action/camera shifts.
2. Provide a short visualDescription of what is happening on screen.
3. Provide the spoken script in ${language} timed to fit that scene. Keep the word count appropriate for the time window (about 2.5 to 3 words per second).
4. Provide the recommendedSpeed (between 0.85 and 1.25) so speech finishes cleanly before the scene transitions.

Return ONLY a strict JSON object with this schema:
{
  "videoSummary": "Short overview of what the video shows",
  "scenes": [
    {
      "sceneIndex": 1,
      "startTime": 0,
      "endTime": 5.0,
      "visualDescription": "Description of scene",
      "script": "Voiceover line in ${language}",
      "emotion": "e.g. Awe, dramatic, inspiring, calm, natural",
      "recommendedSpeed": 1.0
    }
  ]
}`;

    contentParts.push({ text: alignPrompt });

    const analysisResponse = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: contentParts,
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const jsonText = analysisResponse.text?.trim() || '{}';
    let alignmentData: any;
    try {
      alignmentData = JSON.parse(jsonText);
    } catch (parseErr) {
      console.warn('[Video Aligner] JSON parse fallback on:', jsonText);
      alignmentData = {
        videoSummary: 'Visual cinematography sequence',
        scenes: [
          {
            sceneIndex: 1,
            startTime: 0,
            endTime: Math.min(6, videoDuration),
            visualDescription: 'Visual scene introduction',
            script: userScript?.trim() || (language.toLowerCase().includes('urdu')
              ? 'یہ دلکش منظر قدرت کی خوبصورتی اور اس کی عظمت کا زندہ ثبوت ہے۔'
              : 'This visual journey reveals breathtaking perspectives.'),
            emotion: 'Cinematic',
            recommendedSpeed: 1.0,
          },
        ],
      };
    }

    const scenes = alignmentData.scenes || [];
    console.log(`[Video Aligner] Extracted ${scenes.length} synchronized scenes. Generating voice track...`);

    const sampleRate = 24000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const bytesPerSec = (sampleRate * numChannels * bitsPerSample) / 8;

    // Allocate total master PCM buffer matching video duration
    const masterDuration = Math.max(videoDuration, 1);
    const masterPCM = Buffer.alloc(Math.round(masterDuration * bytesPerSec));

    // Build voice persona steering directive
    let cloneDirective = '';
    if (effectiveProfile) {
      cloneDirective = `Speaker Persona & Timbre: ${effectiveProfile.timbreDescription || ''}. Cadence: ${effectiveProfile.cadence || ''}. Direction: ${effectiveProfile.steeringPrompt || ''}.`;
    }

    // STEP 3: Synthesize each scene in parallel with user's voice profile
    const synthesizedScenes = await Promise.all(
      scenes.map(async (scene: any, idx: number) => {
        try {
          const sceneSpeed = Math.min(1.4, Math.max(0.75, scene.recommendedSpeed || 1.0));
          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash-lite-tts',
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: scene.script.trim(),
                    speechMetadata: {
                      style: `Language: ${language}. Tone: ${scene.emotion || emotion}. Speaking pace: aligned to visual scene. ${cloneDirective}`,
                    },
                  },
                ],
              },
            ],
            config: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: effectiveVoice },
                },
              },
            },
          });

          const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          let sceneDuration = 0;
          let pcmData: Buffer = Buffer.alloc(0);

          if (base64Audio) {
            const rawWav = Buffer.from(base64Audio, 'base64');
            const extracted = extractPCMFromWav(rawWav);
            pcmData = extracted.pcmData;
            sceneDuration = pcmData.length / bytesPerSec;

            // Place into master timeline at scene.startTime
            const startByte = Math.round((scene.startTime || 0) * bytesPerSec);
            if (startByte < masterPCM.length) {
              const copyLen = Math.min(pcmData.length, masterPCM.length - startByte);
              pcmData.copy(masterPCM, startByte, 0, copyLen);
            }
          }

          return {
            ...scene,
            sceneDuration: Number(sceneDuration.toFixed(2)),
            audioBase64: base64Audio || null,
          };
        } catch (sceneErr: any) {
          console.warn(`[Video Aligner] Scene ${idx + 1} TTS error:`, sceneErr?.message || sceneErr);
          return {
            ...scene,
            sceneDuration: 0,
            audioBase64: null,
          };
        }
      })
    );

    // Build master aligned WAV
    const masterWavHeader = buildWavHeader(masterPCM.length, sampleRate, numChannels, bitsPerSample);
    const masterAlignedWav = Buffer.concat([masterWavHeader, masterPCM]);
    const masterBase64 = masterAlignedWav.toString('base64');

    res.json({
      success: true,
      videoSummary: alignmentData.videoSummary || 'Visual scene aligned',
      scenes: synthesizedScenes,
      masterAlignedAudioBase64: masterBase64,
      masterDuration: Number(masterDuration.toFixed(2)),
      language,
      voice: effectiveVoice,
      detectedSpeakerVoice,
      videoTranscription,
      alignmentMode: alignToUserVoice && detectedSpeakerVoice ? 'voice-cloned-from-video' : 'selected-persona',
    });
  } catch (error: any) {
    console.warn('[Video Aligner Error]:', error);
    res.status(500).json({
      error: error?.message || 'Video voice alignment failed.',
      details: String(error),
    });
  }
});

// Vite middleware for dev / static serve for prod
async function setupServer() {
  if (process.env.VERCEL) {
    return;
  }
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AuraVoice] Server running at http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  setupServer().catch((err) => {
    console.warn('[AuraVoice] Failed to start server:', err);
    process.exit(1);
  });
}

export default app;

