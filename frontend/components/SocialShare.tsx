'use client';

import { useState } from 'react';
import { useToast } from './ui/toast';

interface SocialShareProps {
    url: string;
    title: string;
    description?: string;
    imageUrl?: string;
}

export function SocialShare({ url, title, description, imageUrl }: SocialShareProps) {
    const [showShareMenu, setShowShareMenu] = useState(false);
    const { showToast } = useToast();

    const shareData = {
        url,
        title,
        description: description || title,
        imageUrl: imageUrl || '',
    };

    // Encode data for URLs
    const encodedUrl = encodeURIComponent(shareData.url);
    const encodedTitle = encodeURIComponent(shareData.title);
    const encodedDescription = encodeURIComponent(shareData.description);

    const shareLinks = {
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
        twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
        whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
        email: `mailto:?subject=${encodedTitle}&body=${encodedDescription}%0A%0A${encodedUrl}`,
        pinterest: imageUrl
            ? `https://pinterest.com/pin/create/button/?url=${encodedUrl}&media=${encodeURIComponent(imageUrl)}&description=${encodedDescription}`
            : null,
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareData.url);
            showToast('Link copied to clipboard!', 'success');
            setShowShareMenu(false);
        } catch (error) {
            showToast('Failed to copy link', 'error');
        }
    };

    const handleNativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: shareData.title,
                    text: shareData.description,
                    url: shareData.url,
                });
                setShowShareMenu(false);
            } catch (error) {
                // User cancelled or share failed
                if ((error as Error).name !== 'AbortError') {
                    showToast('Share failed', 'error');
                }
            }
        }
    };

    const handleSocialClick = (platform: string, url: string) => {
        // Track share event (can integrate with Google Analytics, Mixpanel, etc.)
        if (typeof window !== 'undefined' && (window as any).gtag) {
            (window as any).gtag('event', 'share', {
                method: platform,
                content_type: 'product',
                item_id: shareData.url,
            });
        }

        // Open share window
        window.open(url, '_blank', 'width=600,height=400,toolbar=0,status=0');
        setShowShareMenu(false);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setShowShareMenu(!showShareMenu)}
                className="flex items-center gap-2 px-4 py-2 border-2 border-primary text-primary rounded-lg hover:bg-primary hover:text-white transition-all duration-200 font-medium"
                aria-label="Share product"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <span className="hidden sm:inline">Share</span>
            </button>

            {showShareMenu && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowShareMenu(false)}
                    />

                    {/* Share Menu */}
                    <div className="absolute right-0 mt-2 w-72 bg-background border-2 border-border rounded-xl shadow-2xl z-50 p-4 animate-in slide-in-from-top-2 duration-200">
                        <h3 className="text-lg font-bold mb-3 text-foreground">Share this product</h3>

                        <div className="grid grid-cols-4 gap-3 mb-4">
                            {/* Facebook */}
                            <button
                                onClick={() => handleSocialClick('facebook', shareLinks.facebook)}
                                className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-muted transition-colors group"
                                aria-label="Share on Facebook"
                            >
                                <div className="w-10 h-10 rounded-full bg-[#1877F2] flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                    </svg>
                                </div>
                                <span className="text-xs text-foreground/70">Facebook</span>
                            </button>

                            {/* Twitter/X */}
                            <button
                                onClick={() => handleSocialClick('twitter', shareLinks.twitter)}
                                className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-muted transition-colors group"
                                aria-label="Share on X (Twitter)"
                            >
                                <div className="w-10 h-10 rounded-full bg-[#000000] flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                    </svg>
                                </div>
                                <span className="text-xs text-foreground/70">X</span>
                            </button>

                            {/* LinkedIn */}
                            <button
                                onClick={() => handleSocialClick('linkedin', shareLinks.linkedin)}
                                className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-muted transition-colors group"
                                aria-label="Share on LinkedIn"
                            >
                                <div className="w-10 h-10 rounded-full bg-[#0A66C2] flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                    </svg>
                                </div>
                                <span className="text-xs text-foreground/70">LinkedIn</span>
                            </button>

                            {/* WhatsApp */}
                            <button
                                onClick={() => handleSocialClick('whatsapp', shareLinks.whatsapp)}
                                className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-muted transition-colors group"
                                aria-label="Share on WhatsApp"
                            >
                                <div className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                    </svg>
                                </div>
                                <span className="text-xs text-foreground/70">WhatsApp</span>
                            </button>
                        </div>

                        {/* Additional Options */}
                        <div className="space-y-2 border-t border-border pt-3">
                            {/* Email */}
                            <button
                                onClick={() => window.location.href = shareLinks.email}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-left"
                            >
                                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                    📧
                                </div>
                                <span className="text-sm font-medium text-foreground">Share via Email</span>
                            </button>

                            {/* Copy Link */}
                            <button
                                onClick={handleCopyLink}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-left"
                            >
                                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                    🔗
                                </div>
                                <span className="text-sm font-medium text-foreground">Copy Link</span>
                            </button>

                            {/* Native Share (Mobile) */}
                            {typeof navigator !== 'undefined' && navigator.share && (
                                <button
                                    onClick={handleNativeShare}
                                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-left"
                                >
                                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                        📱
                                    </div>
                                    <span className="text-sm font-medium text-foreground">More Options</span>
                                </button>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
