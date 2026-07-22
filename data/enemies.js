export const enemies = [
  {
    id: "sample_enemy",
    name: "サンプルエネミー",
    imageId: "sample_enemy",
    image: "images/enemies/sample_enemy.png",
    hp: 8,
    attack: 3,
    defense: 1,
    escapeRate: 0.75
  }
];

export function getEnemyById(id) {
  return enemies.find(enemy => enemy.id === id) || null;
}
