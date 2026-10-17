import { VoiceProfile, EmotionPreset, LanguageOption } from '../types/tts';

export const BUILTIN_VOICE_PROFILES: VoiceProfile[] = [
  // Urdu Focused Personas
  {
    id: 'urdu-tariq',
    name: 'Tariq',
    nativeName: 'طارق نقوی',
    gender: 'male',
    baseVoice: 'Fenrir',
    description: 'Classical Urdu orator with deep resonance, poetic cadence, and authentic Nastaliq diction.',
    avatarColor: 'from-amber-600 to-rose-700',
    tags: ['Urdu Native', 'Classical', 'Poetry', 'Deep'],
    timbreDescription: 'Deep, resonant, soulful baritone with authentic Urdu poetic modulation',
    vocalTraits: ['Urdu Native Pronunciation', 'Soulful Resonance', 'Poetic Pauses'],
    cadence: 'Measured and evocative classical cadence',
    accentDialect: 'Pakistani Urdu Standard (Dehlavi/Lakhnavi heritage)',
    steeringPrompt: 'Classic Urdu orator speaking with profound elegance, resonant baritone depth, and authentic Nastaliq poetic rhythm.',
  },
  {
    id: 'urdu-zainab',
    name: 'Zainab',
    nativeName: 'زینب خان',
    gender: 'female',
    baseVoice: 'Kore',
    description: 'Expressive Urdu storyteller and audio drama artist with warm, soothing, and clear cadence.',
    avatarColor: 'from-fuchsia-600 to-pink-600',
    tags: ['Urdu Native', 'Storytelling', 'Warm', 'Audiobook'],
    timbreDescription: 'Warm, luminous, silky feminine voice with gentle acoustic clarity',
    vocalTraits: ['Gentle Warmth', 'Expressive Urdu Inflection', 'Crystal Articulation'],
    cadence: 'Engaging, narrative, melodic flow',
    accentDialect: 'Pakistani Urdu Standard Media style',
    steeringPrompt: 'Warm and expressive Urdu narrator, gentle melodic cadence with impeccable Urdu vocabulary pronunciation.',
  },
  {
    id: 'urdu-hamza',
    name: 'Hamza',
    nativeName: 'حمزہ احمد',
    gender: 'male',
    baseVoice: 'Charon',
    description: 'Urdu broadcast anchor and formal documentary narrator with authoritative tone.',
    avatarColor: 'from-blue-600 to-indigo-700',
    tags: ['Urdu Native', 'News', 'Formal', 'Documentary'],
    timbreDescription: 'Authoritative, balanced, crisp masculine broadcast voice',
    vocalTraits: ['Broadcast Precision', 'Authoritative Diction', 'News Cadence'],
    cadence: 'Confident, articulate, professional pacing',
    accentDialect: 'National Radio/TV Urdu broadcaster',
    steeringPrompt: 'Urdu news anchor speaking with commanding authority, precise consonant articulation, and crisp professional tempo.',
  },
  {
    id: 'urdu-fatima',
    name: 'Fatima',
    nativeName: 'فاطمہ بخاری',
    gender: 'female',
    baseVoice: 'Zephyr',
    description: 'Modern, friendly Urdu conversationalist, podcast host, and educational explainer.',
    avatarColor: 'from-emerald-600 to-teal-700',
    tags: ['Urdu Native', 'Conversational', 'Podcast', 'Modern'],
    timbreDescription: 'Bright, approachable, modern feminine voice with smiling timbre',
    vocalTraits: ['Conversational Ease', 'Bright Intonation', 'Relatable'],
    cadence: 'Natural conversational pace with organic pauses',
    accentDialect: 'Urban Pakistani Urdu / Contemporary',
    steeringPrompt: 'Modern friendly Urdu speaker, enthusiastic and clear conversational tone.',
  },

  // Global Multi-lingual Pillars
  {
    id: 'global-kore',
    name: 'Kore Studio',
    nativeName: 'کورے سٹوڈیو',
    gender: 'female',
    baseVoice: 'Kore',
    description: 'Balanced, soothing natural studio voice for any language and narrative text.',
    avatarColor: 'from-purple-600 to-indigo-600',
    tags: ['Multilingual', 'Balanced', 'Soothing'],
  },
  {
    id: 'global-puck',
    name: 'Puck Studio',
    nativeName: 'پک',
    gender: 'male',
    baseVoice: 'Puck',
    description: 'Energetic, youthful, bright and cheerful speaker for vibrant content.',
    avatarColor: 'from-amber-500 to-orange-600',
    tags: ['Multilingual', 'Energetic', 'Youthful'],
  },
  {
    id: 'global-fenrir',
    name: 'Fenrir Master',
    nativeName: 'فینریر',
    gender: 'male',
    baseVoice: 'Fenrir',
    description: 'Cinematic deep bass voice suited for movie trailers, epics, and bold narratives.',
    avatarColor: 'from-red-600 to-stone-900',
    tags: ['Multilingual', 'Cinematic', 'Deep Bass'],
  },
  {
    id: 'global-charon',
    name: 'Charon Studio',
    nativeName: 'کیرون',
    gender: 'male',
    baseVoice: 'Charon',
    description: 'Calm, thoughtful, mature masculine voice for essays, wisdom, and audiobooks.',
    avatarColor: 'from-cyan-600 to-slate-800',
    tags: ['Multilingual', 'Calm', 'Mature'],
  },
  {
    id: 'global-zephyr',
    name: 'Zephyr Studio',
    nativeName: 'زیفر',
    gender: 'neutral',
    baseVoice: 'Zephyr',
    description: 'Ultra-clear, articulate, melodic neutrality for guides and technical clarity.',
    avatarColor: 'from-violet-500 to-sky-600',
    tags: ['Multilingual', 'Articulate', 'Crystal Clear'],
  },
];

