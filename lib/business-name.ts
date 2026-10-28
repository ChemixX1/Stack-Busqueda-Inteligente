// Keep published business names; use the domain's name when a record only has a URL.
export function businessName(name: string): string {
  const value = name.trim().replace(/\\([:/.])/g, '$1');
  if (!/^(?:https?:\/\/|www\.)\S+$/i.test(value) && !/^[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+(?:[/:?#]\S*)?$/u.test(value)) return value;
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    const labels = url.hostname.replace(/^www\./i, '').split('.');
    const compoundSuffix = labels.length >= 3 && labels.at(-1)!.length === 2 && /^(?:com|co|org|net|gov|edu|ac)$/.test(labels.at(-2)!);
    return labels.at(compoundSuffix ? -3 : -2) || labels[0] || value;
  } catch {
    return value;
  }
}
