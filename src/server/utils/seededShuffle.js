// Deterministic seeded PRNG so every user in a session sees the same order
function seededRandom(seed) {
    let s = 0;
    for (let i = 0; i < seed.length; i++) {
        s = ((s << 5) - s + seed.charCodeAt(i)) | 0;
    }
    return function () {
        s = (s * 1664525 + 1013904223) | 0;
        return ((s >>> 0) / 4294967296);
    };
}

function seededShuffle(arr, seed) {
    const rng = seededRandom(seed);
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

module.exports = { seededRandom, seededShuffle };