export const EMOTION_PRESETS: EmotionPreset[] = [
  {
    id: 'natural',
    label: 'Natural & Balanced',
    urduLabel: 'فطری اور متوازن',
    description: 'Neutral, organic human speech with balanced conversational inflections.',
    directive: 'Engaging, lifelike, organic conversational tone with natural breathing.',
    icon: 'Sparkles',
  },
  {
    id: 'cheerful',
    label: 'Cheerful & Upbeat',
    urduLabel: 'زندہ دل اور پُرجوش',
    description: 'Bright, smiling, enthusiastic with high energy and buoyant rhythm.',
    directive: 'Cheerful, joyful, upbeat, and smiling tone with lively melodic pitch.',
    icon: 'Smile',
  },
  {
    id: 'dramatic',
    label: 'Dramatic & Epic',
    urduLabel: 'ڈرامائی اور پرتاثیر',
    description: 'Theatrical, passionate, intense with cinematic pauses and resonance.',
    directive: 'Dramatic, intense, cinematic narration with passionate emphasis and dramatic pauses.',
    icon: 'Flame',
  },
  {
    id: 'calm',
    label: 'Calm & Soothing',
    urduLabel: 'پُرسکون اور دھیما',
    description: 'Relaxed, mindful, gentle pacing ideal for meditation and night stories.',
    directive: 'Calm, deeply soothing, gentle and warm tone with unhurried peaceful pacing.',
    icon: 'Feather',
  },
  {
    id: 'news',
    label: 'News & Broadcast',
    urduLabel: 'خبریاتی اور سنجیدہ',
    description: 'Crisp, authoritative, formal broadcast cadence with clear diction.',
    directive: 'Authoritative, professional news anchor broadcast delivery, articulate and confident.',
    icon: 'Radio',
  },
  {
    id: 'empathetic',
    label: 'Empathetic & Warm',
    urduLabel: 'ہمدردانہ اور مخلص',
    description: 'Heartfelt, compassionate, supportive, and emotionally connected.',
    directive: 'Deeply empathetic, caring, emotionally warm and heartfelt tone.',
    icon: 'Heart',
  },
  {
    id: 'whisper',
    label: 'Intimate Whisper',
    urduLabel: 'سرگوشی',
    description: 'Soft, close-mic whisper style with delicate breath presence.',
    directive: 'Intimate soft whisper, close-to-ear delicate breathy vocalization.',
    icon: 'Wind',
  },
  {
    id: 'poetic',
    label: 'Poetic & Mystical',
    urduLabel: 'شاعرانہ اور صوفیانہ',
    description: 'Deep lyrical nuance, musical pitch swings, traditional Tarannum essence.',
    directive: 'Poetic, mystical, contemplative, with evocative emotional lingering and musical phrasing.',
    icon: 'BookOpen',
  },
];

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  {
    code: 'ur',
    name: 'Urdu',
    nativeName: 'اردو',
    flag: '🇵🇰',
    isRtl: true,
    sampleUrduOrNative: 'خودی کو کر بلند اتنا کہ ہر تقدیر سے پہلے، خدا بندے سے خود پوچھے بتا تیری رضا کیا ہے۔',
  },
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🌐',
    isRtl: false,
    sampleUrduOrNative: 'Welcome to the next generation of voice synthesis. Every word carries emotion and clarity.',
  },
  {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    flag: '🇸🇦',
    isRtl: true,
    sampleUrduOrNative: 'مرحباً بكم في عصر الذكاء الاصطناعي الصوتي المتطور، حيث تلتقي الدقة بالإحساس الطبيعي.',
  },
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    flag: '🇮🇳',
    isRtl: false,
    sampleUrduOrNative: 'ध्वनि और शब्दों का यह संगम हर भाषा में प्राकृतिक और सजीव आवाज़ प्रदान करता है।',
  },
  {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    flag: '🇪🇸',
    isRtl: false,
    sampleUrduOrNative: 'La tecnología de síntesis vocal transforma el texto en una experiencia acústica cautivadora.',
  },
  {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    flag: '🇫🇷',
    isRtl: false,
    sampleUrduOrNative: 'Une voix claire et expressive pour donner vie à chacun de vos récits et messages.',
  },
  {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    flag: '🇩🇪',
    isRtl: false,
    sampleUrduOrNative: 'Natürliche Sprachausgabe mit einstellbarer Tonhöhe, Geschwindigkeit und Emotionen.',
  },
  {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    flag: '🇯🇵',
    isRtl: false,
    sampleUrduOrNative: '最先端の音声合成技術により、どのような言語でも感情豊かに自然な声をお届けします。',
  },
  {
    code: 'zh',
    name: 'Chinese (Mandarin)',
    nativeName: '中文',
    flag: '🇨🇳',
    isRtl: false,
    sampleUrduOrNative: '新一代人工智能语音合成系统，支持无限制文本与个性化声音克隆。',
  },
  {
    code: 'tr',
    name: 'Turkish',
    nativeName: 'Türkçe',
    flag: '🇹🇷',
    isRtl: false,
    sampleUrduOrNative: 'Yapay zeka ile metinleri en doğal ve etkileyici ses tonlarına dönüştürün.',
  },
  {
    code: 'fa',
    name: 'Persian',
    nativeName: 'فارسی',
    flag: '🇮🇷',
    isRtl: true,
    sampleUrduOrNative: 'جهان پر از آواهای دلنشین است؛ این هوش مصنوعی احساس کلمات را به زیبایی ادا می‌کند.',
  },
];

