const FISH_NAMES = [
  // Squali (predatori)
  'Squalo Bianco',
  'Squalo Tigre',
  'Squalo Martello',
  'Squalo Mako',
  'Squalo Limone',
  'Squalo Toro',
  'Squalo Blu',
  // Tonni (veloci)
  'Tonno Rosso',
  'Tonno Pinna Gialla',
  'Tonno Alalunga',
  'Tonno Obeso',
  'Tonno Striato',
  // Sogliole e pesci piatti (difensori)
  'Sogliola',
  'Rombo Chiodato',
  'Passera di Mare',
  'Platessa',
  'Halibut',
  // Sardine e piccoli (gregari)
  'Sardina Atlantica',
  'Acciuga',
  'Aringa',
  'Spratto',
  'Alice',
  // Altri pesci
  'Pesce Spada',
  'Marlin Blu',
  'Cernia Bruna',
  'Orata',
  'Branzino',
  'Dentice',
  'Ricciola',
  'Barracuda',
  'Murena',
  'Manta',
  'Pesce Palla',
  'Pesce Scorpione'
];

/**
 * Genera un nome di pesce deterministico basato su playerId e data
 * Lo stesso giocatore avrà lo stesso nome nello stesso giorno
 */
export function generateFishName(playerId: number): string {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const seed = `${playerId}-${today}`;

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }

  const index = Math.abs(hash) % FISH_NAMES.length;
  return FISH_NAMES[index];
}

/**
 * Restituisce l'emoji appropriata per il tipo di pesce
 */
export function getFishEmoji(fishName: string): string {
  if (fishName.includes('Squalo')) return '🦈';
  if (fishName.includes('Tonno')) return '🐟';
  if (fishName.includes('Sogliola') || fishName.includes('Rombo') || fishName.includes('Platessa'))
    return '🐠';
  if (fishName.includes('Sardina') || fishName.includes('Acciuga') || fishName.includes('Aringa'))
    return '🐡';
  if (fishName.includes('Manta') || fishName.includes('Marlin') || fishName.includes('Pesce Spada'))
    return '🦈';
  return '🐠'; // Default
}
