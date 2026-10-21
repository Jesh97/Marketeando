export const PALETAS = {
  andino: {
    primary:    '#1F2740',
    acento:     '#E8622A',
    darkBg:     '#1F2740',
    darkText:   '#FFFFFF',
    darkSub:    '#A9B4C8',
    tintBg:     '#EEF1F8',
    tintBorder: '#C7D0E8',
    tintText:   '#1F2740',
  },
  minimal: {
    primary:    '#4A2420',
    acento:     '#8B5E3C',
    darkBg:     '#4A2420',
    darkText:   '#FFFFFF',
    darkSub:    '#C8AFA8',
    tintBg:     '#FAF0E4',
    tintBorder: '#E8D5B0',
    tintText:   '#4A2420',
  },
  costero: {
    primary:    '#1A5C52',
    acento:     '#2A9D8F',
    darkBg:     '#1A5C52',
    darkText:   '#FFFFFF',
    darkSub:    '#A8D5CF',
    tintBg:     '#EAF6F4',
    tintBorder: '#B0D9D4',
    tintText:   '#1A5C52',
  },
}

export function getPaleta(plantilla) {
  return PALETAS[plantilla] ?? PALETAS.andino
}
