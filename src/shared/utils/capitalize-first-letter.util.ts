export function capitalizeFirstLetter(value: string): string {
  if (!value) return value;

  const first = value.charAt(0);
  const upperFirst = first.toUpperCase();
  if (first === upperFirst) return value;

  return `${upperFirst}${value.slice(1)}`;
}
