// Helper functions for duration calculation, timestamp formatting, and audio alert sound

export interface OrderDurationInfo {
  jamOrder: string;
  jamTerkirim: string;
  durasiMinutes: number;
  formattedDurasi: string;
  isTerlambat: boolean; // >= 90 minutes (1.5 jam) and not delivered
}

/**
 * Calculates time elapsed between order creation and delivery (or current time if pending)
 */
export function calculateOrderDuration(
  createdAt: string,
  terkirimAt?: string,
  statusPesanan?: string,
  thresholdMinutes: number = 90
): OrderDurationInfo {
  const isDelivered = statusPesanan === 'terkirim' || statusPesanan === 'selesai';
  const isCanceled = statusPesanan === 'batal';

  const startDate = new Date(createdAt);
  const endDate = isDelivered && terkirimAt ? new Date(terkirimAt) : new Date();

  // Jam Order formatted (HH:mm WIB)
  const jamOrder = isNaN(startDate.getTime())
    ? '-'
    : startDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

  // Jam Terkirim formatted (HH:mm WIB) or "Belum Terkirim"
  let jamTerkirim = 'Belum Terkirim';
  if (isDelivered && terkirimAt) {
    const d = new Date(terkirimAt);
    jamTerkirim = isNaN(d.getTime())
      ? '-'
      : d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
  } else if (isCanceled) {
    jamTerkirim = 'Dibatalkan';
  }

  // Duration in minutes
  let durasiMinutes = 0;
  if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
    durasiMinutes = Math.max(0, Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60)));
  }

  const hours = Math.floor(durasiMinutes / 60);
  const mins = durasiMinutes % 60;

  let formattedDurasi = '';
  if (hours > 0) {
    formattedDurasi = `${hours} Jam ${mins} Menit`;
  } else {
    formattedDurasi = `${mins} Menit`;
  }

  // Over threshold alert condition
  const isTerlambat = !isDelivered && !isCanceled && durasiMinutes >= thresholdMinutes;

  return {
    jamOrder,
    jamTerkirim,
    durasiMinutes,
    formattedDurasi,
    isTerlambat,
  };
}

export function formatThresholdText(minutes: number = 90): string {
  if (minutes >= 60) {
    const hrs = minutes / 60;
    return Number.isInteger(hrs) ? `${hrs} Jam` : `${hrs.toFixed(1)} Jam`;
  }
  return `${minutes} Menit`;
}

/**
 * Web Audio API Alarm Sound Synthesizer
 * Plays alternating warning tone without relying on external mp3 audio files.
 */
class AlarmSoundManager {
  private audioCtx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private timerId: any = null;

  startAlarm() {
    if (typeof window === 'undefined') return;
    if (this.isPlaying) return;

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;

      if (!this.audioCtx) {
        this.audioCtx = new AudioCtxClass();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      this.isPlaying = true;

      // Pulsing alarm beep sequence
      let toneHigh = true;
      const playBeep = () => {
        if (!this.isPlaying || !this.audioCtx) return;

        try {
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(toneHigh ? 880 : 660, this.audioCtx.currentTime); // A5 or E5 note

          gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.35);

          osc.connect(gain);
          gain.connect(this.audioCtx.destination);

          osc.start();
          osc.stop(this.audioCtx.currentTime + 0.35);

          toneHigh = !toneHigh;
        } catch (e) {
          // ignore context errors
        }
      };

      playBeep();
      this.timerId = setInterval(playBeep, 600);
    } catch (e) {
      console.warn('Web Audio error:', e);
    }
  }

  stopAlarm() {
    this.isPlaying = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

export const alarmSound = new AlarmSoundManager();
