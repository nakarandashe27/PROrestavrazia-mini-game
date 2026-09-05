import type { Avatar } from './draw';

export interface AvatarPreset {
  id: string;
  name: string;
  description: string;
  avatar: Avatar;
}

/** Appearance only: everyone has identical movement and restoration abilities. */
export const AVATAR_PRESETS: readonly AvatarPreset[] = [
  { id: 'sasha', name: 'Образ 01', description: 'Синяя куртка · каска',
    avatar: { jacket: '#4D61F4', pants: '#3F485B', skin: '#D6A17D', hair: '#463E38', hat: 'helmet', hatColor:'#F28D05' } },
  { id: 'lera', name: 'Образ 02', description: 'Коралловая куртка · кепка',
    avatar: { jacket: '#F74C2E', pants: '#262626', skin: '#E5B799', hair: '#926A41', hat: 'cap', hatColor:'#4D61F4' } },
  { id: 'timur', name: 'Образ 03', description: 'Лаймовая куртка · каска',
    avatar: { jacket: '#D0E97E', pants: '#3F485B', skin: '#956345', hair: '#292928', hat: 'helmet', hatColor:'#F28D05' } },
  { id: 'nika', name: 'Образ 04', description: 'Розовая куртка · кепка',
    avatar: { jacket: '#FFB6FC', pants: '#454459', skin: '#BD8662', hair: '#292928', hat: 'cap', hatColor:'#4D61F4' } },
];

export const DEFAULT_AVATAR_PRESET = AVATAR_PRESETS[0];