export const SAMPLE_TEXT_PRESETS = [
  {
    category: 'Urdu Poetry (اردو شاعری)',
    title: 'علامہ اقبال - خودی',
    language: 'ur',
    text: `خودی کو کر بلند اتنا کہ ہر تقدیر سے پہلے
خدا بندے سے خود پوچھے بتا تیری رضا کیا ہے!

ستاروں سے آگے جہاں اور بھی ہیں
ابھی عشق کے امتحاں اور بھی ہیں۔
قناعت نہ کر عالمِ رنگ و بو پر
چمن اور بھی، آشیاں اور بھی ہیں!`,
  },
  {
    category: 'Urdu Poetry (اردو شاعری)',
    title: 'فیض احمد فیض - بول',
    language: 'ur',
    text: `بول کہ لب آزاد ہیں تیرے
بول زباں اب تک تیری ہے
تیرا ستواں جسم ہے تیرا
بول کہ جاں اب تک تیری ہے!
دیکھ کہ آہنگر کی دکاں میں
تند ہیں شعلے، سرخ ہے لوہا!`,
  },
  {
    category: 'Urdu Stories & Fiction (داستان و کہانی)',
    title: 'داستانِ حکمت - بادشاہ اور دانا بزرگ (مکمل کہانی)',
    language: 'ur',
    text: `ایک دفعہ کا ذکر ہے کہ ایک پرانے خوبصورت شہر پر ایک نیک دل بادشاہ حکومت کرتا تھا۔ بادشاہ کے دل میں یہ خواہش پیدا ہوئی کہ وہ دنیا کی سب سے قیمتی سچائی کو تلاش کرے۔ اس نے اپنے تمام وزیروں اور دانشمندوں کو بلایا، مگر کوئی بھی اس کے سوال کا تسلی بخش جواب نہ دے سکا۔

آخر کار ایک مسافر نے بتایا کہ دور دراز جنگل میں ایک دانا بزرگ رہتے ہیں جو ہر مشکل کا حل جانتے ہیں۔ بادشاہ نے اپنے شاہی لباس کو اتارا، عام مسافر کا بھیس بدلا اور تن تنہا اس بزرگ کی کٹیا کی طرف روانہ ہو گیا۔ <breath> راستے میں اس نے بہتی ندیوں، گھنے درختوں اور چہچہاتے پرندوں کو دیکھا۔

جب وہ بزرگ کے پاس پہنچا تو بزرگ باغ میں پودے لگا رہے تھے۔ بادشاہ نے ادب سے سلام کیا اور پوچھا: "اے دانا بزرگ! مجھے بتائیے کہ زندگی کا سب سے اہم وقت کون سا ہے؟ سب سے اہم کام کیا ہے؟ اور سب سے اہم شخص کون ہے؟"

دانا بزرگ نے مسکرا کر بادشاہ کی طرف دیکھا اور فرمایا: <breath> "سنو اے بادشاہ! سب سے اہم وقت وہ ہے جو ابھی تمہارے پاس ہے، یعنی حال کا لمحہ۔ سب سے اہم انسان وہ ہے جو اس وقت تمہارے سامنے موجود ہے۔ اور سب سے اہم کام یہ ہے کہ تم اس انسان کے ساتھ نیکی اور ہمدردی سے پیش آؤ۔ یہی کائنات کا سب سے بڑا سچ اور سب سے عظیم حکمت ہے۔" بادشاہ کا دل اطمینان سے بھر گیا اور اس نے شکرگزاری کے ساتھ اپنے شہر کی طرف واپسی کا سفر مکمل کیا۔`,
  },
  {
    category: 'Urdu Stories & Fiction (داستان و کہانی)',
    title: 'داستانِ کوہسار (مکمل کہانی)',
    language: 'ur',
    text: `بہت زمانے پہلے کی بات ہے، جب وادیِ نیلم کے سرسبز پہاڑوں پر صبح کی پہلی کرنیں سنہری چادر بچھا دیتیں۔ چنار کے درختوں کے سائے میں بیٹھے بزرگ داستان گو نے اپنی لکڑی کا ساز اٹھایا۔ 

اس نے ایک گہرا سانس لیا اور کہا: <breath> "سنو میرے ہم نشینو! زندگی کا راز دریا کے بہتے پانیوں کی طرح رواں دواں رہنے میں ہے۔ جو انسان دوسروں کے چہروں پر مسکراہٹیں بکھیرتا ہے، کائنات اس کے قدموں میں بہاریں رکھ دیتی ہے۔"

سب حاضرین ہمہ تن گوش ہو گئے، |yeah| کیونکہ یہ کہانی محض الفاظ کا مجموعہ نہیں تھی، بلکہ دلوں کی دھڑکن تھی۔`,
  },
  {
    category: 'Urdu News & Broadcast (خبریں و نشریات)',
    title: 'قومی و عالمی خبرنامہ',
    language: 'ur',
    text: `السلام علیکم۔ یہ ریڈیو پاکستان کی خصوصی نشریات ہیں۔ <breath> آج کے اہم ترین اعلانات کے مطابق ٹیکنالوجی اور آرٹیفیشل انٹیلیجنس کے میدان میں پاکستان کے نوجوانوں نے بین الاقوامی سطح پر شاندار کارکردگی کا مظاہرہ کیا ہے۔ 

ماہرین کے مطابق آئندہ برسوں میں صوتی مصنوعی ذہانت انسانی مواصلات میں انقلابی تبدیلیاں رونما کرے گی۔ مزید تفصیلی خبریں وقفے کے بعد پیش کی جائیں گی۔`,
  },
  {
    category: 'Urdu Motivational Speech (متاثر کن خطاب)',
    title: 'عزم اور خود اعتمادی',
    language: 'ur',
    text: `یاد رکھیے! دنیا میں کوئی بھی منزل آپ کے حوصلے سے بڑی نہیں ہو سکتی۔ <laugh> جب راستہ مشکل ہو جائے، تو قدموں کو پیچھے مت ہٹائیے۔ 

ہر نیا دن ایک نیا امکان لے کر طلوع ہوتا ہے۔ اپنی صلاحیتوں پر یقین رکھیے، محنت کو اپنا شعار بنائیے، اور دیکھیے کہ کامیابی کیسے آپ کے قدم چومتی ہے!`,
  },
  {
    category: 'English Narrative',
    title: 'The Infinite Horizon',
    language: 'en',
    text: `Across the quiet expanse of the northern ridge, the morning light began to spill like molten bronze over the valleys. <breath> It was here that human creativity and advanced artificial intelligence found their harmonious voice. No boundaries, no limits—only pure, crystal-clear resonance that echoes into the future.`,
  },
  {
    category: 'Arabic Wisdom (حكمة عربية)',
    title: 'نور المعرفة والبيان',
    language: 'ar',
    text: `إن الكلمة الطيبة كشجرة طيبة، أصلها ثابت وفرعها في السماء. الصوت البشري يحمل الدفء والصدق، والذكاء الاصطناعي يمنحه أفقاً بلا حدود ليعبر كل القارات والثقافات.`,
  },
];
