export type LinkEmbedKind = 'VIDEO_EMBED' | 'SOCIAL_EMBED' | 'LINK';

/**
 * Classifies a pasted URL so the frontend knows whether to render
 * a video player embed, a social post embed, or a plain link card.
 */
export function classifyLink(rawUrl: string): LinkEmbedKind {
    let host = '';
    try {
        host = new URL(rawUrl).hostname.toLowerCase().replace(/^www\./, '');
    } catch {
        return 'LINK';
    }

    const videoHosts = ['youtube.com', 'youtu.be', 'vimeo.com'];
    const socialHosts = ['instagram.com', 'twitter.com', 'x.com', 'facebook.com', 'linkedin.com', 'tiktok.com'];

    if (videoHosts.some((h) => host === h || host.endsWith(`.${h}`))) return 'VIDEO_EMBED';
    if (socialHosts.some((h) => host === h || host.endsWith(`.${h}`))) return 'SOCIAL_EMBED';
    return 'LINK';
}
