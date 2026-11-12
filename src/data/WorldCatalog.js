import assets from './world-kit/world_assets.json' with { type: 'json' };
import recipes from './world-kit/world_recipes.json' with { type: 'json' };
import resources from './world-kit/resources.json' with { type: 'json' };
import biomes from './world-kit/biomes.json' with { type: 'json' };
import { validateWorldCatalog } from './WorldCatalogRules.js';

const errors = validateWorldCatalog(assets, recipes, resources, biomes);
if (errors.length) throw new Error(`Invalid World Kit: ${errors.slice(0, 5).join('; ')}`);

export const worldCatalog = {
  assets,
  recipes,
  resources,
  biomes,
  assetById: new Map(assets.map((asset) => [asset.id, asset])),
  recipeById: new Map(recipes.map((recipe) => [recipe.id, recipe])),
};
