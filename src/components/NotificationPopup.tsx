import { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

function playLaughSound() {
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    const notes = [
      { freq: 600, start: 0, dur: 0.12 },
      { freq: 500, start: 0.13, dur: 0.1 },
      { freq: 700, start: 0.25, dur: 0.12 },
      { freq: 550, start: 0.38, dur: 0.1 },
      { freq: 800, start: 0.5, dur: 0.15 },
      { freq: 600, start: 0.67, dur: 0.1 },
      { freq: 900, start: 0.8, dur: 0.15 },
      { freq: 700, start: 0.97, dur: 0.12 },
    ];

    for (const n of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(n.freq, now + n.start);
      osc.frequency.exponentialRampToValueAtTime(n.freq * 0.7, now + n.start + n.dur);
      gain.gain.setValueAtTime(0.3, now + n.start);
      gain.gain.exponentialRampToValueAtTime(0.01, now + n.start + n.dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + n.start);
      osc.stop(now + n.start + n.dur + 0.05);
    }

    for (let i = 0; i < 6; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t = i * 0.18;
      osc.frequency.setValueAtTime(1200 + i * 100, now + t);
      osc.frequency.exponentialRampToValueAtTime(800, now + t + 0.08);
      gain.gain.setValueAtTime(0.15, now + t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + t);
      osc.stop(now + t + 0.12);
    }

    setTimeout(() => ctx.close(), 2000);
  } catch {
    // Audio not available
  }
}

export default function NotificationPopup() {
  const [notification, setNotification] = useState<{ id: number; message: string } | null>(null);
  const [visible, setVisible] = useState(false);
  const lastSeenRef = useRef<number>(
    parseInt(localStorage.getItem('gate_last_notif_id') || '0', 10)
  );

  const dismiss = useCallback(() => {
    setVisible(false);
    setTimeout(() => setNotification(null), 300);
  }, []);

  useEffect(() => {
    let mounted = true;

    const poll = async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('id, message')
          .eq('active', true)
          .gt('id', lastSeenRef.current)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.error('Notification poll error:', error);
          return;
        }

        if (!mounted || !data?.length) return;

        const notif = data[0];
        lastSeenRef.current = notif.id;
        localStorage.setItem('gate_last_notif_id', String(notif.id));

        setNotification({ id: notif.id, message: notif.message });

        setTimeout(() => {
          if (mounted) {
            setVisible(true);
            playLaughSound();
          }
        }, 50);

        setTimeout(() => {
          if (mounted) dismiss();
        }, 5000);
      } catch (err) {
        console.error('Notification poll exception:', err);
      }
    };

    poll();
    const interval = setInterval(poll, 5000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [dismiss]);

  if (!notification) return null;

  return (
    <div
      className={`
        fixed top-0 left-0 right-0 z-[9999] flex justify-center pointer-events-none
        transition-all duration-300 ease-out
        ${visible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}
      `}
    >
      <div className="pointer-events-auto mt-4 mx-4 max-w-lg w-full flex items-center gap-3 rounded-2xl border border-amber-400/30 bg-gradient-to-r from-amber-500/90 via-orange-500/90 to-rose-500/90 px-5 py-4 shadow-2xl shadow-amber-500/25 backdrop-blur-xl">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 animate-bounce">
          <Volume2 className="h-5 w-5 text-white" />
        </div>
        <p className="flex-1 text-sm font-bold text-white leading-snug">
          {notification.message}
        </p>
        <button
          onClick={dismiss}
          className="shrink-0 rounded-full p-1.5 text-white/70 hover:bg-white/20 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
