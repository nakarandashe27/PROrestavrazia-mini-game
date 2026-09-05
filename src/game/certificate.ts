import { paintFacade } from './facade';

/** One composition serves the on-screen souvenir and the downloadable PDF. */
export const CERTIFICATE_WIDTH = 1680;
export const CERTIFICATE_HEIGHT = 1188;
const display = '"AdvakenSans-Expanded", Arial, sans-serif';
const text = '"Inter Tight", Arial, sans-serif';
type C = CanvasRenderingContext2D;

export function certificateName(name: string) {
  return name.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60) || 'Друг наследия';
}

async function readyFonts() {
  await Promise.all([
    document.fonts.load(`400 90px ${display}`, 'ХРАНИТЕЛЬ НАСЛЕДИЯ'),
    document.fonts.load(`600 84px ${text}`, 'Александра'),
    document.fonts.load(`400 30px ${text}`, 'Типография Сытина'),
  ]);
  await document.fonts.ready;
}

function rounded(c: C, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath(); c.roundRect(x, y, w, h, r);
}
function label(c: C, value: string, x: number, y: number, size: number, color = '#ffffff', family = text, weight = 400) {
  c.fillStyle = color; c.font = `${weight} ${size}px ${family}`; c.fillText(value, x, y);
}

function nameLines(c: C, value: string) {
  const max = 1390;
  let size = 94;
  c.font = `600 ${size}px ${text}`;
  if (c.measureText(value).width <= max) return { lines: [value], size };
  if (value.includes(' ')) {
    const words = value.split(' ');
    const candidates = words.slice(1).map((_, index) => {
      const a = words.slice(0, index + 1).join(' '), b = words.slice(index + 1).join(' ');
      return { lines: [a, b], width: Math.max(c.measureText(a).width, c.measureText(b).width) };
    });
    const best = candidates.sort((a, b) => a.width - b.width)[0];
    size = Math.min(76, Math.floor(94 * max / best.width));
    return { lines: best.lines, size };
  }
  size = Math.min(size, Math.floor(size * max / c.measureText(value).width));
  return { lines: [value], size };
}

export async function renderCertificate(canvas: HTMLCanvasElement, name: string, terms: number, details: number, scale = 1.5) {
  await readyFonts();
  canvas.width = Math.round(CERTIFICATE_WIDTH * scale);
  canvas.height = Math.round(CERTIFICATE_HEIGHT * scale);
  const c = canvas.getContext('2d');
  if (!c) throw new Error('Не удалось подготовить сертификат');
  c.scale(scale, scale);
  c.fillStyle = '#262626'; c.fillRect(0, 0, CERTIFICATE_WIDTH, CERTIFICATE_HEIGHT);
  c.strokeStyle = '#ffffff33'; c.lineWidth = 1.5;
  rounded(c, 42, 42, 1596, 1104, 26); c.stroke();
  for (const [x, y, h, color] of [[92, 111, 24, '#F74C2E'], [113, 90, 45, '#F28D05'], [134, 69, 66, '#D0E97E']] as const) {
    c.fillStyle = color; c.fillRect(x, y, 24, h);
  }
  c.textAlign = 'left'; label(c, 'АРХИСБОР', 183, 120, 38, '#ffffff', display);
  c.textAlign = 'right'; label(c, 'ПАМЯТНЫЙ СЕРТИФИКАТ', 1586, 104, 21, '#D0E97E');
  label(c, 'Типография И. Д. Сытина · Москва', 1586, 134, 21, '#bdbdbd');
  c.textAlign = 'center';
  label(c, 'ХРАНИТЕЛЬ', 840, 272, 100, '#ffffff', display);
  label(c, 'НАСЛЕДИЯ', 840, 378, 100, '#F28D05', display);
  label(c, 'ТЫ ПОМОГАЕШЬ ИСТОРИИ ПРОДОЛЖАТЬСЯ', 840, 441, 22, '#D0E97E');
  const fitted = nameLines(c, certificateName(name));
  const firstBaseline = fitted.lines.length === 1 ? 574 : 535;
  fitted.lines.forEach((line, i) => label(c, line, 840, firstBaseline + i * 84, fitted.size, '#ffffff', text, 600));
  c.strokeStyle = '#ffffff40'; c.lineWidth = 1;
  c.beginPath(); c.moveTo(445, 648); c.lineTo(1235, 648); c.stroke();
  label(c, 'Спасибо за любопытство, внимание к деталям', 840, 699, 29);
  label(c, 'и заботу об архитектурном наследии!', 840, 738, 29);
  c.fillStyle = '#4D61F4'; rounded(c, 385, 777, 910, 68, 34); c.fill();
  label(c, `Слов изучено: ${Math.max(0, Math.floor(terms))}     ·     Деталей восстановлено: ${Math.max(0, Math.floor(details))}`, 840, 821, 29);
  c.save(); c.beginPath(); c.rect(140, 861, 1400, 216); c.clip();
  paintFacade(c, 142, 893, 1396, 210, false, 6);
  c.restore();
  c.fillStyle = '#D0E97E'; c.fillRect(140, 1077, 1400, 3);
  label(c, 'ИССЛЕДОВАТЬ. СОХРАНИТЬ. ПРОДОЛЖИТЬ ИСТОРИЮ.', 840, 1118, 20, '#D0E97E');
}

