import { createSignal, createEffect, onCleanup } from "@lumina/bridge";

interface ClockOptions {
  format?: Intl.DateTimeFormatOptions;
  interval?: number;
  locale?: string | string[];
}

export function useClock(options: ClockOptions = {}): () => string {
  const {
    format = { hour: "2-digit", minute: "2-digit" },
    interval = 1000,
    locale = undefined, // Use system default
  } = options;

  const formatter = new Intl.DateTimeFormat(locale, format);
  const [time, setTime] = createSignal(formatter.format(new Date()));

  createEffect(() => {
    const id = setInterval(() => {
      setTime(formatter.format(new Date()));
    }, interval);

    onCleanup(() => clearInterval(id));
  });

  return time;
}
