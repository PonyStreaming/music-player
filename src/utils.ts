export function sleep(milliseconds: number): Promise<void> {
    if (milliseconds == 0) {
        return Promise.resolve();
    }
    return new Promise((resolve) => {
        setTimeout(() => resolve(), milliseconds);
    })
}