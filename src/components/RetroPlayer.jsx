import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, Square, Volume2, VolumeX, Radio } from 'lucide-react';

export default function RetroPlayer({ item, onClose }) {
  const isYouTube = item.type === 'youtube';
  const [isPlaying, setIsPlaying] = useState(isYouTube);
  const [isMuted, setIsMuted] = useState(false);
  const [isPoweringOff, setIsPoweringOff] = useState(false);
  const [isTheatreMode, setIsTheatreMode] = useState(false);
  const [isCleanScreen, setIsCleanScreen] = useState(true);
  const [aspectRatio, setAspectRatio] = useState('16/9'); // '16/9', '4:3', '21:9'
  
  // Refs for audio synthesizers
  const audioContextRef = useRef(null);
  const noiseGainNodeRef = useRef(null);
  const humGainNodeRef = useRef(null);
  const isAudioInitialized = useRef(false);

  // Refs for tape deck animations
  const canvasRef = useRef(null);
  const requestRef = useRef(null);
  const iframeRef = useRef(null);
  const reelsAngleRef = useRef(0);
  const reelsSpeedRef = useRef(3); // Degrees per frame
  const needleAngle1Ref = useRef(-60); // Resting angle
  const needleAngle2Ref = useRef(-60);

  // YouTube ID Extraction
  const getYouTubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // Spotify Episode ID Extraction
  const getSpotifyEpisodeId = (url) => {
    if (!url) return null;
    const match = url.match(/open\.spotify\.com\/episode\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  };

  // Apple Podcasts Embed URL converter
  const getApplePodcastsEmbedUrl = (url) => {
    if (!url) return null;
    if (url.includes('podcasts.apple.com')) {
      return url.replace('podcasts.apple.com', 'embed.podcasts.apple.com');
    }
    return null;
  };

  const youtubeId = isYouTube ? getYouTubeId(item.url) : null;
  const spotifyId = !isYouTube ? getSpotifyEpisodeId(item.url) : null;
  const appleEmbedUrl = !isYouTube ? getApplePodcastsEmbedUrl(item.url) : null;
  const spotifyPlaceholderRef = useRef(null);
  const embedControllerRef = useRef(null);

  // Initialize Web Audio API for ambient tape hiss and transformer hum
  const initTapeSound = () => {
    if (isAudioInitialized.current) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      audioContextRef.current = ctx;

      // 1. Generate White Noise Buffer for Tape Hiss
      const bufferSize = 2 * ctx.sampleRate;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      // Filter the noise to sound like a warm tape hiss
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1200; // Sage tape frequency
      filter.Q.value = 0.6;

      const noiseGain = ctx.createGain();
      noiseGain.gain.value = isMuted ? 0 : 0.025; // Warm, subtle hiss
      noiseGainNodeRef.current = noiseGain;

      noiseSource.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noiseSource.start();

      // 2. Generate 60Hz hum for industrial electrical vibe
      const humOsc = ctx.createOscillator();
      humOsc.type = 'sine';
      humOsc.frequency.value = 60; // 60Hz transformer hum

      const humFilter = ctx.createBiquadFilter();
      humFilter.type = 'lowpass';
      humFilter.frequency.value = 100;

      const humGain = ctx.createGain();
      humGain.gain.value = isMuted ? 0 : 0.008; // extremely subtle
      humGainNodeRef.current = humGain;

      humOsc.connect(humFilter);
      humFilter.connect(humGain);
      humGain.connect(ctx.destination);
      humOsc.start();

      isAudioInitialized.current = true;
    } catch (err) {
      console.warn('AudioContext failed to initialize:', err);
    }
  };

  // Mute/Unmute control for synths
  useEffect(() => {
    if (noiseGainNodeRef.current && humGainNodeRef.current) {
      const volume = isMuted || !isPlaying ? 0 : 1;
      noiseGainNodeRef.current.gain.setValueAtTime(volume * 0.025, audioContextRef.current.currentTime);
      humGainNodeRef.current.gain.setValueAtTime(volume * 0.008, audioContextRef.current.currentTime);
    }
  }, [isMuted, isPlaying]);

  const podcastAudioRef = useRef(null);

  // Clean up audio on unmount
  useEffect(() => {
    if (!isYouTube && !spotifyId && !appleEmbedUrl) {
      podcastAudioRef.current = new Audio('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3');
      podcastAudioRef.current.loop = true;
      podcastAudioRef.current.volume = 0.55;
    }

    return () => {
      if (podcastAudioRef.current) {
        podcastAudioRef.current.pause();
        podcastAudioRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isYouTube, spotifyId, appleEmbedUrl]);

  // Load and manage Spotify IFrame API script & controllers
  useEffect(() => {
    if (isYouTube || !spotifyId) return;

    // Load Spotify Embed API script if not present
    let script = document.getElementById('spotify-iframe-api');
    if (!script) {
      script = document.createElement('script');
      script.id = 'spotify-iframe-api';
      script.src = 'https://open.spotify.com/embed/iframe-api/v1';
      script.async = true;
      document.body.appendChild(script);
    }

    const initController = (IFrameAPI) => {
      const element = spotifyPlaceholderRef.current;
      if (!element) return;

      const options = {
        uri: `spotify:episode:${spotifyId}`,
        width: '100%',
        height: '152',
      };

      IFrameAPI.createController(element, options, (EmbedController) => {
        embedControllerRef.current = EmbedController;

        // Register playback event listener to sync reels/oscilloscope
        EmbedController.addListener('playback_update', (e) => {
          const { isPaused, isBuffering } = e.data;
          setIsPlaying(!isPaused && !isBuffering);
        });

        // Initialize tape sound and play automatically
        initTapeSound();
        EmbedController.play();
      });
    };

    // If script is already loaded and API is ready
    if (window.SpotifyIframeApi) {
      initController(window.SpotifyIframeApi);
    } else {
      // Define global ready handler
      const oldReady = window.onSpotifyIframeApiReady;
      window.onSpotifyIframeApiReady = (IFrameAPI) => {
        window.SpotifyIframeApi = IFrameAPI;
        if (oldReady) oldReady(IFrameAPI);
        initController(IFrameAPI);
      };
    }

    return () => {
      if (embedControllerRef.current) {
        embedControllerRef.current = null;
      }
    };
  }, [isYouTube, spotifyId]);

  // Visualizer Canvas & VU needle update loops
  useEffect(() => {
    if (isYouTube) return; // Only run for podcast tape visualizer

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let phase = 0;

    const render = () => {
      // 1. Clear Canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#1e2030'; // Dark radar/CRT screen background
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Grid Lines (Oscilloscope grid)
      ctx.strokeStyle = 'rgba(166, 209, 137, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw horizontal center line
      ctx.strokeStyle = 'rgba(166, 209, 137, 0.15)';
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();

      // 2. Draw Oscilloscope Waveform
      ctx.beginPath();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#a6d189'; // Glowing green trace
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#a6d189';

      const amplitude = isPlaying ? 22 : 0.5; // Flat line when paused
      const frequency = 0.035;

      for (let x = 0; x < canvas.width; x++) {
        // Compose multiple sine waves for a rich, realistic oscilloscope wave
        let y = canvas.height / 2;
        if (isPlaying) {
          y += Math.sin(x * frequency + phase) * amplitude;
          y += Math.sin(x * 0.015 - phase * 1.5) * (amplitude * 0.4);
          y += (Math.random() - 0.5) * 1.5; // Subtle high-frequency noise jitter
        } else {
          y += (Math.random() - 0.5) * 0.5; // Dead static hum
        }
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0; // Reset shadow

      // Increment phase for wave animation speed
      if (isPlaying) {
        phase += 0.12;
        // Spin tape reels
        reelsAngleRef.current += reelsSpeedRef.current;
        if (reelsAngleRef.current >= 360) reelsAngleRef.current = 0;
      }

      // Update reels animation speed
      if (isPlaying && reelsSpeedRef.current < 2.5) {
        reelsSpeedRef.current += 0.05; // Spin up
      } else if (!isPlaying && reelsSpeedRef.current > 0) {
        reelsSpeedRef.current -= 0.1; // Slow down to stop
        if (reelsSpeedRef.current < 0) reelsSpeedRef.current = 0;
      }

      // Rotate reel DOM elements manually to prevent react render overhead
      const reelLeft = document.getElementById('reel-left');
      const reelRight = document.getElementById('reel-right');
      if (reelLeft) reelLeft.style.transform = `rotate(${reelsAngleRef.current}deg)`;
      if (reelRight) reelRight.style.transform = `rotate(${reelsAngleRef.current}deg)`;

      // 3. Update Bouncing VU Needles
      const targetNeedleAngle1 = isPlaying 
        ? -40 + Math.sin(phase * 1.4) * 35 + (Math.random() - 0.5) * 15
        : -60;
      const targetNeedleAngle2 = isPlaying
        ? -42 + Math.sin(phase * 1.7) * 32 + (Math.random() - 0.5) * 18
        : -60;

      // Inertia interpolation (smooth needle movement)
      needleAngle1Ref.current += (targetNeedleAngle1 - needleAngle1Ref.current) * 0.25;
      needleAngle2Ref.current += (targetNeedleAngle2 - needleAngle2Ref.current) * 0.25;

      const needle1 = document.getElementById('vu-needle-left');
      const needle2 = document.getElementById('vu-needle-right');
      if (needle1) needle1.style.transform = `rotate(${needleAngle1Ref.current}deg)`;
      if (needle2) needle2.style.transform = `rotate(${needleAngle2Ref.current}deg)`;

      requestRef.current = requestAnimationFrame(render);
    };

    requestRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(requestRef.current);
  }, [isPlaying, isYouTube]);

  const handleTapePlay = () => {
    initTapeSound();
    setIsPlaying(true);
    if (spotifyId && embedControllerRef.current) {
      embedControllerRef.current.play();
    } else if (podcastAudioRef.current) {
      podcastAudioRef.current.play().catch(err => console.log("Audio play error:", err));
      podcastAudioRef.current.muted = isMuted;
    }
  };

  const handleTapePause = () => {
    setIsPlaying(false);
    if (spotifyId && embedControllerRef.current) {
      embedControllerRef.current.pause();
    } else if (podcastAudioRef.current) {
      podcastAudioRef.current.pause();
    }
  };

  const handleTapeMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (podcastAudioRef.current) {
      podcastAudioRef.current.muted = nextMute;
    }
  };

  // Autoplay fallback/other podcasts on mount
  useEffect(() => {
    if (!isYouTube && !spotifyId && !appleEmbedUrl) {
      const timer = setTimeout(() => {
        handleTapePlay();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isYouTube, spotifyId, appleEmbedUrl]);

  const triggerPowerOff = () => {
    setIsPoweringOff(true);
    // Let the TV fade collapse trigger for 450ms before calling onClose
    setTimeout(() => {
      onClose();
    }, 450);
  };

  const toggleYoutubePlay = () => {
    const nextPlaying = !isPlaying;
    setIsPlaying(nextPlaying);
    
    if (iframeRef.current && iframeRef.current.contentWindow) {
      const command = nextPlaying ? 'playVideo' : 'pauseVideo';
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: command, args: '' }),
        '*'
      );
    }
  };

  const cycleAspectRatio = () => {
    setAspectRatio((prev) => {
      if (prev === '16/9') return '21/9';
      if (prev === '21/9') return '4/3';
      return '16/9';
    });
  };

  return (
    <div className={`modal-overlay-container ${isTheatreMode ? 'theatre-overlay' : ''}`}>
      <div className={`modal-backdrop ${isTheatreMode ? 'theatre-backdrop' : ''}`} onClick={isYouTube ? triggerPowerOff : onClose} />
      
      <AnimatePresence>
        <motion.div
          initial={{ scale: 0.9, y: 30, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.8, y: 40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          className={`retro-player-card ${isYouTube ? 'crt-tv-container' : 'tape-deck-container'} ${isPoweringOff ? 'tv-power-off' : ''} ${isTheatreMode ? 'theatre-mode' : ''}`}
        >
          {/* Main Close button */}
          <button 
            className="player-close-btn" 
            onClick={isYouTube ? triggerPowerOff : onClose}
            title={isYouTube ? "Switch TV Off" : "Close Deck"}
          >
            <X size={16} />
          </button>

          {isYouTube ? (
            /* ==============================================================
               1. CRT TV CABINET INTERFACE (YOUTUBE MODAL)
               ============================================================== */
            <div className="crt-tv-wrapper">
              <div className="crt-tv-body">
                {/* Visual screen bezel framing */}
                <div 
                  className="crt-screen-bezel"
                  style={{ aspectRatio }}
                >
                  <div className={`crt-screen-inner ${(youtubeId && isCleanScreen) ? 'clean-video-screen' : ''}`}>
                    {/* Retro CRT Overlays: Rendered only when screen is not set to clean mode */}
                    {(!youtubeId || !isCleanScreen) && (
                      <>
                        <div className="crt-scanlines-overlay" />
                        <div className="crt-glass-reflection" />
                        <div className="crt-screen-shadow" />
                        <div className="crt-flicker-layer" />
                      </>
                    )}

                    {/* YouTube Video iframe */}
                    {youtubeId ? (
                      <iframe
                        ref={iframeRef}
                        src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&controls=1&enablejsapi=1&rel=0&modestbranding=1`}
                        title={item.title}
                        className="crt-youtube-iframe"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    ) : (
                      <div className="crt-static-noise-screen">
                        <div className="static-fuzz" />
                        <div className="crt-center-message">NO SIGNAL</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Cabinet control panel on the right side of the vintage TV */}
                <div className="crt-tv-controls">
                  <div className="crt-tv-brand">PODTUBE 400</div>
                  
                  {/* Play/Pause Button */}
                  <div className="dial-group">
                    <label className="dial-label">PLAYBACK</label>
                    <button 
                      type="button"
                      onClick={toggleYoutubePlay}
                      className={`crt-tv-btn ${isPlaying ? 'playing' : 'paused'}`}
                      title={isPlaying ? "Pause Video" : "Play Video"}
                    >
                      {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                    </button>
                    <span className="dial-status-text">{isPlaying ? "PLAYING" : "PAUSED"}</span>
                  </div>

                  {/* CRT Filter Toggle Switch */}
                  <div className="dial-group">
                    <label className="dial-label">CRT FILTER</label>
                    <button 
                      type="button"
                      className={`crt-theatre-switch ${!isCleanScreen ? 'switched-on' : 'switched-off'}`}
                      onClick={() => setIsCleanScreen(!isCleanScreen)}
                      title="Toggle CRT Filter"
                    >
                      <span className="switch-knob" />
                    </button>
                    <span className="dial-status-text">{isCleanScreen ? "CLEAN" : "RETRO"}</span>
                  </div>

                  {/* Theatre Mode Toggle Switch */}
                  <div className="dial-group">
                    <label className="dial-label">THEATRE MODE</label>
                    <button 
                      type="button"
                      className={`crt-theatre-switch ${isTheatreMode ? 'switched-on' : 'switched-off'}`}
                      onClick={() => setIsTheatreMode(!isTheatreMode)}
                      title="Toggle Theatre Mode"
                    >
                      <span className="switch-knob" />
                    </button>
                    <span className="dial-status-text">{isTheatreMode ? "CINEMA" : "NORMAL"}</span>
                  </div>

                  {/* Aspect Ratio Rotary Dial */}
                  <div className="dial-group">
                    <label className="dial-label">ASPECT RATIO</label>
                    <div 
                      className="crt-rotary-dial small-dial" 
                      onClick={cycleAspectRatio}
                      title="Rotate to change aspect ratio"
                      style={{ 
                        transform: `rotate(${
                          aspectRatio === '4/3' ? 0 : aspectRatio === '16/9' ? 120 : 240
                        }deg)` 
                      }}
                    >
                      <div className="dial-notch" />
                    </div>
                    <span className="dial-status-text">
                      {aspectRatio === '4/3' ? "4:3 (STD)" : aspectRatio === '16/9' ? "16:9 (WIDE)" : "21:9 (CINE)"}
                    </span>
                  </div>

                  {/* Red Power Switch Indicator */}
                  <div className="crt-power-section">
                    <button 
                      className={`crt-power-button ${isPoweringOff ? 'off' : 'on'}`}
                      onClick={triggerPowerOff}
                      title="Tactile Power Switch"
                    >
                      {isPoweringOff ? '●' : 'I/O'}
                    </button>
                    <span className="crt-power-label">POWER</span>
                    <div className={`crt-power-led ${isPoweringOff ? 'led-off' : 'led-on'}`} />
                  </div>
                </div>
              </div>
              <div className="crt-cabinet-feet">
                <div className="foot left-foot" />
                <div className="foot right-foot" />
              </div>
            </div>
          ) : (
            /* ==============================================================
               2. REEL-TO-REEL TAPE DECK INTERFACE (PODCAST MODAL)
               ============================================================== */
            <div className="tape-deck-wrapper">
              {/* Wooden Cabinet Bezel outline */}
              <div className="tape-deck-faceplate">
                
                {/* Header branding */}
                <div className="tape-deck-header">
                  <span className="brand-logo">🎙️ AMPEX RETRO-900</span>
                  <div className="tape-deck-stats">
                    <span className="tape-tag">HIGH BIAS</span>
                    <span className="tape-tag">DOLBY B-C NR</span>
                  </div>
                </div>

                {/* 1. Two Rotating Tape Reels */}
                <div className="tape-reels-assembly">
                  {/* Left Tape Reel */}
                  <div className="reel-shaft left-shaft">
                    <div id="reel-left" className="tape-reel">
                      <div className="reel-center" />
                      <div className="reel-spoke spoke-1" />
                      <div className="reel-spoke spoke-2" />
                      <div className="reel-spoke spoke-3" />
                      {/* The brown magnetic tape buildup */}
                      <div className="magnetic-tape-wrap" style={{ width: '82%', height: '82%' }} />
                    </div>
                  </div>

                  {/* Right Tape Reel */}
                  <div className="reel-shaft right-shaft">
                    <div id="reel-right" className="tape-reel">
                      <div className="reel-center" />
                      <div className="reel-spoke spoke-1" />
                      <div className="reel-spoke spoke-2" />
                      <div className="reel-spoke spoke-3" />
                      {/* Magnetic tape builds up on right as tape plays, here we keep it equal for symmetry */}
                      <div className="magnetic-tape-wrap" style={{ width: '65%', height: '65%' }} />
                    </div>
                  </div>
                </div>

                {/* Tape path rollers guides */}
                <div className="tape-guide-rollers">
                  <div className="roller left-roller" />
                  <div className="tape-line" />
                  <div className="roller right-roller" />
                </div>

                {/* 2. Middle Panel: Spotify Embed Player & Oscilloscope */}
                <div className="tape-middle-row">
                  {/* Spotify/Apple embedded widget / fallback info panel */}
                  <div className="tape-embed-container">
                    {spotifyId ? (
                      <div ref={spotifyPlaceholderRef} style={{ width: '100%', height: '152px' }} />
                    ) : appleEmbedUrl ? (
                      <iframe
                        src={appleEmbedUrl}
                        width="100%"
                        height="152"
                        frameBorder="0"
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        style={{ borderRadius: 'var(--radius-sm)', border: 'none' }}
                        loading="lazy"
                      />
                    ) : (
                      <div className="podcast-fallback-panel">
                        <Radio size={28} className="fallback-podcast-icon animate-pulse" />
                        <div className="fallback-title-text">{item.title}</div>
                        <a 
                          href={item.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="btn-retro btn-retro-primary fallback-visit-btn"
                        >
                          OPEN LINK DIRECTLY
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Glowing Green Oscilloscope */}
                  <div className="oscilloscope-panel">
                    <canvas 
                      ref={canvasRef} 
                      width="180" 
                      height="90" 
                      className="oscilloscope-canvas"
                    />
                    <div className="panel-label">SIGNAL OSCILLOSCOPE</div>
                  </div>
                </div>

                {/* 3. Bottom Row: Analog VU meters and Control Panel */}
                <div className="tape-bottom-row">
                  {/* Dual VU needle meters */}
                  <div className="vu-meters-assembly">
                    <div className="vu-meter-case">
                      <div className="vu-meter-glass">
                        <div className="vu-arc-scale" />
                        <div id="vu-needle-left" className="vu-needle" />
                        <div className="vu-meter-label">L CH</div>
                      </div>
                    </div>
                    <div className="vu-meter-case">
                      <div className="vu-meter-glass">
                        <div className="vu-arc-scale" />
                        <div id="vu-needle-right" className="vu-needle" />
                        <div className="vu-meter-label">R CH</div>
                      </div>
                    </div>
                  </div>

                  {/* Audio Controls */}
                  <div className="tape-transport-controls">
                    <button 
                      onClick={isPlaying ? handleTapePause : handleTapePlay}
                      className={`tape-btn ${isPlaying ? 'active-play' : ''}`}
                      title={isPlaying ? "Pause Tape" : "Play Tape"}
                    >
                      {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                      <span className="btn-legend">{isPlaying ? "PAUSE" : "PLAY"}</span>
                    </button>

                    <button 
                      onClick={handleTapePause}
                      className={`tape-btn ${!isPlaying ? 'active-stop' : ''}`}
                      title="Stop Tape"
                    >
                      <Square size={14} />
                      <span className="btn-legend">STOP</span>
                    </button>

                    <button 
                      onClick={handleTapeMute}
                      className={`tape-btn ${isMuted ? 'active-mute' : ''}`}
                      title="Toggle Tape Hiss Noise"
                    >
                      {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                      <span className="btn-legend">{isMuted ? "UNMUTE" : "MUTE HISS"}</span>
                    </button>
                  </div>
                </div>

                <div className="tape-instruction-note">
                  📻 RETRO TAPE DECK ACTIVE // FOR SPOTIFY/APPLE, CLICK PLAY DIRECTLY INSIDE THE EMBEDDED PLAYER IF AUDIO CONTROLS ARE DE-SYNCED
                </div>

              </div>
              <div className="tape-deck-wood-sides" />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
