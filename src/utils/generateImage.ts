import { seededRandom } from './seededRandom';

export function generateImage(tokenSymbolRaw: string): string {
    const tokenSymbol = tokenSymbolRaw.replace(/^0x/, '');
    const char = (
        /^0x[a-zA-Z0-9]/.test(tokenSymbolRaw) ? tokenSymbol[tokenSymbol.length - 1] : tokenSymbol[0]
    ).toUpperCase();
    const seed = tokenSymbol.split('').reduce((product, c) => (product * c.charCodeAt(0)) % 314159, 1);
    const random = seededRandom(seed);
    const dark = `hsl(${Math.round(random() * 360)}, 100%, 20%)`;
    const light = `hsl(${Math.round(random() * 360)}, 100%, 80%)`;
    const flip = random() > 0.5;
    const foreground = flip ? light : dark;
    const background = flip ? dark : light;
    const svg = [
        `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">`,
        `<defs>`,
        `<linearGradient id="bg" x1="-50%" y1="-50%" x2="100%" y2="100%">`,
        `<stop offset="0%" stop-color="white" />`,
        `<stop offset="100%" stop-color="${background}" />`,
        `</linearGradient>`,
        `</defs>`,
        `<circle cx="50" cy="50" r="50" fill="url(#bg)"/>`,
        `<text x="50" y="77" text-anchor="middle" font-family="sans-serif" font-size="75" font-weight="bold" fill="${foreground}">`,
        char,
        `</text>`,
        `</svg>`,
    ].join('');
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}