function utf16Hex(value: string) {
  return 'FEFF' + [...value].map(char => {
    let out = ''; for (let i = 0; i < char.length; i++) out += char.charCodeAt(i).toString(16).padStart(4, '0'); return out;
  }).join('').toUpperCase();
}

/** Standards-compliant single-page PDF. Text is rasterised at 216 dpi so Cyrillic
 * and the custom display font render identically in every offline viewer. */
export function certificatePdf(jpeg: Uint8Array, width: number, height: number, name: string) {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [0];
  let byteLength = 0;
  const append = (data: string | Uint8Array) => { const bytes = typeof data === 'string' ? encoder.encode(data) : data; chunks.push(bytes); byteLength += bytes.length; };
  const object = (id: number, body: string) => { offsets[id] = byteLength; append(`${id} 0 obj\n${body}\nendobj\n`); };
  append('%PDF-1.4\n'); append(new Uint8Array([37, 226, 227, 207, 211, 10]));
  object(1, '<< /Type /Catalog /Pages 2 0 R >>');
  object(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  object(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 841.89 595.28] /Resources << /XObject << /Certificate 5 0 R >> >> /Contents 4 0 R >>');
  const commands = 'q\n841.89 0 0 595.28 0 0 cm\n/Certificate Do\nQ\n';
  object(4, `<< /Length ${encoder.encode(commands).length} >>\nstream\n${commands}endstream`);
  offsets[5] = byteLength;
  append(`5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
  append(jpeg); append('\nendstream\nendobj\n');
  object(6, `<< /Title <${utf16Hex(`Хранитель наследия — ${certificateName(name)}`)}> /Author <${utf16Hex('Архисбор')}> /Subject <${utf16Hex('Памятный сертификат за исследование типографии И. Д. Сытина')}> >>`);
  const xref = byteLength;
  append('xref\n0 7\n0000000000 65535 f \n');
  for (let i = 1; i <= 6; i++) append(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  append(`trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(chunks as BlobPart[], { type: 'application/pdf' });
}

export async function buildCertificatePdf(name: string, terms: number, details: number) {
  const canvas = document.createElement('canvas');
  await renderCertificate(canvas, name, terms, details, 1.5);
  const data = canvas.toDataURL('image/jpeg', .96).split(',')[1];
  const jpeg = Uint8Array.from(atob(data), char => char.charCodeAt(0));
  return certificatePdf(jpeg, canvas.width, canvas.height, name);
}

export async function downloadCertificate(name: string, terms: number, details: number) {
  const blob = await buildCertificatePdf(name, terms, details);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url;
  link.download = `Хранитель наследия — ${certificateName(name).replace(/[<>:"/\\|?*]/g, '')}.pdf`;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
