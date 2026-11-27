import type { NoteItem, PaperStyle } from '@/types/catyboard';

export type CapsuleColorId =
  | 'clear-firefly'
  | 'ocean-pearl'
  | 'sakura-globe'
  | 'amber-honey'
  | 'peach-milk'
  | 'sky-cloud'
  | 'matcha-butter'
  | 'berry-cream'
  | 'lavender-mist'
  | 'starlight-gold';

export type CapsuleFinishId =
  | 'glossy'
  | 'gold-collar'
  | 'star-dust'
  | 'candy-stripe'
  | 'heart-stamp';

export type CapsulePrescriptionId =
  | 'gratitude'
  | 'sad'
  | 'tired'
  | 'miss'
  | 'time_locked';

export type CapsuleCharmId =
  | 'clover'
  | 'origami-star'
  | 'cat-paw'
  | 'sakura'
  | 'candy'
  | 'crescent';

export type CapsuleScrollSkinId =
  | 'parchment'
  | 'lined-note'
  | 'sakura-pink'
  | 'midnight-star';

export type JarVesselStyle = 'apothecary' | 'star-bottle' | 'cat-jar';

export interface CapsulePalette {
  id: CapsuleColorId;
  label: string;
  subtitle: string;
  halfALight: string;
  halfA: string;
  halfADark: string;
  halfBLight: string;
  halfB: string;
  halfBDark: string;
  collarHex: string;
  stroke: string;
  shimmer?: boolean;
  translucent?: boolean;
  coreEffect?: 'firefly' | 'ocean' | 'sakura' | 'nebula' | 'gold-foil';
}

