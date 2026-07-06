/** Joins conditional class names — no extra dep, no conflicting Tailwind classes to merge here. */
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
