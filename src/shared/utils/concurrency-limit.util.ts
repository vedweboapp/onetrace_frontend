export function createConcurrencyLimiter(limit: number) {
  const queue: Array<() => void> = [];
  let running = 0;

  const next = () => {
    if (queue.length === 0 || running >= limit) return;
    running++;
    const nextTask = queue.shift();
    if (nextTask) {
      try {
        nextTask();
      } catch (err) {
        running--;
        next();
      }
    }
  };

  return async <T>(task: () => Promise<T>): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      queue.push(() => {
        task()
          .then(resolve)
          .catch(reject)
          .finally(() => {
            running--;
            next();
          });
      });
      next();
    });
  };
}

export const pinThumbnailCropLimiter = createConcurrencyLimiter(8);