export const CAPSULE_PALETTES: CapsulePalette[] = [
  {
    id: 'clear-firefly',
    label: 'Pha Lê Đom Đóm',
    subtitle: 'Thủy tinh trong & đom đóm vàng',
    halfALight: '#7ebbf0',
    halfA: '#4a8ec9',
    halfADark: '#265380',
    halfBLight: 'rgba(255, 254, 248, 0.58)',
    halfB: 'rgba(246, 250, 255, 0.32)',
    halfBDark: 'rgba(196, 222, 245, 0.54)',
    collarHex: '#f0c456',
    stroke: '#264f78',
    shimmer: true,
    translucent: true,
    coreEffect: 'firefly',
  },
  {
    id: 'ocean-pearl',
    label: 'Ngọc Trai Biển',
    subtitle: 'Pha lê xanh ngọc & bọt biển nổi',
    halfALight: '#6edbd4',
    halfA: '#2fa6a0',
    halfADark: '#176965',
    halfBLight: 'rgba(232, 255, 253, 0.56)',
    halfB: 'rgba(198, 245, 242, 0.34)',
    halfBDark: 'rgba(130, 212, 208, 0.52)',
    collarHex: '#d8eff5',
    stroke: '#165e5a',
    shimmer: true,
    translucent: true,
    coreEffect: 'ocean',
  },
  {
    id: 'sakura-globe',
    label: 'Cầu Tuyết Anh Đào',
    subtitle: 'Thạch anh hồng & cánh hoa bay',
    halfALight: '#f9adc0',
    halfA: '#e3718d',
    halfADark: '#a33c56',
    halfBLight: 'rgba(255, 245, 248, 0.62)',
    halfB: 'rgba(255, 228, 236, 0.36)',
    halfBDark: 'rgba(238, 186, 201, 0.55)',
    collarHex: '#f7ccd8',
    stroke: '#8c3249',
    shimmer: true,
    translucent: true,
    coreEffect: 'sakura',
  },
  {
    id: 'amber-honey',
    label: 'Hổ Phách Mật Ong',
    subtitle: 'Thủy tinh trà ấm xuyên thấu',
    halfALight: '#f2a452',
    halfA: '#d97b29',
    halfADark: '#8f4308',
    halfBLight: 'rgba(255, 244, 214, 0.58)',
    halfB: 'rgba(255, 228, 168, 0.38)',
    halfBDark: 'rgba(219, 168, 84, 0.56)',
    collarHex: '#f5cf71',
    stroke: '#733808',
    translucent: true,
    coreEffect: 'firefly',
  },
  {
    id: 'starlight-gold',
    label: 'Hoàng Kim Ánh Sao',
    subtitle: 'Vàng 24K & nhung tím huyền bí',
    halfALight: '#ffe38c',
    halfA: '#e3ac36',
    halfADark: '#9e6b0a',
    halfBLight: '#564570',
    halfB: '#362a47',
    halfBDark: '#1c1529',
    collarHex: '#ffe89e',
    stroke: '#5e4006',
    shimmer: true,
    coreEffect: 'gold-foil',
  },
  {
    id: 'lavender-mist',
    label: 'Ngân Hà Tinh Vân',
    subtitle: 'Tím vũ trụ & sao bạc lấp lánh',
    halfALight: '#ad94ed',
    halfA: '#7d60c7',
    halfADark: '#482f8a',
    halfBLight: '#faf7ff',
    halfB: '#eee6fa',
    halfBDark: '#cbbbe6',
    collarHex: '#ebca75',
    stroke: '#3c2673',
    shimmer: true,
    coreEffect: 'nebula',
  },
  {
    id: 'peach-milk',
    label: 'Đào Kem Nhung',
    subtitle: 'Sứ hồng đào & kem sữa ấm',
    halfALight: '#ffa899',
    halfA: '#f27d6b',
    halfADark: '#bd4b3a',
    halfBLight: '#ffffff',
    halfB: '#fff5ea',
    halfBDark: '#e8ceb3',
    collarHex: '#ebc07c',
    stroke: '#87392c',
  },
  {
    id: 'matcha-butter',
    label: 'Matcha Bơ Sữa',
    subtitle: 'Trà xanh Uji & bơ kem béo',
    halfALight: '#84cc97',
    halfA: '#55a169',
    halfADark: '#2f6b3f',
    halfBLight: '#fffbe6',
    halfB: '#fcf0c2',
    halfBDark: '#dec987',
    collarHex: '#deb054',
    stroke: '#265432',
  },
  {
    id: 'berry-cream',
    label: 'Dâu Tây Tráng Gương',
    subtitle: 'Đỏ mọng phủ men bóng 3D',
    halfALight: '#f587a2',
    halfA: '#d95576',
    halfADark: '#992946',
    halfBLight: '#fffafa',
    halfB: '#fdebf0',
    halfBDark: '#e6bec9',
    collarHex: '#f5c4d0',
    stroke: '#731f35',
  },
  {
    id: 'sky-cloud',
    label: 'Sứ Xanh Mây Trắng',
    subtitle: 'Men gốm xanh trời thanh khiết',
    halfALight: '#88c5f7',
    halfA: '#549cd9',
    halfADark: '#2a6599',
    halfBLight: '#ffffff',
    halfB: '#f2f9ff',
    halfBDark: '#c9dff2',
    collarHex: '#c5def2',
    stroke: '#21507a',
  },
];

export interface CapsuleFinishMeta {
  id: CapsuleFinishId;
  label: string;
  shortLabel: string;
}

export const CAPSULE_FINISHES: CapsuleFinishMeta[] = [
  { id: 'gold-collar', label: 'Đai nhẫn kim loại 3D', shortLabel: '💍 Đai kim loại' },
  { id: 'glossy', label: 'Tráng gương bóng 3D', shortLabel: '✨ Tráng gương' },
  { id: 'star-dust', label: 'Phủ bụi sao lấp lánh', shortLabel: '🌟 Bụi sao' },
  { id: 'candy-stripe', label: 'Xoắn sọc kẹo ngọt', shortLabel: '🍬 Sọc kẹo' },
  { id: 'heart-stamp', label: 'Dập nổi trái tim', shortLabel: '💗 Tim nổi 3D' },
];

export interface CapsuleCharmMeta {
  id: CapsuleCharmId;
  emoji: string;
  label: string;
}

