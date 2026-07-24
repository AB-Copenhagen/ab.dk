import { MediaPlayer, MediaProvider, isHLSProvider } from '@vidstack/react';
import type { MediaProviderAdapter } from '@vidstack/react';
import {
  DefaultVideoLayout,
  defaultLayoutIcons,
} from '@vidstack/react/player/layouts/default';

import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';

interface VideoPlayerProps {
  streamUrl: string;
  title: string;
  locale: 'da' | 'en';
}

// AB's stream is low-latency HLS (CMAF parts) — hls.js's defaults (30s forward
// buffer, 3-segment live sync) are tuned for typical VOD/live delivery and
// leave little slack when the encoder or network briefly hiccups, which reads
// to viewers as the player getting stuck buffering. Trading a few extra
// seconds of live latency for a deeper buffer favors uninterrupted playback,
// which matters more for match streaming.
function onProviderChange(provider: MediaProviderAdapter | null) {
  if (isHLSProvider(provider)) {
    provider.config = {
      maxBufferLength: 60,
      maxMaxBufferLength: 900,
      liveSyncDurationCount: 6,
      liveMaxLatencyDurationCount: 12,
    };
  }
}

export default function VideoPlayer({
  streamUrl,
  title,
  locale,
}: VideoPlayerProps) {
  return (
    <MediaPlayer
      className="w-full aspect-video"
      title={title}
      src={{ src: streamUrl, type: 'application/x-mpegurl' }}
      playsInline
      streamType="live"
      style={{ '--media-brand': 'var(--ab-neon)' }}
      onProviderChange={onProviderChange}
    >
      <MediaProvider />
      <DefaultVideoLayout
        icons={defaultLayoutIcons}
        translations={locale === 'da' ? DA_TRANSLATIONS : undefined}
      />
    </MediaPlayer>
  );
}

// Vidstack's default layout ships English strings only — a partial override
// covers the controls AB's stream actually exposes (live video, no captions/
// chapters/quality menu yet) rather than translating the full control set.
const DA_TRANSLATIONS = {
  Play: 'Afspil',
  Pause: 'Pause',
  Mute: 'Slå lyd fra',
  Unmute: 'Slå lyd til',
  'Seek Forward': 'Spol frem',
  'Seek Backward': 'Spol tilbage',
  'Enter Fullscreen': 'Fuld skærm',
  'Exit Fullscreen': 'Afslut fuld skærm',
  'Enter PiP': 'Billede i billede',
  'Exit PiP': 'Afslut billede i billede',
  LIVE: 'LIVE',
  Settings: 'Indstillinger',
};
