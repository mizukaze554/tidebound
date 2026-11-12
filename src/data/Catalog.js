import skills from './catalog/skills.json' with { type: 'json' };
import items from './catalog/items.json' with { type: 'json' };
import { validateCatalog } from './CatalogRules.js';

const errors = validateCatalog(skills, items);
if (errors.length) throw new Error(`Invalid Discovery Pack: ${errors.slice(0, 5).join('; ')}`);

export { skills, items };