export const CAPSULE_CHARMS: CapsuleCharmMeta[] = [
  { id: 'clover', emoji: '🍀', label: 'Cỏ 4 lá may mắn' },
  { id: 'origami-star', emoji: '⭐', label: 'Sao giấy ước nguyện' },
  { id: 'cat-paw', emoji: '🐾', label: 'Đệm chân mèo êm' },
  { id: 'sakura', emoji: '🌸', label: 'Cánh hoa ép khô' },
  { id: 'candy', emoji: '🍬', label: 'Viên kẹo ngọt ngào' },
  { id: 'crescent', emoji: '🌙', label: 'Trăng khuyết dịu êm' },
];

export interface CapsuleScrollSkinMeta {
  id: CapsuleScrollSkinId;
  label: string;
  swatchHex: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
}

export const CAPSULE_SCROLL_SKINS: CapsuleScrollSkinMeta[] = [
  {
    id: 'parchment',
    label: 'Giấy cổ điển',
    swatchHex: '#fbf5e8',
    bgClass: 'paper-cream-torn',
    textClass: 'text-[#382619]',
    borderClass: 'border-[#d6c09d]',
  },
  {
    id: 'lined-note',
    label: 'Giấy kẻ xanh',
    swatchHex: '#eef5fb',
    bgClass: 'paper-blue-lined',
    textClass: 'text-[#243647]',
    borderClass: 'border-[#b6cfe6]',
  },
  {
    id: 'sakura-pink',
    label: 'Giấy hoa đào',
    swatchHex: '#fff0f3',
    bgClass: 'bg-[#fff2f4]',
    textClass: 'text-[#4d2630]',
    borderClass: 'border-[#ebbec6]',
  },
  {
    id: 'midnight-star',
    label: 'Giấy đêm sao',
    swatchHex: '#282238',
    bgClass: 'bg-[#252033]',
    textClass: 'text-[#f7ecd8]',
    borderClass: 'border-[#6d5c8c]',
  },
];

export interface JarVesselMeta {
  id: JarVesselStyle;
  emoji: string;
  label: string;
  subtitle: string;
}

export const JAR_VESSELS: JarVesselMeta[] = [
  {
    id: 'apothecary',
    emoji: '🫙',
    label: 'Lọ Thuốc Cổ Điển',
    subtitle: 'Nút bần gỗ sồi & nhãn tiệm thuốc xưa',
  },
  {
    id: 'star-bottle',
    emoji: '✨',
    label: 'Bình Sao Pha Lê',
    subtitle: 'Bầu tròn lấp lánh đom đóm ước nguyện',
  },
  {
    id: 'cat-jar',
    emoji: '🐱',
    label: 'Hũ Mèo Mochi',
    subtitle: 'Nắp gỗ tai mèo tròn bầu đáng yêu',
  },
];

export interface CapsulePrescriptionMeta {
  id: CapsulePrescriptionId;
  emoji: string;
  label: string;
  shortTag: string;
  rxCode: string;
  hint: string;
}

export const CAPSULE_PRESCRIPTIONS: CapsulePrescriptionMeta[] = [
  {
    id: 'gratitude',
    emoji: '🌟',
    label: 'Niềm vui & Biết ơn',
    shortTag: 'Niềm vui',
    rxCode: 'RX-01',
    hint: 'Bóc lại bất cứ lúc nào muốn mỉm cười',
  },
  {
    id: 'sad',
    emoji: '🩹',
    label: 'Mở khi đang buồn',
    shortTag: 'Khi buồn',
    rxCode: 'RX-02',
    hint: 'Liều thuốc vỗ về dành cho lúc yếu lòng',
  },
  {
    id: 'tired',
    emoji: '☕',
    label: 'Mở khi mệt mỏi',
    shortTag: 'Khi mệt',
    rxCode: 'RX-03',
    hint: 'Tiếp lại năng lượng sau ngày dài áp lực',
  },
  {
    id: 'miss',
    emoji: '💌',
    label: 'Mở khi nhớ nhau',
    shortTag: 'Khi nhớ',
    rxCode: 'RX-04',
    hint: 'Lời nhắn cất sẵn cho khoảnh khắc thương nhớ',
  },
  {
    id: 'time_locked',
    emoji: '⏳',
    label: 'Hẹn ngày mở khóa',
    shortTag: 'Hẹn ngày',
    rxCode: 'RX-05',
    hint: 'Niêm phong kín cho tới đúng ngày đã chọn',
  },
];

