import gongUrl from '../assets/gong.wav';

let element: HTMLAudioElement | null = null;

/**
 * Played by the panel, never by the scoreboard: the panel always has a user
 * gesture behind it, so autoplay policy cannot block it.
 */
export function playGong(): void {
  element ??= new Audio(gongUrl);
  element.currentTime = 0;
  void element.play().catch(() => {
    /* nothing useful to do; the contest carries on without the sound */
  });
}
