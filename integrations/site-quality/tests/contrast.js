function channelLuminance(value) {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance([r, g, b]) {
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

function parseRgb(rgbString) {
  const match = rgbString.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!match) throw new Error(`Cor não reconhecida: ${rgbString}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function contrastRatio(rgbA, rgbB) {
  const lA = relativeLuminance(parseRgb(rgbA));
  const lB = relativeLuminance(parseRgb(rgbB));
  const lighter = Math.max(lA, lB);
  const darker = Math.min(lA, lB);
  return (lighter + 0.05) / (darker + 0.05);
}
