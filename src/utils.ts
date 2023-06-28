export const formatTime = (seconds?: number): string => {
    if (seconds === undefined) {
        return '';
    }

    const addZero = (n: number) =>
        n.toString().length === 1 ? `0${n}` : `${n}`;

    let minutes = Math.floor(seconds / 60);
    seconds = seconds % 60;

    let hours = Math.floor(minutes / 60);
    if (hours < 1) return `${addZero(minutes)}:${addZero(seconds)}`;
    minutes = minutes % 60;

    return `${addZero(hours)}:${addZero(minutes)}:${addZero(seconds)}`;
};
