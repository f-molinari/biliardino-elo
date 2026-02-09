type Season = 'winter' | 'spring' | 'summer' | 'autumn';

interface RandomMessage {
  title: string;
  body: string;
}

export function getRandomMessage(playerName = ''): RandomMessage {
  const now = new Date();
  const month = now.getMonth();

  // Determina la stagione
  let season: Season;
  if (month >= 11 || month <= 1) season = 'winter';
  else if (month >= 2 && month <= 4) season = 'spring';
  else if (month >= 5 && month <= 7) season = 'summer';
  else season = 'autumn';

  const titles: string[] = [
    '🎯 Matchmaking in corso!',
    '🔍 Cerchiamo avversari...',
    '⚡ Inizia la selezione!',
    '🎲 Chi sarà il tuo avversario?',
    '🏓 Selezione giocatori attiva!',
    '🦈 Gli squali stanno arrivando!',
    '🎱 Preparazione partita...',
    '💪 È ora di sfidarsi!',
    '🔥 Matchmaking attivo!',
    '🎮 Trova il tuo match!',
    '⚔️ La sfida sta per iniziare!',
    '🏆 Selezione in corso!',
    '🐂 Cocciuti cercasi!',
    '🦈 Stagione degli squali!',
    '⚡ Chi accetta la sfida?'
  ];

  const bodies: {
    greetings: string[];
    seasonal: Record<Season, string[]>;
    action: string[];
  } = {
    greetings: [
      `Ciao${playerName ? ' ' + playerName : ''}! Voglia di una partita? 🎯`,
      `Bentornato/a${playerName ? ' ' + playerName : ''}! Si gioca? 🏓`,
      'Pronto/a per una sfida? 💪',
      'Chi sfidi oggi? Che la migliore stecca vinca! 🎱',
      `${playerName ? playerName + ', ' : ''}facciamo una partita! 🔥`,
      'Cocciuto/a abbastanza per giocare? 🐂',
      'Squalo mode: ON! Chi sarà la tua preda? 🦈',
      `${playerName ? playerName + ', t' : 'T'}empo di una partita? 🎮`,
      'Una partita veloce? Dai! ⚡',
      'Il biliardino ti chiama! 📢',
      'Chi ha il coraggio di sfidarti? 🥊',
      'Momento perfetto per giocare! ⏰',
      `Allora${playerName ? ', ' + playerName : ''}, si gioca? 🎲`,
      'La stecca aspetta solo te! 🎯',
      'Adrenalina pura ti aspetta! ⚡🔥',
      `${playerName ? playerName + ', m' : 'M'}ostra di che pasta sei fatto/a! 💎`,
      'È il tuo momento! Gioca ora! 🌟',
      'Mettiti in gioco! 🎪',
      `${playerName ? playerName + ', è' : 'È'} ora di fare sul serio! 💪🔥`
    ],
    seasonal: {
      winter: [
        'Fuori fa freddo, dentro si gioca! ☕🔥',
        'È la stagione degli squali... mostra i denti! 🦈🐟',
        'Squali vs sogliole: tu da che parte stai? Gioca ora! 🦈',
        'Gli squali non si fermano mai, neanche col freddo! 🦈❄️',
        'Riscaldati con una sfida! 🔥',
        'Inverno perfetto per una partita al caldo! ☕',
        'Squali affamati anche d inverno! 🦈🍽️',
        'Chi è lo squalo del tavolo? 🦈🏆',
        'Temperature polari, competizione bollente! ❄️🔥',
        'Sogliole state attente, gli squali sono in agguato! 🦈',
        'Dimostra di essere uno squalo! 🦈💪',
        'Non fare la sogliola, entra in partita! 🐟➡️🦈'
      ],
      spring: [
        'Primavera di sfide! Chi sfidi oggi? 🌸',
        'Tempo di rinascere in classifica! Gioca ora! ☀️',
        'Sbocciano le vittorie, semina la tua! 🌱🏆',
        'Aria di primavera, voglia di giocare! 🌼',
        'Nuova stagione, nuove sfide! 🌿',
        'Il sole brilla, tu gioca! ☀️🎱',
        'Risveglio primaverile anche per te? Gioca! 🌸💪',
        'Fiorisci con una vittoria! 🌺🏆',
        'Sboccia il campione che è in te! 🌸👑'
      ],
      summer: [
        'Rovente come una sfida al biliardino! Gioca! 🌞',
        'Estate da campioni/esse: fai vedere chi sei! 🏆',
        'Spiaggia? Meglio una partita! 🏖️🎱',
        'Il caldo non ferma i veri giocatori! 🌞🔥',
        'Estate, sole e biliardino! Perfetto! ☀️',
        'Troppo caldo? Sfogati con una partita! 💥',
        'Vacanze? No, tempo di giocare! 🏝️❌ 🎱✅',
        'L estate è la tua stagione! Gioca! 🌞🏆',
        'Rendi questa estate indimenticabile! 🌞💎'
      ],
      autumn: [
        'Fai cadere gli avversari come foglie! 🍂🎯',
        'Autunno perfetto per giocare! 🎃',
        'Raccogli vittorie, gioca ora! 🌰🏆',
        'Le foglie cadono, i punti salgono! 🍁⬆️',
        'Autunno caldo di sfide! 🍂🔥',
        'Vendemmia di vittorie! 🍇🏆',
        'Colori autunnali, emozioni forti! 🍁💥',
        'Tempo di raccogliere successi! 🌰✨',
        'Raccogli il coraggio e gioca! 🍂💪'
      ]
    },
    action: [
      'Mettiti in gioco! 💪',
      'È il momento di osare! 🎯',
      'Fai vedere chi sei! 🔥',
      'Non restare a guardare! ⚡',
      'Accetta la sfida! 🥊',
      'Dimostra il tuo valore! 💎',
      'È la tua occasione! 🌟',
      'Entra in partita! 🎱',
      'Gioca con determinazione! 🐂',
      'Mostra la tua tenacia! 🦈',
      'La prossima è a pagnotta! Chi sfidi? 🍞',
      'Gli squali non esitano mai! 🦈💪',
      'Cocciutaggine attiva, si parte! 🐂🔥',
      'Non mollare, gioca! 💪✨',
      'La vittoria ti attende! 🏆',
      'Sei pronto/a? Si gioca! 🎮'
    ]
  };

  const allBodies: string[] = [
    ...bodies.greetings,
    ...bodies.seasonal[season],
    ...bodies.action
  ];

  const title = titles[Math.floor(Math.random() * titles.length)];
  const body = allBodies[Math.floor(Math.random() * allBodies.length)];

  return {
    title,
    body
  };
}
