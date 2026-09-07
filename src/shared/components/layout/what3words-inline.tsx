import { hasWhat3Words, what3WordsHref } from "@/shared/utils/what3words-display.util";

type Props = {
  value: string | null | undefined;
  label: string;
  className?: string;
};

export function What3WordsInline({ value, label, className }: Props) {
  if (!hasWhat3Words(value)) return null;
  const words = value!.trim();
  return (
    <div className={className}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <a
        href={what3WordsHref(words)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 inline-block text-sm font-semibold text-blue-600 underline-offset-2 hover:underline"
      >
        {words}
      </a>
    </div>
  );
}
