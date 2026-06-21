import React, { useState, useRef, useEffect } from 'react';
import { Radio, Play, Square, Loader2, Volume2, VolumeX } from 'lucide-react';

// Bloomberg Boston 92.9 FM — live TuneIn CDN stream (station s305694).
const STREAM_URL = 'https://tunein.cdnstream1.com/3689_96.mp3';
const STATION_NAME = 'BLOOMBERG';
const STATION_FREQ = '92.9 FM';

export default function RadioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [volume, setVolume] = useState(80); // 0..100
  const [showVolume, setShowVolume] = useState(false);
  const audioRef = useRef(null);

  // Keep the element volume in sync with the fader
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
  }, [volume]);

  const stop = () => {
    const a = audioRef.current;
    if (a) {
      a.pause();
      // Drop the buffered audio so the next play reconnects at the live edge
      a.removeAttribute('src');
      a.load();
    }
    setIsPlaying(false);
    setIsLoading(false);
  };

  const start = () => {
    const a = audioRef.current;
    if (!a) return;
    setHasError(false);
    setIsLoading(true);
    a.src = STREAM_URL;
    a.volume = volume / 100;
    a.load();
    a.play().catch(() => {
      setIsLoading(false);
      setIsPlaying(false);
      setHasError(true);
    });
  };

  const toggle = () => (isPlaying || isLoading ? stop() : start());

  return (
    <div className={`rr-radio ${isPlaying ? 'rr-radio--live' : ''} ${hasError ? 'rr-radio--error' : ''}`}>
      <audio
        ref={audioRef}
        preload="none"
        onPlaying={() => { setIsLoading(false); setIsPlaying(true); }}
        onWaiting={() => setIsLoading(true)}
        onPause={() => setIsPlaying(false)}
        onError={() => { if (audioRef.current?.getAttribute('src')) { setHasError(true); setIsLoading(false); setIsPlaying(false); } }}
      />

      {/* Power / play-stop */}
      <button
        className="rr-power"
        onClick={toggle}
        title={isPlaying || isLoading ? 'Stop radio' : `Play ${STATION_NAME} ${STATION_FREQ}`}
        aria-label={isPlaying || isLoading ? 'Stop radio' : 'Play radio'}
      >
        {isLoading
          ? <Loader2 size={14} className="rr-spin" />
          : isPlaying
          ? <Square size={12} fill="currentColor" />
          : <Play size={13} fill="currentColor" />}
      </button>

      {/* Dial face / station info */}
      <div className="rr-face">
        <div className="rr-face-top">
          <Radio size={11} className="rr-face-icon" />
          <span className="rr-station">{STATION_NAME}</span>
          <span className="rr-live-dot" />
        </div>
        <div className="rr-face-bottom">
          <span className="rr-freq">{STATION_FREQ}</span>
          {/* Equaliser bars animate only while live */}
          <span className="rr-eq" aria-hidden="true">
            <i /><i /><i /><i />
          </span>
          <span className="rr-status">
            {hasError ? 'OFF AIR' : isLoading ? 'TUNING…' : isPlaying ? 'ON AIR' : 'STANDBY'}
          </span>
        </div>
      </div>

      {/* Volume */}
      <div
        className="rr-vol"
        onMouseEnter={() => setShowVolume(true)}
        onMouseLeave={() => setShowVolume(false)}
      >
        <button
          className="rr-vol-btn"
          onClick={() => setVolume(v => (v === 0 ? 80 : 0))}
          title="Mute / unmute"
          aria-label="Mute or unmute"
        >
          {volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>
        <input
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={e => setVolume(parseInt(e.target.value, 10))}
          className={`rr-vol-slider ${showVolume ? 'rr-vol-slider--open' : ''}`}
          title={`Volume: ${volume}%`}
          aria-label="Radio volume"
        />
      </div>
    </div>
  );
}