export function encodeCapsuleStyle(
  colorId: CapsuleColorId,
  prescriptionId: CapsulePrescriptionId,
  openedCount = 0,
  charmId: CapsuleCharmId = 'clover',
  scrollSkinId: CapsuleScrollSkinId = 'parchment',
  finishId: CapsuleFinishId = 'gold-collar'
): PaperStyle {
  return `capsule:${colorId}:${prescriptionId}:${openedCount}:${charmId}:${scrollSkinId}:${finishId}`;
}

export function parseCapsuleStyle(paperStyle?: string): {
  isCapsule: boolean;
  colorId: CapsuleColorId;
  prescriptionId: CapsulePrescriptionId;
  openedCount: number;
  charmId: CapsuleCharmId;
  scrollSkinId: CapsuleScrollSkinId;
  finishId: CapsuleFinishId;
  palette: CapsulePalette;
  prescription: CapsulePrescriptionMeta;
  charm: CapsuleCharmMeta;
  scrollSkin: CapsuleScrollSkinMeta;
  finish: CapsuleFinishMeta;
} {
  const defaultPalette = CAPSULE_PALETTES[6]; // peach-milk
  const defaultPrescription = CAPSULE_PRESCRIPTIONS[0];
  const defaultCharm = CAPSULE_CHARMS[0];
  const defaultScroll = CAPSULE_SCROLL_SKINS[0];
  const defaultFinish = CAPSULE_FINISHES[1]; // glossy

  if (!paperStyle || !paperStyle.startsWith('capsule:')) {
    return {
      isCapsule: false,
      colorId: defaultPalette.id,
      prescriptionId: defaultPrescription.id,
      openedCount: 0,
      charmId: defaultCharm.id,
      scrollSkinId: defaultScroll.id,
      finishId: defaultFinish.id,
      palette: defaultPalette,
      prescription: defaultPrescription,
      charm: defaultCharm,
      scrollSkin: defaultScroll,
      finish: defaultFinish,
    };
  }

  const [, rawColor, rawPresc, rawOpened, rawCharm, rawScroll, rawFinish] =
    paperStyle.split(':');
  const palette =
    CAPSULE_PALETTES.find((c) => c.id === rawColor) ?? defaultPalette;
  const prescription =
    CAPSULE_PRESCRIPTIONS.find((p) => p.id === rawPresc) ?? defaultPrescription;
  const charm =
    CAPSULE_CHARMS.find((ch) => ch.id === rawCharm) ?? defaultCharm;
  const scrollSkin =
    CAPSULE_SCROLL_SKINS.find((sc) => sc.id === rawScroll) ?? defaultScroll;
  const finish =
    CAPSULE_FINISHES.find((fn) => fn.id === rawFinish) ??
    (palette.shimmer ? CAPSULE_FINISHES[2] : defaultFinish);
  const openedCount = Math.max(0, Number.parseInt(rawOpened || '0', 10) || 0);

  return {
    isCapsule: true,
    colorId: palette.id,
    prescriptionId: prescription.id,
    openedCount,
    charmId: charm.id,
    scrollSkinId: scrollSkin.id,
    finishId: finish.id,
    palette,
    prescription,
    charm,
    scrollSkin,
    finish,
  };
}

export function isPureCapsuleNote(note: NoteItem): boolean {
  return Boolean(note.paperStyle && note.paperStyle.startsWith('capsule:'));
}

export function isCapsuleNote(note: NoteItem): boolean {
  return (
    note.kind === 'time_capsule' ||
    Boolean(note.paperStyle && note.paperStyle.startsWith('capsule:'))
  );
}

export function extractCapsulesFromNotes(notes: NoteItem[]): NoteItem[] {
  return notes.filter(isCapsuleNote);
}
