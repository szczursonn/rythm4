export const formatDuration = (seconds?: number): string => {
    if (seconds === undefined) {
        return '';
    }
    seconds = Math.round(seconds);

    const addZero = (n: number) => (n.toString().length === 1 ? `0${n}` : `${n}`);

    let minutes = Math.floor(seconds / 60);
    seconds = seconds % 60;

    let hours = Math.floor(minutes / 60);
    if (hours < 1) return `${addZero(minutes)}:${addZero(seconds)}`;
    minutes = minutes % 60;

    return `${addZero(hours)}:${addZero(minutes)}:${addZero(seconds)}`;
};

export const safeParseURL = (str: string) => {
    try {
        return URL.parse(str);
    } catch (_) {
        return null;
    }
};

export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
