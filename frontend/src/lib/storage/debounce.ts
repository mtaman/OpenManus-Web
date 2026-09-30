export function createDebouncedWriter<T extends (...args: any[]) => void>(
  writer: T,
  delay = 250
) {
  let timer: ReturnType<typeof setTimeout> | undefined;

  return (...args: Parameters<T>) => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      writer(...args);
    }, delay);
  };
}
