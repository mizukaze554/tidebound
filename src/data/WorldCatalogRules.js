export function validateWorldCatalog(assets, recipes, resources, biomes) {
  const errors = [];
  if (!Array.isArray(assets) || assets.length !== 1000) errors.push('Expected 1,000 world assets.');
  if (!Array.isArray(recipes) || recipes.length !== 350) errors.push('Expected 350 recipes.');
  if (!Array.isArray(resources) || !Array.isArray(biomes)) errors.push('Missing resources or biomes.');
  if (errors.length) return errors;
  const unique = (rows, label) => {
    const ids = new Set(rows.map((row) => row.id));
    if (ids.size !== rows.length || ids.has(undefined)) errors.push(`Duplicate or missing ${label} ID.`);
    return ids;
  };
  const assetIds = unique(assets, 'asset'), recipeIds = unique(recipes, 'recipe'), resourceIds = unique(resources, 'resource'), biomeIds = unique(biomes, 'biome');
  const modes = new Set(['procedural_spawn', 'crafted_structure', 'terrain_feature', 'environment_effect']);
  const presets = new Set(['grass_clump', 'flower_stems', 'tree', 'shrub', 'mushrooms', 'rocks', 'rock_cluster', 'ore_cluster', 'sand_rocks', 'rock_mass', 'mountain_mass', 'water_plane', 'cave_entrance', 'particles', 'path_segments', 'modular_structure', 'house', 'fortification', 'ruin', 'infrastructure', 'prop']);
  for (const asset of assets) {
    if (!modes.has(asset.generationMode) || !presets.has(asset.geometryPreset) || !asset.procedural || !Array.isArray(asset.procedural.colors) || !asset.procedural.colors.length || !asset.procedural.colors.every((color) => /^#[0-9a-f]{6}$/i.test(color)) || !Number.isFinite(asset.procedural.scale) || asset.procedural.scale <= 0 || asset.procedural.scale > 20 || !Number.isFinite(asset.procedural.density) || asset.procedural.density < 0 || asset.procedural.density > 1) errors.push(`${asset.id}: invalid generation`);
    if (asset.recipeId && !recipeIds.has(asset.recipeId)) errors.push(`${asset.id}: missing recipe`);
    for (const drop of asset.harvestDrops || []) if (!resourceIds.has(drop.resourceId) || !Number.isFinite(drop.quantity) || drop.quantity <= 0) errors.push(`${asset.id}: invalid harvest drop`);
    for (const biome of asset.placement?.biomes || []) if (!biomeIds.has(biome)) errors.push(`${asset.id}: invalid biome`);
  }
  for (const recipe of recipes) {
    if (!assetIds.has(recipe.outputAssetId) || assets.find((asset) => asset.id === recipe.outputAssetId)?.generationMode !== 'crafted_structure' || !Array.isArray(recipe.materials) || !recipe.materials.length || !Number.isFinite(recipe.placementRules?.terrainSlopeMaxDegrees) || recipe.placementRules.terrainSlopeMaxDegrees < 0 || recipe.placementRules.terrainSlopeMaxDegrees > 60) errors.push(`${recipe.id}: invalid output`);
    for (const material of recipe.materials || []) if (!resourceIds.has(material.resourceId) || !Number.isInteger(material.quantity) || material.quantity < 1) errors.push(`${recipe.id}: invalid material`);
  }
  return errors;
}
