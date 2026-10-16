const restaurants = window.BiteBuddyMatchingRestaurants || [];
// 1. Score how well a restaurant matches one person's cuisine.
function scoreCuisine(restaurant, preferences) {
    const cuisines = preferences.cuisines || [];

    if (cuisines.includes("Any")) {
        return 100;
    }

    return cuisines.includes(restaurant.cuisine) ? 100 : 0;
}

// 2. Score affordability for one person.
// At or Below Budget= 100.
// One price level over = 60.
// Two levels over = 20.
function scoreBudget(restaurant, preferences) {
    const budget = Number(preferences.budget);

    if (!Number.isFinite(budget) || budget < 1) {
        return 0;
    }

    const difference = restaurant.price - budget;

    if (difference <= 0) {
        return 100;
    }

    if (difference === 1) {
        return 60;
    }

    return 20;
}

// 3. Score distance for one person.
// Closer restaurants receive higher scores.
// Restaurants at or beyond the distance limit score 0.
function scoreDistance(restaurant, preferences) {
    const maxDistance = Number(preferences.distance);

    if (!Number.isFinite(maxDistance) || maxDistance <= 0) {
        return 0;
    }

    if (restaurant.distanceMiles > maxDistance) {
        return 0;
    }

    // A restaurant at the limit receives 20 points.
    // Closer restaurants receive higher scores.
    return Math.round(
        20 + (1 - restaurant.distanceMiles / maxDistance) * 80
    );
}

// 4. Calculate one person's weighted score.
function scoreRestaurantForPerson(restaurant, preferences) {
    const cuisine = scoreCuisine(restaurant, preferences);
    const budget = scoreBudget(restaurant, preferences);
    const distance = scoreDistance(restaurant, preferences);

    const total = (
        cuisine * 0.50 +
        budget * 0.35 +
        distance * 0.15
    );

    return {
        cuisine,
        budget,
        distance,
        total: Math.round(total * 10) / 10
    };
}

// 5. Remove restaurants that fail any person's
// dietary requirements, budget, or distance limit.
function isRestaurantEligible(restaurant, allPreferences) {
    // Dietary restrictions are the only hard filters.
    for (const preferences of allPreferences) {
        const restrictions = preferences.dietaryRestrictions || [];

        for (const restriction of restrictions) {
            if (!restaurant.dietaryOptions.includes(restriction)) {
                return false;
            }
        }
    }

    return true;
}

// 6. Score restaurants for the entire group and
// rank them using the fairness formula.
function findRestaurantMatches(allPreferences) {
    if (
        !Array.isArray(allPreferences) ||
        allPreferences.length === 0
    ) {
        return [];
    }

    const eligibleRestaurants = restaurants.filter(restaurant =>
        isRestaurantEligible(restaurant, allPreferences)
    );

    const rankedRestaurants = eligibleRestaurants.map(restaurant => {
        const individualScores = allPreferences.map(preferences =>
            scoreRestaurantForPerson(restaurant, preferences)
        );

        const averageScore =
            individualScores.reduce(
                (sum, score) => sum + score.total, 0
            ) / individualScores.length;

        const lowestScore = Math.min(
            ...individualScores.map(score => score.total)
        );

        // Your slide's fairness formula:
        // 60% group average + 40% lowest individual score.
        const groupScore =
            0.60 * averageScore + 0.40 * lowestScore;

        return {
            id: restaurant.id,
            name: restaurant.name,
            cuisine: restaurant.cuisine,
            price: restaurant.price,
            distanceMiles: restaurant.distanceMiles,
            dietaryOptions: restaurant.dietaryOptions,
            individualScores,
            averageScore: Math.round(averageScore * 10) / 10,
            lowestScore: Math.round(lowestScore * 10) / 10,
            groupScore: Math.round(groupScore * 10) / 10
        };
    });

    rankedRestaurants.sort((a, b) =>
        b.groupScore - a.groupScore
    );

    // Return the top three recommendations.
    return rankedRestaurants.slice(0, 3);
}

window.BiteBuddyMatching = {
    restaurants,
    scoreCuisine,
    scoreBudget,
    scoreDistance,
    scoreRestaurantForPerson,
    isRestaurantEligible,
    findRestaurantMatches
};