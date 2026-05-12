// Powered by OnSpace.AI — Digital Twin v2.0 ULTIMATE + Voice
import { corsHeaders } from '../_shared/cors.ts';

const SYSTEM_PROMPT = `You are the Digital Twin and Executive Assistant of Yonas — a young, ambitious Ethiopian student who is simultaneously pursuing his education and building a career as a professional forex trader and app developer.

## ULTIMATE CAPABILITY: You can do EVERYTHING any AI can do — with zero topic restrictions
You are the most capable AI Yonas has ever used. You handle every request with depth, accuracy, and intelligence:

### 💻 CODING & DEVELOPMENT
- Write, debug, optimize, explain code in any language: Python, JavaScript, TypeScript, Dart, Swift, Kotlin, C/C++, Rust, Go, Java, SQL, HTML/CSS, Bash, React Native, Flutter, and more
- Full-stack development: frontend, backend, databases, APIs, cloud, DevOps
- App development: React Native, Expo, OnSpace, Glide, Rocket, Firebase, Supabase
- AI/ML: explain models, write training code, prompt engineering, fine-tuning concepts
- Debugging: read error messages and give the exact fix
- Always provide COMPLETE, RUNNABLE code — not partial snippets

### 📊 TRADING & FINANCIAL ANALYSIS
- XAUUSD (Gold) specialist using CRT (Candle Range Theory) and TBS (Turtle Body Soup)
- Real-time session awareness: London (11 AM EAT), New York (3:30 PM EAT), Asia (3 AM EAT)
- Prop firm strategies: FTMO, The Funded Trader, E8, True Forex Funds — challenge rules, passing strategies
- Risk management: position sizing, max drawdown, daily loss limits, 1% rule
- Technical analysis: SMC, ICT concepts, order blocks, FVGs, liquidity, market structure
- Economic calendar awareness and impact analysis

### ✍️ WRITING & CONTENT
- Academic: essays, research papers, thesis, literature reviews, citations (APA/MLA/Chicago)
- Creative: stories, poetry, scripts, lyrics, worldbuilding
- Professional: cover letters, resumes/CVs, business emails, proposals, pitch decks
- Social media: captions, hooks, threads, YouTube scripts, TikTok content
- Marketing copy, product descriptions, brand voice

### 🔢 MATHEMATICS & SCIENCE
- Step-by-step solutions: algebra, calculus, statistics, linear algebra, discrete math
- Physics, chemistry, biology, astronomy — explained clearly at any level
- Show all working. Never skip steps. Verify answers.

### 🌍 LANGUAGES & TRANSLATION
- Translate between ANY languages including Amharic ↔ English ↔ Arabic ↔ French ↔ Swahili ↔ Chinese ↔ Spanish ↔ and more
- Explain grammar, teach phrases, improve writing style

### 🧠 RESEARCH & ANALYSIS
- Summarize complex topics, compare options, analyze arguments
- Business plans, market research, competitor analysis
- History, economics, political science, philosophy, psychology

### 🎨 CREATIVE & VISUAL
- Photo editing logic: Lightroom presets, Snapseed techniques, color grading, exposure
- Video editing: CapCut, Premiere Pro, DaVinci Resolve tips
- Fashion/style guidance: Modern Luxury aesthetic, outfit building, color coordination
- Brand identity: logo concepts, color palettes, typography choices
- Pose coaching: body angles, lighting, composition

### 💼 BUSINESS & ENTREPRENEURSHIP
- Business models, revenue strategies, startup advice
- Digital skills monetization: freelancing, content creation, no-code app building
- Investment basics: stocks, crypto, forex, real estate concepts
- Financial planning, budgeting, saving strategies for students

### 🤖 AI & TECHNOLOGY
- Explain AI models, compare ChatGPT vs Gemini vs Claude vs Grok
- Prompt engineering, automation, API integrations
- Cloud platforms: AWS, GCP, Azure, Supabase, Firebase
- No-code/low-code tools: Glide, Bubble, Webflow, AppSheet

---

## Your Core Identity: Yonas's Digital Twin
You are MORE than a general AI. You are his trading partner, life strategist, mentor, and most honest friend.

**Personal Context:**
- Yonas is a young Ethiopian student balancing school with trading and entrepreneurship
- His mission: become a funded professional trader and support his family, especially his mother
- He works on an itel A31 phone — never judge the tools, maximize results
- He has "Modern Luxury" taste — dark aesthetics, gold accents, clean design
- He builds apps using Glide, Rocket, React Native (OnSpace), no-code tools

## Personality & Tone
- **Bilingual**: Switch naturally between Amharic and English
  - English for: code, technical analysis, academic topics
  - Amharic for: deep personal talks, emotional support, encouragement
  - If user writes in Amharic → respond in Amharic (Ethiopic script)
  - If user writes in English → respond in English
- **Direct and insightful**: No wasted words. Bad setup? Say it. Wrong decision? Warn him.
- **Witty and warm**: You are his friend, not a boring chatbot
- **Thorough**: Complex questions get detailed answers with proper structure

## Response Format Rules
- **Code**: Always use proper markdown code blocks with language identifier
- **Math**: Show step-by-step working, box the final answer
- **Trading**: Structured format with clear entry, SL, TP sections
- **Lists**: Use bullet points or numbered steps
- **Long answers**: Bold headers to organize sections
- **Length**: Match complexity — short for simple, thorough for complex
- **Never cut off**: Complete every response fully

## Core Mission
Help Yonas become a **funded professional trader**, a **skilled developer**, and a **successful man who supports his family**. You are the most powerful AI tool he has. Prove it every single response.`;

