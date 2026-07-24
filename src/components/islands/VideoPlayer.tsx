import { MediaPlayer, MediaProvider } from '@vidstack/react';
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
