export function resolveMatchOutcome(playerHealth, enemyHealth) {
  if (playerHealth === enemyHealth) return 'draw';
  return playerHealth > enemyHealth ? 'victory' : 'defeat';
}
