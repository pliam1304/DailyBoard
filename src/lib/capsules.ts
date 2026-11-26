import type { NoteItem, PaperStyle } from '@/types/catyboard';

export type CapsuleColorId =
  | 'peach-milk'
  | 'sky-cloud'
  | 'matcha-butter'
  | 'berry-cream'
  | 'lavender-mist'
  | 'starlight-gold'
  | 'clear-firefly'
  | 'amber-honey';

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
  halfA: string;
  halfB: string;
  stroke: string;
  shimmer?: boolean;
  translucent?: boolean;
}

export const CAPSULE_PALETTES: CapsulePalette[] = [
  {
    id: 'clear-firefly',
    label: 'Pha Lê Đom Đóm',
    halfA: '#5b9bd5',
    halfB: 'rgba(255, 252, 240, 0.34)',
    stroke: '#3a6b9c',
    shimmer: true,
    translucent: true,
  },
  {
    id: 'amber-honey',
    label: 'Mật Ong Trong',
    halfA: '#d98236',
    halfB: 'rgba(255, 236, 190, 0.38)',
    stroke: '#8c4d19',
    translucent: true,
  },
  {
    id: 'peach-milk',
    label: 'Đào Sữa',
    halfA: '#f28b79',
    halfB: '#fff6eb',
    stroke: '#a85546',
  },
  {
    id: 'sky-cloud',
    label: 'Trời Mây',
    halfA: '#62a8e0',
    halfB: '#f5faff',
    stroke: '#366894',
  },
  {
    id: 'matcha-butter',
    label: 'Matcha Bơ',
    halfA: '#66ad78',
    halfB: '#fdf0c4',
    stroke: '#3c6e49',
  },
  {
    id: 'berry-cream',
    label: 'Dâu Kem',
    halfA: '#d96884',
    halfB: '#fdf0f3',
    stroke: '#8c3b50',
  },
  {
    id: 'lavender-mist',
    label: 'Oải Hương',
    halfA: '#967fd4',
    halfB: '#f5f1fc',
    stroke: '#5b488c',
  },
  {
    id: 'starlight-gold',
    label: 'Ánh Sao Đêm',
    halfA: '#e0a938',
    halfB: '#3b304d',
    stroke: '#7d5a14',
    shimmer: true,
  },
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
  bgClass: string;
  textClass: string;
  borderClass: string;
}

export const CAPSULE_SCROLL_SKINS: CapsuleScrollSkinMeta[] = [
  {
    id: 'parchment',
    label: 'Giấy cổ điển',
    bgClass: 'paper-cream-torn',
    textClass: 'text-[#382619]',
    borderClass: 'border-[#d6c09d]',
  },
  {
    id: 'lined-note',
    label: 'Giấy kẻ xanh',
    bgClass: 'paper-blue-lined',
    textClass: 'text-[#243647]',
    borderClass: 'border-[#b6cfe6]',
  },
  {
    id: 'sakura-pink',
    label: 'Giấy hoa đào',
    bgClass: 'bg-[#fff2f4]',
    textClass: 'text-[#4d2630]',
    borderClass: 'border-[#ebbec6]',
  },
  {
    id: 'midnight-star',
    label: 'Giấy đêm sao',
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
  scrollSkinId: CapsuleScrollSkinId = 'parchment'
): PaperStyle {
  return `capsule:${colorId}:${prescriptionId}:${openedCount}:${charmId}:${scrollSkinId}`;
}

export function parseCapsuleStyle(paperStyle?: string): {
  isCapsule: boolean;
  colorId: CapsuleColorId;
  prescriptionId: CapsulePrescriptionId;
  openedCount: number;
  charmId: CapsuleCharmId;
  scrollSkinId: CapsuleScrollSkinId;
  palette: CapsulePalette;
  prescription: CapsulePrescriptionMeta;
  charm: CapsuleCharmMeta;
  scrollSkin: CapsuleScrollSkinMeta;
} {
  const defaultPalette = CAPSULE_PALETTES[2]; // peach-milk
  const defaultPrescription = CAPSULE_PRESCRIPTIONS[0];
  const defaultCharm = CAPSULE_CHARMS[0];
  const defaultScroll = CAPSULE_SCROLL_SKINS[0];

  if (!paperStyle || !paperStyle.startsWith('capsule:')) {
    return {
      isCapsule: false,
      colorId: defaultPalette.id,
      prescriptionId: defaultPrescription.id,
      openedCount: 0,
      charmId: defaultCharm.id,
      scrollSkinId: defaultScroll.id,
      palette: defaultPalette,
      prescription: defaultPrescription,
      charm: defaultCharm,
      scrollSkin: defaultScroll,
    };
  }

  const [, rawColor, rawPresc, rawOpened, rawCharm, rawScroll] =
    paperStyle.split(':');
  const palette =
    CAPSULE_PALETTES.find((c) => c.id === rawColor) ?? defaultPalette;
  const prescription =
    CAPSULE_PRESCRIPTIONS.find((p) => p.id === rawPresc) ?? defaultPrescription;
  const charm =
    CAPSULE_CHARMS.find((ch) => ch.id === rawCharm) ?? defaultCharm;
  const scrollSkin =
    CAPSULE_SCROLL_SKINS.find((sc) => sc.id === rawScroll) ?? defaultScroll;
  const openedCount = Math.max(0, Number.parseInt(rawOpened || '0', 10) || 0);

  return {
    isCapsule: true,
    colorId: palette.id,
    prescriptionId: prescription.id,
    openedCount,
    charmId: charm.id,
    scrollSkinId: scrollSkin.id,
    palette,
    prescription,
    charm,
    scrollSkin,
  };
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
