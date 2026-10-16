/* Convert the existing BiteBuddy preference form into the input expected by matchingAlgorithm.js. */
(function () {
  'use strict';
  const choices = (data, category) => data?.[category]?.choices || [];
  function adapt(data) {
    const cuisines = choices(data, 'Cuisine');
    const budgets = choices(data, 'Budget');
    // Select the lowest upper bound for multiple selected budgets.
    // Price tier 1: Under $15, 2: $15–$25, 3: $25–$40, 4: $40+.
    const tiers = budgets.map(c => c.includes('Under') ? 1 : c.includes('15') && c.includes('25') ? 2 : c.includes('25') && c.includes('40') ? 3 : c.includes('40') ? 4 : null).filter(Boolean);
    const distances = choices(data, 'Distance').map(c => Number((c.match(/\d+/) || [])[0])).filter(n => Number.isFinite(n) && n > 0);
    const diet = choices(data, 'Dietary Needs');
    const supported = ['Vegetarian','Vegan','Gluten-Free','Halal'];
    const unknown = diet.filter(d => !supported.includes(d));
    if (unknown.length || data?.extraDietaryDetails) {
      throw new Error('Allergy and custom dietary requirements cannot be verified by the current restaurant catalog. Please verify directly with restaurants before recommending one.');
    }
    return {
      cuisines: cuisines.length ? cuisines : ['Any'],
      budget: tiers.length ? Math.min(...tiers) : 4,
      distance: distances.length ? Math.min(...distances) : 10,
      dietaryRestrictions: diet.filter(d => supported.includes(d))
    };
  }
  function toCatalog(list) { return list.map(r => ({
    id:r.id,name:r.name,cuisine:(r.cuisines || [])[0] || '',
    price:r.price.level,distanceMiles:r.distanceMiles,
    dietaryOptions:Object.entries({vegetarian:'Vegetarian',vegan:'Vegan',glutenFree:'Gluten-Free',halal:'Halal'})
      .filter(([k]) => r.dietary?.[k] === 'yes').map(([,value]) => value)
  })); }
  window.BiteBuddyMatchingAdapter = { adapt, toCatalog };
})();
