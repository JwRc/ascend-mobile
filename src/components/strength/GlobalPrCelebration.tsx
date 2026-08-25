import React from 'react';
import { PrCelebration } from './PrCelebration';
import { useStrengthStore } from '@/store/strength.store';

// Montado uma vez no root layout: a tela de treino dedicada seta pendingCelebration e
// navega de volta pra lista de treinos antes que o modal apareça — como ela já saiu da
// árvore nesse ponto, o modal precisa viver num lugar que sobrevive à navegação.
export function GlobalPrCelebration() {
  const { pendingCelebration, setPendingCelebration } = useStrengthStore();

  return (
    <PrCelebration
      visible={!!pendingCelebration}
      prs={pendingCelebration?.prs ?? []}
      unit={pendingCelebration?.unit ?? 'kg'}
      onClose={() => setPendingCelebration(null)}
    />
  );
}
