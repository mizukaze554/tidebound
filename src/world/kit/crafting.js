/** Pure planning functions. In multiplayer recheck inventory, claims, and placement server-side. */
export function canCraft(recipe, inventory) {
  return recipe.materials.every(m => Number(inventory[m.resourceId]||0)>=m.quantity);
}
export function planCraft(recipe, inventory) {
  if (!canCraft(recipe,inventory)) return {ok:false, reason:'Insufficient materials'};
  const next={...inventory};
  for (const m of recipe.materials) next[m.resourceId]-=m.quantity;
  return {ok:true, inventory:next, outputAssetId:recipe.outputAssetId, outputCount:recipe.outputCount};
}
export function recipesForAsset(assetId, recipes) {return recipes.filter(r=>r.outputAssetId===assetId);}
