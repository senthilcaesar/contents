import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, Play, Pause } from 'lucide-react';

export default function RetroPlayer({ item, isMinimized, onMinimize, onMaximize, onClose }) {
  const isYouTube = item.type === 'youtube';
  const [isPlaying, setIsPlaying] = useState(isYouTube);
  const [isPoweringOff, setIsPoweringOff] = useState(false);
  const [isTheatreMode, setIsTheatreMode] = useState(false);
  const [isCleanScreen, setIsCleanScreen] = useState(true);
  const [aspectRatio, setAspectRatio] = useState('16/9');
  const [iframeKey, setIframeKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1 playback progress for mini ring

  useEffect(() => {
    if (isMinimized) setIsFullscreen(false);
  }, [isMinimized]);

  // Reset progress when the playing item changes
  useEffect(() => { setProgress(0); }, [item.url]);

  // Animation refs
  const canvasRef     = useRef(null);
  const requestRef    = useRef(null);
  const iframeRef     = useRef(null);
  const reelsAngleRef = useRef(0);
  const reelsSpeedRef = useRef(0);
  const needle1Ref    = useRef(-60);
  const needle2Ref    = useRef(-60);
  const progressRef   = useRef(0.28);
  const phaseRef      = useRef(0);
  const spotifyWrapperRef  = useRef(null);
  const embedControllerRef = useRef(null);

  // ── URL helpers ──────────────────────────────────────────────────────────
  const getYouTubeId = (url) => {
    if (!url) return null;
    const m = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
    return (m && m[2].length === 11) ? m[2] : null;
  };
  const getSpotifyId = (url) => {
    if (!url) return null;
    const m = url.match(/open\.spotify\.com\/episode\/([a-zA-Z0-9]+)/);
    return m ? m[1] : null;
  };
  const getAppleUrl = (url) => {
    if (!url || !url.includes('podcasts.apple.com')) return null;
    return url.replace('podcasts.apple.com', 'embed.podcasts.apple.com');
  };

  const youtubeId  = isYouTube ? getYouTubeId(item.url)  : null;
  const spotifyId  = !isYouTube ? getSpotifyId(item.url)  : null;
  const appleUrl   = !isYouTube ? getAppleUrl(item.url)   : null;

  // ── Cleanup ──────────────────────────────────────────────────────────────
  useEffect(() => () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); }, []);

  // ── Spotify IFrame API ───────────────────────────────────────────────────
  useEffect(() => {
    if (isYouTube || !spotifyId) return;
    let cancelled = false;
    let localCtrl  = null;

    let script = document.getElementById('spotify-iframe-api');
    if (!script) {
      script = document.createElement('script');
      script.id  = 'spotify-iframe-api';
      script.src = 'https://open.spotify.com/embed/iframe-api/v1';
      script.async = true;
      document.body.appendChild(script);
    }

    const init = (API) => {
      const wrapper = spotifyWrapperRef.current;
      if (!wrapper) return;
      wrapper.innerHTML = '';
      const el = document.createElement('div');
      el.style.cssText = 'width:100%;height:100%;';
      wrapper.appendChild(el);

      API.createController(el, { uri: `spotify:episode:${spotifyId}`, width: '100%', height: '152' }, (ctrl) => {
        if (cancelled) { ctrl?.destroy?.(); return; }
        localCtrl = ctrl;
        embedControllerRef.current = ctrl;
        let started = false;          // becomes true once audio is actually rolling
        let autoplayRetried = false;  // best-effort autoplay: retry once if still paused
        ctrl.addListener('playback_update', ({ data }) => {
          const playing = !data.isPaused && !data.isBuffering;
          if (playing) started = true;
          setIsPlaying(playing);
          if (data.duration > 0) {
            const p = data.position / data.duration;
            progressRef.current = p;
            setProgress(Math.min(1, p));
          }
          // If the embed loaded paused (autoplay blocked/ignored), try once more
          // while we may still be inside the browser's user-activation window.
          if (!started && !autoplayRetried && data.isPaused) {
            autoplayRetried = true;
            ctrl.play();
          }
        });
        ctrl.play();
      });
    };

    if (window.SpotifyIframeApi) init(window.SpotifyIframeApi);
    else {
      const prev = window.onSpotifyIframeApiReady;
      window.onSpotifyIframeApiReady = (API) => {
        window.SpotifyIframeApi = API;
        if (prev) prev(API);
        init(API);
      };
    }

    return () => {
      cancelled = true;
      embedControllerRef.current?.destroy?.();
      embedControllerRef.current = null;
      localCtrl?.destroy?.();
      if (spotifyWrapperRef.current) spotifyWrapperRef.current.innerHTML = '';
    };
  }, [isYouTube, spotifyId]);

  // ── YouTube progress tracking (for mini progress ring) ───────────────────
  useEffect(() => {
    if (!isYouTube) return;
    const onMsg = (e) => {
      if (typeof e.data !== 'string' || !/youtube\.com/.test(e.origin)) return;
      try {
        const d = JSON.parse(e.data);
        if (d.event === 'infoDelivery' && d.info &&
            d.info.duration > 0 && d.info.currentTime != null) {
          setProgress(Math.min(1, d.info.currentTime / d.info.duration));
        }
      } catch { /* ignore non-JSON messages */ }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [isYouTube]);

  // ── Animation loop (podcast only) ────────────────────────────────────────
  useEffect(() => {
    if (isYouTube) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    const CX_L = 130, CX_R = 470, CY = 100;

    const render = () => {
      const phase = phaseRef.current;

      // ── Oscilloscope ─────────────────────────────────────────────
      ctx.clearRect(0, 0, W, H);

      // Grid
      ctx.strokeStyle = 'rgba(0,255,157,0.06)';
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 22) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
      for (let y = 0; y < H; y += 22) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(0,255,157,0.18)';
      ctx.beginPath(); ctx.moveTo(0, H/2); ctx.lineTo(W, H/2); ctx.stroke();

      // Waveform
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#00ff9d';
      ctx.shadowBlur  = 12;
      ctx.shadowColor = '#00ff9d';
      const amp   = isPlaying ? 24 : 0.6;
      const sweep = 2.0;
      const tpp   = sweep / W;
      const tOff  = phase * 0.022;
      for (let x = 0; x < W; x++) {
        let y = H / 2;
        if (isPlaying) {
          const t  = x * tpp + tOff;
          const so = Math.sin(2 * Math.PI * 0.75 * t) * 0.45;
          const se = Math.max(0, Math.sin(2 * Math.PI * 0.08 * t) * 0.7 + 0.3);
          const sp = se * Math.sin(2 * Math.PI * 13 * t) * 0.30;
          const nf = [1.2, 2.7, 4.3, 6.1, 8.7];
          const na = [0.22, 0.16, 0.12, 0.09, 0.07];
          let noise = 0;
          for (let i = 0; i < nf.length; i++) noise += Math.sin(2*Math.PI*nf[i]*t + i*1.7) * na[i];
          y += (so + sp + noise) * amp + (Math.random()-0.5) * 0.8;
        } else {
          y += (Math.random()-0.5) * 0.5;
        }
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // ── Physics ────────────────────────────────────────────────────
      if (isPlaying) {
        phaseRef.current += 0.10;
        if (!spotifyId) {
          progressRef.current += 0.000045;
          if (progressRef.current > 1) progressRef.current = 0;
        }
        reelsAngleRef.current += reelsSpeedRef.current;
        if (reelsAngleRef.current >= 360) reelsAngleRef.current -= 360;
      }
      if (isPlaying && reelsSpeedRef.current < 2.5)       reelsSpeedRef.current += 0.05;
      else if (!isPlaying && reelsSpeedRef.current > 0) { reelsSpeedRef.current -= 0.10; if (reelsSpeedRef.current < 0) reelsSpeedRef.current = 0; }

      // ── Update SVG reels ───────────────────────────────────────────
      const r1 = 28 + 46 * (1 - progressRef.current);
      const r2 = 28 + 46 * progressRef.current;

      document.getElementById('left-tape-wrap')?.setAttribute('r', r1);
      document.getElementById('right-tape-wrap')?.setAttribute('r', r2);

      document.getElementById('left-tape-arc')?.setAttribute('d',
        `M ${CX_L} ${CY - r1} A ${r1} ${r1} 0 0 0 ${CX_L} ${CY + r1}`);
      document.getElementById('right-tape-arc')?.setAttribute('d',
        `M ${CX_R} ${CY + r2} A ${r2} ${r2} 0 0 0 ${CX_R} ${CY - r2}`);

      const setLine = (id, y1, y2) => {
        const el = document.getElementById(id);
        if (el) { el.setAttribute('y1', y1); el.setAttribute('y2', y2); }
      };
      setLine('top-tape-line',    CY - r1, CY - r2);
      setLine('bot-tape-line',    CY + r1, CY + r2);
      setLine('top-tape-line-hi', CY - r1, CY - r2);
      setLine('bot-tape-line-hi', CY + r1, CY + r2);

      const rot = reelsAngleRef.current;
      document.getElementById('left-spokes')?.setAttribute('transform',  `rotate(${rot} ${CX_L} ${CY})`);
      document.getElementById('right-spokes')?.setAttribute('transform', `rotate(${rot} ${CX_R} ${CY})`);

      // ── VU needles ─────────────────────────────────────────────────
      const t1 = isPlaying ? -40 + Math.sin(phase*1.4)*35 + (Math.random()-0.5)*15 : -60;
      const t2 = isPlaying ? -42 + Math.sin(phase*1.7)*32 + (Math.random()-0.5)*18 : -60;
      needle1Ref.current += (t1 - needle1Ref.current) * 0.25;
      needle2Ref.current += (t2 - needle2Ref.current) * 0.25;
      const n1 = document.getElementById('vu-needle-left');
      const n2 = document.getElementById('vu-needle-right');
      if (n1) n1.style.transform = `rotate(${needle1Ref.current}deg)`;
      if (n2) n2.style.transform = `rotate(${needle2Ref.current}deg)`;

      requestRef.current = requestAnimationFrame(render);
    };

    requestRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(requestRef.current);
  }, [isPlaying, isYouTube, spotifyId]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const triggerPowerOff = () => { setIsPoweringOff(true); setTimeout(onClose, 550); };

  const toggleYT = () => {
    const next = !isPlaying;
    setIsPlaying(next);
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: next ? 'playVideo' : 'pauseVideo', args: '' }), '*'
    );
  };

  // Tell the YT iframe to start emitting infoDelivery (progress) events
  const startYTListening = () => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*'
    );
  };

  const handlePlay = () => {
    if (isYouTube) toggleYT();
    else if (embedControllerRef.current) embedControllerRef.current.togglePlay();
    else setIsPlaying(p => !p);
  };

  const cycleAR = () => setAspectRatio(p => p === '16/9' ? '21/9' : p === '21/9' ? '4/3' : '16/9');

  // Circumference of the mini progress ring (r = 20)
  const RING_C = 2 * Math.PI * 20;

  // ── Cassette SVG ─────────────────────────────────────────────────────────
  const CX_L = 130, CX_R = 470, CY = 100;
  const p0  = progressRef.current;
  const R1  = 28 + 46 * (1 - p0);
  const R2  = 28 + 46 * p0;

  const SPOKES = [0, 60, 120, 180, 240, 300];

  const ReelSVG = () => (
    <svg className="rp-reel-svg" viewBox="0 0 600 200" preserveAspectRatio="xMidYMid meet">
      <defs>
        {/* Metallic hub gradient */}
        <radialGradient id="rg-hub" cx="40%" cy="35%" r="65%">
          <stop offset="0%"   stopColor="#e0e0e0" />
          <stop offset="40%"  stopColor="#909090" />
          <stop offset="85%"  stopColor="#383838" />
          <stop offset="100%" stopColor="#111" />
        </radialGradient>
        {/* Brown tape gradient */}
        <radialGradient id="rg-tape" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#c08060" />
          <stop offset="55%"  stopColor="#8c5630" />
          <stop offset="88%"  stopColor="#5c3014" />
          <stop offset="100%" stopColor="#3a1a05" />
        </radialGradient>
        {/* Reel body gradient */}
        <radialGradient id="rg-reel" cx="40%" cy="35%" r="70%">
          <stop offset="0%"   stopColor="#3a3a50" />
          <stop offset="60%"  stopColor="#20202e" />
          <stop offset="100%" stopColor="#10101a" />
        </radialGradient>
        {/* Chrome sheen */}
        <linearGradient id="lg-sheen" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#fff" stopOpacity="0.12" />
          <stop offset="50%"  stopColor="#fff" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.08" />
        </linearGradient>
        {/* Tape glow */}
        <filter id="tape-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        {/* Reel shadow */}
        <filter id="reel-shadow" x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor="rgba(0,0,0,0.6)"/>
        </filter>
      </defs>

      {/* ── Left Reel ─────────────────────────────────────────── */}
      <g filter="url(#reel-shadow)">
        {/* Outer ring */}
        <circle cx={CX_L} cy={CY} r="92" fill="url(#rg-reel)" />
        <circle cx={CX_L} cy={CY} r="92" fill="url(#lg-sheen)" />
        <circle cx={CX_L} cy={CY} r="92" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        <circle cx={CX_L} cy={CY} r="90" fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="2" />

        {/* Spokes (rotated by JS) */}
        <g id="left-spokes">
          {SPOKES.map(a => (
            <line key={a}
              x1={CX_L} y1={CY - 20} x2={CX_L} y2={CY - 84}
              stroke="#4a4a60" strokeWidth="6" strokeLinecap="round"
              transform={`rotate(${a} ${CX_L} ${CY})`}
            />
          ))}
          {/* Inner ring */}
          <circle cx={CX_L} cy={CY} r="22" fill="#1a1a28" stroke="rgba(255,255,255,0.07)" strokeWidth="1.5" />
        </g>

        {/* Tape wrap (radius updated by JS) */}
        <circle id="left-tape-wrap" cx={CX_L} cy={CY} r={R1} fill="url(#rg-tape)" stroke="#3a1a05" strokeWidth="1.5" />

        {/* Hub centre */}
        <circle cx={CX_L} cy={CY} r="18" fill="url(#rg-hub)" />
        <circle cx={CX_L} cy={CY} r="18" fill="url(#lg-sheen)" />
        <circle cx={CX_L} cy={CY} r="7"  fill="#080808" />
        <circle cx={CX_L} cy={CY} r="3"  fill="#222" />
      </g>

      {/* ── Right Reel ────────────────────────────────────────── */}
      <g filter="url(#reel-shadow)">
        <circle cx={CX_R} cy={CY} r="92" fill="url(#rg-reel)" />
        <circle cx={CX_R} cy={CY} r="92" fill="url(#lg-sheen)" />
        <circle cx={CX_R} cy={CY} r="92" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        <circle cx={CX_R} cy={CY} r="90" fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="2" />

        <g id="right-spokes">
          {SPOKES.map(a => (
            <line key={a}
              x1={CX_R} y1={CY - 20} x2={CX_R} y2={CY - 84}
              stroke="#4a4a60" strokeWidth="6" strokeLinecap="round"
              transform={`rotate(${a} ${CX_R} ${CY})`}
            />
          ))}
          <circle cx={CX_R} cy={CY} r="22" fill="#1a1a28" stroke="rgba(255,255,255,0.07)" strokeWidth="1.5" />
        </g>

        <circle id="right-tape-wrap" cx={CX_R} cy={CY} r={R2} fill="url(#rg-tape)" stroke="#3a1a05" strokeWidth="1.5" />

        <circle cx={CX_R} cy={CY} r="18" fill="url(#rg-hub)" />
        <circle cx={CX_R} cy={CY} r="18" fill="url(#lg-sheen)" />
        <circle cx={CX_R} cy={CY} r="7"  fill="#080808" />
        <circle cx={CX_R} cy={CY} r="3"  fill="#222" />
      </g>

      {/* ── Tape paths (drawn on top) ──────────────────────────── */}
      {/* Shadow layer */}
      <line x1={CX_L} y1={CY - R1} x2={CX_R} y2={CY - R2} stroke="#000" strokeWidth="9" opacity="0.35" />
      <line x1={CX_L} y1={CY + R1} x2={CX_R} y2={CY + R2} stroke="#000" strokeWidth="9" opacity="0.35" />

      {/* Main tape lines */}
      <line id="top-tape-line" x1={CX_L} y1={CY - R1} x2={CX_R} y2={CY - R2}
        stroke="#6b3a1c" strokeWidth="6" opacity="0.95" filter="url(#tape-glow)" />
      <line id="bot-tape-line" x1={CX_L} y1={CY + R1} x2={CX_R} y2={CY + R2}
        stroke="#6b3a1c" strokeWidth="6" opacity="0.95" filter="url(#tape-glow)" />

      {/* Highlight stripe */}
      <line id="top-tape-line-hi" x1={CX_L} y1={CY - R1} x2={CX_R} y2={CY - R2}
        stroke="#c08060" strokeWidth="1.5" opacity="0.3" />
      <line id="bot-tape-line-hi" x1={CX_L} y1={CY + R1} x2={CX_R} y2={CY + R2}
        stroke="#c08060" strokeWidth="1.5" opacity="0.3" />

      {/* Wrapping arcs */}
      <path id="left-tape-arc"
        d={`M ${CX_L} ${CY - R1} A ${R1} ${R1} 0 0 0 ${CX_L} ${CY + R1}`}
        fill="none" stroke="#6b3a1c" strokeWidth="6" strokeLinecap="round" opacity="0.95" />
      <path id="right-tape-arc"
        d={`M ${CX_R} ${CY + R2} A ${R2} ${R2} 0 0 0 ${CX_R} ${CY - R2}`}
        fill="none" stroke="#6b3a1c" strokeWidth="6" strokeLinecap="round" opacity="0.95" />

      {/* Tape head (centre guide) */}
      <rect x="266" y={CY - 12} width="68" height="24" rx="6" fill="#0d0d18" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
      <rect x="272" y={CY - 6} width="56" height="4" rx="2" fill="#f59e0b" opacity="0.8" />
      <rect x="272" y={CY + 2} width="56" height="4" rx="2" fill="#f59e0b" opacity="0.4" />
    </svg>
  );

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className={[
      'rp-overlay',
      isMinimized   ? 'rp-overlay--mini'    : '',
      isFullscreen  ? 'rp-overlay--full'    : '',
      (isYouTube && isTheatreMode && !isFullscreen) ? 'rp-overlay--theatre' : '',
    ].join(' ')}>

      {/* Backdrop */}
      {!isMinimized && (
        <div className="rp-backdrop"
          onClick={() => {
            if (isFullscreen) { setIsFullscreen(false); return; }
            if (isYouTube && isTheatreMode) { setIsTheatreMode(false); return; }
            if (isYouTube) triggerPowerOff();
          }}
        />
      )}

      <AnimatePresence>
        <motion.div key="rp-card"
          initial={{ y: 50, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 60, opacity: 0, scale: 0.93 }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          className={[
            'rp-card',
            isYouTube     ? 'rp-card--yt'      : 'rp-card--tape',
            isPoweringOff ? 'rp-card--poweroff' : '',
            isFullscreen  ? 'rp-card--full'     : '',
            isMinimized   ? 'rp-card--mini'     : '',
            (isYouTube && isTheatreMode && !isFullscreen) ? 'rp-card--theatre' : '',
          ].join(' ')}
        >

          {/* ╔══════════════════════════════════════════════════╗
              ║  WINDOW CHROME  (traffic-light buttons)          ║
              ╚══════════════════════════════════════════════════╝ */}
          <div className="rp-chrome">
            <button className="rp-dot rp-dot--close"   onClick={isYouTube ? triggerPowerOff : onClose} title="Close" />
            <button className="rp-dot rp-dot--min"     onClick={isMinimized ? onMaximize : onMinimize} title={isMinimized ? 'Expand' : 'Minimise'} />
            {!isMinimized && (
              <button className="rp-dot rp-dot--full" onClick={() => setIsFullscreen(f => !f)} title={isFullscreen ? 'Restore' : 'Fullscreen'} />
            )}
            <span className="rp-chrome-title">
              {isYouTube ? '📺 VIDEO' : '📼 TAPE DECK'}
            </span>
          </div>

          {/* ╔══════════════════════════════════════════════════╗
              ║  MINIMISED BAR                                   ║
              ╚══════════════════════════════════════════════════╝ */}
          {isMinimized && (
            <div className="rp-minibar">
              {/* Spinning disc */}
              <div className={`rp-mini-disc ${isPlaying ? 'rp-mini-disc--spin' : ''}`}>
                <div className="rp-mini-disc-rim" />
                <div className="rp-mini-disc-hub" />
              </div>

              {/* Info */}
              <div className="rp-mini-info">
                <div className="rp-mini-title">{item.title}</div>
                <div className="rp-mini-creator">{item.creator}</div>
              </div>

              {/* Play / Pause with progress ring */}
              <div className="rp-mini-play-wrap">
                <svg className="rp-mini-ring" viewBox="0 0 44 44" aria-hidden="true">
                  <circle className="rp-mini-ring-track" cx="22" cy="22" r="20" />
                  <circle className="rp-mini-ring-fill" cx="22" cy="22" r="20"
                    style={{ strokeDasharray: RING_C, strokeDashoffset: RING_C * (1 - progress) }} />
                </svg>
                <button className="rp-mini-play" onClick={handlePlay} title={isPlaying ? 'Pause' : 'Play'}>
                  {isPlaying
                    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                    : <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  }
                </button>
              </div>

              {/* Expand button */}
              <button className="rp-mini-expand" onClick={onMaximize} title="Expand player">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="15 3 21 3 21 9"/>
                  <polyline points="9 21 3 21 3 15"/>
                  <line x1="21" y1="3" x2="14" y2="10"/>
                  <line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
              </button>

              {/* Close button */}
              <button className="rp-mini-close" onClick={onClose} title="Close">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          )}

          {/* ╔══════════════════════════════════════════════════╗
              ║  YOUTUBE / CRT TV                                ║
              ╚══════════════════════════════════════════════════╝ */}
          {isYouTube && (
            <div className={`crt-tv-wrapper ${isMinimized ? 'crt-tv-wrapper--audio-only' : ''}`}>
              <div className="crt-tv-body">
                <div className="crt-screen-bezel" style={{ aspectRatio }}>
                  <div className={`crt-screen-inner ${youtubeId && isCleanScreen ? 'clean-video-screen' : ''}`}>
                    {(!youtubeId || !isCleanScreen) && (<>
                      <div className="crt-scanlines-overlay" />
                      <div className="crt-glass-reflection" />
                      <div className="crt-screen-shadow" />
                      <div className="crt-flicker-layer" />
                    </>)}
                    {youtubeId
                      ? <iframe ref={iframeRef}
                          src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&controls=1&enablejsapi=1&rel=0&modestbranding=1`}
                          title={item.title} className="crt-youtube-iframe"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          onLoad={startYTListening}
                          allowFullScreen />
                      : <div className="crt-static-noise-screen">
                          <div className="static-fuzz" />
                          <div className="crt-center-message">NO SIGNAL</div>
                        </div>
                    }
                  </div>
                </div>
                <div className="crt-tv-controls">
                  <div className="crt-tv-brand">PODTUBE 400</div>
                  <div className="dial-group">
                    <label className="dial-label">PLAYBACK</label>
                    <button type="button" onClick={toggleYT} className={`crt-tv-btn ${isPlaying ? 'playing' : 'paused'}`}>
                      {isPlaying ? <Pause size={16} fill="currentColor"/> : <Play size={16} fill="currentColor"/>}
                    </button>
                    <span className="dial-status-text">{isPlaying ? 'PLAYING' : 'PAUSED'}</span>
                  </div>
                  <div className="dial-group">
                    <label className="dial-label">CRT FILTER</label>
                    <button type="button" className={`crt-theatre-switch ${!isCleanScreen ? 'switched-on' : 'switched-off'}`} onClick={() => setIsCleanScreen(s => !s)}>
                      <span className="switch-knob" />
                    </button>
                    <span className="dial-status-text">{isCleanScreen ? 'CLEAN' : 'RETRO'}</span>
                  </div>
                  <div className="dial-group">
                    <label className="dial-label">THEATRE MODE</label>
                    <button type="button" className={`crt-theatre-switch ${isTheatreMode ? 'switched-on' : 'switched-off'}`} onClick={() => setIsTheatreMode(m => !m)}>
                      <span className="switch-knob" />
                    </button>
                    <span className="dial-status-text">{isTheatreMode ? 'CINEMA' : 'NORMAL'}</span>
                  </div>
                  <div className="dial-group">
                    <label className="dial-label">ASPECT RATIO</label>
                    <div className="crt-rotary-dial small-dial" onClick={cycleAR}
                      style={{ transform: `rotate(${aspectRatio==='4/3'?0:aspectRatio==='16/9'?120:240}deg)` }}>
                      <div className="dial-notch" />
                    </div>
                    <span className="dial-status-text">{aspectRatio==='4/3'?'4:3 (STD)':aspectRatio==='16/9'?'16:9 (WIDE)':'21:9 (CINE)'}</span>
                  </div>
                  <div className="crt-power-section">
                    <button className={`crt-power-button ${isPoweringOff?'off':'on'}`} onClick={triggerPowerOff}>{isPoweringOff?'●':'I/O'}</button>
                    <span className="crt-power-label">POWER</span>
                    <div className={`crt-power-led ${isPoweringOff?'led-off':'led-on'}`} />
                  </div>
                </div>
              </div>
              <div className="crt-cabinet-feet">
                <div className="foot left-foot" /><div className="foot right-foot" />
              </div>
            </div>
          )}

          {/* ╔══════════════════════════════════════════════════╗
              ║  PODCAST TAPE DECK  (NEW DESIGN)                 ║
              ╚══════════════════════════════════════════════════╝ */}
          {!isYouTube && (
            <div className={`rp-tape-deck ${isMinimized ? 'rp-tape-deck--hidden' : ''}`}>

              {/* ── Brand bar ──────────────────────────────────── */}
              <div className="rp-deck-header">
                <div className="rp-deck-leds">
                  <span className="rp-led rp-led--power" />
                  <span className={`rp-led rp-led--play ${isPlaying ? 'rp-led--active' : ''}`} />
                  <span className="rp-led-label">AMPEX · RETRO-900</span>
                </div>
                <div className="rp-deck-badges">
                  <span className="rp-badge">HIGH BIAS</span>
                  <span className="rp-badge">DOLBY NR</span>
                  <span className={`rp-badge rp-badge--status ${isPlaying ? 'rp-badge--play' : 'rp-badge--pause'}`}>
                    {isPlaying ? '▶ PLAYING' : '⏸ PAUSED'}
                  </span>
                </div>
              </div>

              {/* ── Cassette window ────────────────────────────── */}
              <div className="rp-cassette-body">
                <div className="rp-cassette-shell">
                  <div className="rp-screw rp-screw--tl" /><div className="rp-screw rp-screw--tr" />
                  <div className="rp-screw rp-screw--bl" /><div className="rp-screw rp-screw--br" />
                  <div className="rp-cassette-window">
                    <div className="rp-cassette-window-glass">
                      <ReelSVG />
                    </div>
                  </div>
                  <div className="rp-cassette-label">
                    <div className="rp-cassette-label-title">{item.title}</div>
                    <div className="rp-cassette-label-sub">{item.creator} · TYPE II · C-90</div>
                  </div>
                </div>
              </div>

              {/* ── Embed player — always mounted so audio keeps playing ── */}
              <div className="rp-embed">
                {spotifyId
                  ? <div ref={spotifyWrapperRef} style={{ width:'100%', height:'152px' }} />
                  : appleUrl
                  ? <iframe key={iframeKey} src={appleUrl} width="100%" height="152" frameBorder="0"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      style={{ borderRadius:'10px', border:'none' }} loading="lazy" />
                  : <div className="rp-fallback">
                      <Radio size={26} className="rp-fallback-icon" />
                      <p className="rp-fallback-title">{item.title}</p>
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="rp-fallback-link">
                        Open in browser →
                      </a>
                    </div>
                }
              </div>

              {/* ── Bottom controls ────────────────────────────── */}
              <div className="rp-deck-bottom">
                <div className="rp-osc-panel">
                  <div className="rp-osc-specs">
                    <span className="rp-osc-spec"><em>SR</em> 256 Hz</span>
                    <span className="rp-osc-spec"><em>FREQ</em> 0.5–35 Hz</span>
                    <span className="rp-osc-spec"><em>AMP</em> ±75 µV</span>
                  </div>
                  <canvas ref={canvasRef} width="200" height="75" className="rp-osc-canvas" />
                  <div className="rp-osc-label">OSC · 256 Hz</div>
                </div>
                <button className={`rp-play-btn ${isPlaying ? 'rp-play-btn--active' : ''}`} onClick={handlePlay} title={isPlaying ? 'Pause' : 'Play'}>
                  <div className="rp-play-btn-ring" />
                  <div className="rp-play-btn-face">
                    {isPlaying
                      ? <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                      : <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    }
                  </div>
                </button>
                <div className="rp-vu-pair">
                  {['left', 'right'].map(ch => (
                    <div key={ch} className="rp-vu">
                      <div className="rp-vu-glass">
                        <div className="rp-vu-arc" />
                        <div id={`vu-needle-${ch}`} className="rp-vu-needle" />
                        <div className="rp-vu-scale" />
                      </div>
                      <div className="rp-vu-ch">{ch === 'left' ? 'L' : 'R'}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rp-footer">Audio Player</div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
}