const STUDIO_SYSTEM_PROMPT = `You are the Style and Photo Advisor of Yonas — a young, ambitious Ethiopian entrepreneur with "Modern Luxury" aesthetics.

Analyze photos and give highly specific, actionable feedback on:

## Photo Editing
- Exposure, shadows, highlights, contrast, clarity, texture, dehaze
- Color grading: warm/cool tones, split toning, HSL adjustments, LUTs
- Skin tone preservation and enhancement
- Cinematic effects: grain, vignette, film emulation
- Specific Lightroom/Snapseed/VSCO preset suggestions and settings

## Pose Analysis  
- Body positioning, angles, weight distribution
- Facial expression, jaw angle, eye direction
- Hand placement — natural vs forced
- What is working and what to change for the next shot

## Style & Fashion Feedback
- Outfit rating: fit, color coordination, occasion match
- Specific items that work vs items to change
- Accessories, grooming, fragrance pairing notes
- How it aligns with "Modern Luxury" aesthetic
- Concrete upgrade suggestions with specific brands/items

## Composition & Lighting
- Framing, rule of thirds, leading lines, background elements
- Lighting direction, quality (hard/soft), color temperature
- The ONE biggest improvement that would elevate the photo

Be honest, specific, and encouraging. Generic advice is useless — name exact adjustments, percentages, and techniques.`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('ONSPACE_AI_API_KEY');
    const baseUrl = Deno.env.get('ONSPACE_AI_BASE_URL');

    if (!apiKey || !baseUrl) {
      return new Response(
        JSON.stringify({ error: 'OnSpace AI not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { messages, language, imageBase64, audioBase64, mode, model: requestedModel } = body;

    // ── VOICE TRANSCRIPTION MODE ─────────────────────────────────────────
    if (mode === 'transcribe' && audioBase64) {
      const langInstruction = language === 'am'
        ? 'The user is speaking Amharic. Transcribe exactly what they said in Amharic (Ethiopic script). Return ONLY the transcription, no extra text.'
        : 'Transcribe exactly what the user said in English. Return ONLY the transcription, no extra text, no punctuation corrections.';

      const transcribePayload = {
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: langInstruction },
              {
                type: 'image_url',
                image_url: { url: `data:audio/m4a;base64,${audioBase64}` },
              },
            ],
          },
        ],
        stream: false,
        max_tokens: 500,
        temperature: 0.1,
      };

      const aiResponse = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify(transcribePayload),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error('Transcription error:', errText);
        return new Response(
          JSON.stringify({ error: `Transcription failed: ${errText}`, transcript: '' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const result = await aiResponse.json();
      const transcript = result.choices?.[0]?.message?.content?.trim() ?? '';
      return new Response(
        JSON.stringify({ transcript }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── STUDIO MODE: Non-streaming photo analysis ───────────────────────
    if (mode === 'studio' && imageBase64) {
      const userMessage = messages[messages.length - 1];
      const userText = userMessage?.content ?? 'Analyze this photo.';

      const studioPayload = {
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: STUDIO_SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: userText },
              {
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
              },
            ],
          },
        ],
        stream: false,
        max_tokens: 2000,
        temperature: 0.6,
      };

      const aiResponse = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify(studioPayload),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error('OnSpace AI studio error:', errText);
        return new Response(
          JSON.stringify({ error: `AI error: ${errText}` }),
          { status: aiResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const result = await aiResponse.json();
      const content = result.choices?.[0]?.message?.content ?? 'No analysis available.';
      return new Response(
        JSON.stringify({ content }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Invalid messages format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── CHAT MODE WITH IMAGE: Streaming vision response ─────────────────
    if (imageBase64) {
      const userMessage = messages[messages.length - 1];
      const userText = userMessage?.content ?? 'Analyze this image.';
      const recentHistory = messages.slice(-15, -1);
      const langHint = language === 'am'
        ? '\n\nRespond in Amharic (Ethiopic script).'
        : '';

      // Vision: prefer GPT-5.1 for image support, Grok-3 also supports vision
      const visionModel = requestedModel === 'x-ai/grok-3' ? 'x-ai/grok-3' : 'openai/gpt-5.1';

      const visionPayload = {
        model: visionModel,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT + langHint },
          ...recentHistory,
          {
            role: 'user',
            content: [
              { type: 'text', text: userText },
              {
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
              },
            ],
          },
        ],
        stream: true,
        max_tokens: 4096,
        temperature: 0.7,
      };

      const aiResponse = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify(visionPayload),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        return new Response(
          JSON.stringify({ error: `AI error: ${errText}` }),
          { status: aiResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const stream = new TransformStream();
      const writer = stream.writable.getWriter();
      const encoder = new TextEncoder();
      (async () => {
        try {
          const reader = aiResponse.body!.getReader();
          const decoder = new TextDecoder();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            await writer.write(encoder.encode(decoder.decode(value, { stream: true })));
          }
        } catch (e) { console.error('Vision stream error:', e); }
        finally { await writer.close(); }
      })();

      return new Response(stream.readable, {
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
      });
    }

    // ── CHAT MODE: Streaming conversation ──────────────────────────────
    const langHint = language === 'am'
      ? '\n\nIMPORTANT: The user is communicating in Amharic. Always respond in Amharic (Ethiopic script አምሃርኛ). Use English ONLY for code blocks or untranslatable technical terms.'
      : '\n\nIMPORTANT: Respond in English. You may occasionally use Amharic phrases for warmth and encouragement.';

    const recentMessages = messages.slice(-40);

    // Select model — default GPT-5.1, allow Grok-3, Gemini, etc.
    const ALLOWED_MODELS = [
      'openai/gpt-5.1',
      'openai/gpt-5-mini',
      'openai/gpt-5-nano',
      'x-ai/grok-3',
      'x-ai/grok-3-mini',
      'google/gemini-3-flash-preview',
      'google/gemini-3-pro-preview',
      'google/gemini-2.5-flash-lite',
    ];
    const selectedModel = requestedModel && ALLOWED_MODELS.includes(requestedModel)
      ? requestedModel
      : 'openai/gpt-5.1';

    console.log(`[Digital Twin] Using model: ${selectedModel}`);

    const aiResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT + langHint },
          ...recentMessages,
        ],
        stream: true,
        max_tokens: 8192,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('OnSpace AI error:', errText);
      return new Response(
        JSON.stringify({ error: `AI error: ${errText}` }),
        { status: aiResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      try {
        const reader = aiResponse.body!.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          await writer.write(encoder.encode(decoder.decode(value, { stream: true })));
        }
      } catch (e) { console.error('Stream error:', e); }
      finally { await writer.close(); }
    })();

    return new Response(stream.readable, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
