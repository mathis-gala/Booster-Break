export const formatCardFinish = (value: string | null | undefined): string => {
  switch (value) {
    case 'normal':
      return 'Normal'
    case 'holo':
      return 'Holo'
    case 'reverse_holo':
      return 'Reverse Holo'
    default:
      return value
        ? value
            .split('_')
            .map((part) => part[0]?.toUpperCase() + part.slice(1))
            .join(' ')
        : ''
  }
}
