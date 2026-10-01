/**
 * Runs `fn` over `items` with at most `limit` in flight at once, preserving result order.
 * Used for bulk DB writes that can't be expressed as a single createMany/updateMany —
 * parallel enough to hide round-trip latency, bounded so we stay within the Prisma pool.
 */
export async function mapWithConcurrency<T, R>(
    items: readonly T[],
    limit: number,
    fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
    const results = new Array<R>(items.length);
    let next = 0;

    const worker = async () => {
        while (next < items.length) {
            const index = next++;
            results[index] = await fn(items[index]!, index);
        }
    };

    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
    return results;
}
