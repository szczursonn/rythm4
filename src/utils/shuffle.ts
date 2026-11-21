export const shuffle = (items: unknown[]): void => {
    for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
    }
};

export const toShuffled = <T>(items: readonly T[]): T[] => {
    const result = [...items];
    shuffle(result);
    return result;
};
