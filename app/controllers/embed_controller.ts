import FileService from '#services/FileService'
import type { HttpContext } from '@adonisjs/core/http'
import type FileItem from '#models/file_item'
import FileShareTokenService from '#services/FileShareTokenService'
import FileShareService from '#services/FileShareService'

/**
 * EmbedController generates HTML pages with Open Graph and Twitter Card meta tags
 * for social media embeds on Discord, Slack, Reddit, Messenger, Facebook, etc.
 * 
 * This enables rich previews when sharing file links on social platforms.
 */
export default class EmbedController {
    /**
     * Site branding - can be configured via env
     */
    private readonly siteName = 'Pomf'
    private readonly themeColor = '#5865F2' // Discord blurple

    /**
     * Generates an HTML page with proper meta tags for social media embeds
     */
    async generateEmbed({ request, response, auth }: HttpContext) {
        const { alias } = request.params()

        try {
            // Get user if authenticated (for private files)
            const user = auth.user
            let userId: string | null = null
            if (user) {
                await auth.check()
                if (auth.isAuthenticated) {
                    userId = user.id
                }
            }

            // Resolve the file.
            // Supported:
            // - DB-backed share IDs (UUID)
            // - Legacy token-based private share ids (contain '.')
            // - Public file aliases (UUID/CUID/base36)
            let file: FileItem
            try {
                const { file: sharedFile } = await FileShareService.getShare(alias)
                file = sharedFile
                await file.load('serverShard')
                await file.load('previews')
            } catch {
                if (alias.includes('.')) {
                    const payload = FileShareTokenService.verify(alias)
                    file = await FileService.getFileUnsafe(payload.fileId)
                    await file.load('serverShard')
                    await file.load('previews')
                } else {
                    file = await FileService.resolveFileAlias(alias, userId)
                }
            }

            if (!file) {
                return response.notFound(this.generateErrorPage('File not found'))
            }

            // Generate the embed HTML
            const html = this.generateEmbedHtml(file, alias)

            response.header('Content-Type', 'text/html; charset=utf-8')
            response.header('Cache-Control', 'public, max-age=3600') // Cache for 1 hour
            return response.send(html)

        } catch (error: any) {
            console.error('Embed generation error:', error)
            return response.notFound(this.generateErrorPage(error.message || 'File not found'))
        }
    }

    /**
     * Generates the full HTML document with meta tags
     */
    private generateEmbedHtml(file: FileItem, alias: string): string {
        const serverDomain = file.serverShard?.domain ? `https://${file.serverShard.domain}` : ''
        const fileUrl = serverDomain && file.fileKey ? `${serverDomain}/${file.fileKey}` : ''
        const thumbnailUrl = serverDomain && file.previewKey ? `${serverDomain}/${file.previewKey}` : ''

        // Frontend share page URL (where we redirect users)
        const sharePageUrl = `${this.getSiteUrl()}/s/${alias}`

        // Build meta tags based on file type
        const ogTags = this.buildOpenGraphTags(file, fileUrl, thumbnailUrl, sharePageUrl)
        const twitterTags = this.buildTwitterTags(file, fileUrl, thumbnailUrl)
        const discordTags = this.buildDiscordTags(file, fileUrl, thumbnailUrl)

        const title = this.escapeHtml(file.originalFileName || file.name || 'Shared File')
        const description = file.description
            ? this.escapeHtml(file.description)
            : `View this ${file.fileType?.toLowerCase() || 'file'} on ${this.siteName}`

        return `<!DOCTYPE html>
<html lang="en" prefix="og: https://ogp.me/ns#">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} • ${this.siteName}</title>
    <meta name="description" content="${description}">
    
    <!-- Theme Color for browser/app UI -->
    <meta name="theme-color" content="${this.themeColor}">
    
    <!-- Open Graph Tags (Facebook, Discord, Slack, LinkedIn, etc.) -->
    ${ogTags}
    
    <!-- Twitter Card Tags -->
    ${twitterTags}
    
    <!-- Discord-specific tags -->
    ${discordTags}
    
    <!-- oEmbed discovery for Slack, Discord, etc. -->
    <link rel="alternate" type="application/json+oembed" href="${this.getSiteUrl()}/oembed?url=${encodeURIComponent(sharePageUrl)}&format=json" title="${title}">
    
    <!-- Canonical URL -->
    <link rel="canonical" href="${sharePageUrl}">
    
    <!-- Redirect to the actual share page after a brief delay -->
    <meta http-equiv="refresh" content="0;url=${sharePageUrl}">
    
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: #f1f5f9;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            text-align: center;
            padding: 2rem;
            max-width: 400px;
        }
        .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(255,255,255,0.1);
            border-top-color: #5865F2;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 1.5rem;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        h1 { font-size: 1.25rem; margin-bottom: 0.5rem; font-weight: 500; }
        p { color: #94a3b8; font-size: 0.875rem; }
        a { color: #5865F2; text-decoration: none; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <div class="spinner"></div>
        <h1>Redirecting...</h1>
        <p>If you are not redirected, <a href="${sharePageUrl}">click here</a>.</p>
    </div>
</body>
</html>`
    }

    /**
     * Build Open Graph meta tags
     */
    private buildOpenGraphTags(file: FileItem, fileUrl: string, thumbnailUrl: string, sharePageUrl: string): string {
        const title = this.escapeHtml(file.originalFileName || file.name || 'Shared File')
        const description = file.description
            ? this.escapeHtml(file.description)
            : `View this ${file.fileType?.toLowerCase() || 'file'} on ${this.siteName}`

        const tags: string[] = [
            `<meta property="og:site_name" content="${this.siteName}">`,
            `<meta property="og:title" content="${title}">`,
            `<meta property="og:description" content="${description}">`,
            `<meta property="og:url" content="${sharePageUrl}">`,
        ]

        // File type specific tags
        switch (file.fileType) {
            case 'VIDEO':
                tags.push(`<meta property="og:type" content="video.other">`)
                if (fileUrl) {
                    tags.push(`<meta property="og:video" content="${fileUrl}">`)
                    tags.push(`<meta property="og:video:url" content="${fileUrl}">`)
                    tags.push(`<meta property="og:video:secure_url" content="${fileUrl}">`)
                    tags.push(`<meta property="og:video:type" content="${file.mimeType || 'video/mp4'}">`)
                    if (file.itemWidth && file.itemHeight) {
                        tags.push(`<meta property="og:video:width" content="${file.itemWidth}">`)
                        tags.push(`<meta property="og:video:height" content="${file.itemHeight}">`)
                    }
                }
                // Add thumbnail as og:image for video preview
                if (thumbnailUrl) {
                    tags.push(`<meta property="og:image" content="${thumbnailUrl}">`)
                    if (file.itemWidth && file.itemHeight) {
                        tags.push(`<meta property="og:image:width" content="${file.itemWidth}">`)
                        tags.push(`<meta property="og:image:height" content="${file.itemHeight}">`)
                    }
                }
                break

            case 'AUDIO':
                tags.push(`<meta property="og:type" content="music.song">`)
                if (fileUrl) {
                    tags.push(`<meta property="og:audio" content="${fileUrl}">`)
                    tags.push(`<meta property="og:audio:secure_url" content="${fileUrl}">`)
                    tags.push(`<meta property="og:audio:type" content="${file.mimeType || 'audio/mpeg'}">`)
                }
                // Use thumbnail if available for audio
                if (thumbnailUrl) {
                    tags.push(`<meta property="og:image" content="${thumbnailUrl}">`)
                }
                break

            case 'IMAGE':
                tags.push(`<meta property="og:type" content="website">`)
                if (fileUrl) {
                    tags.push(`<meta property="og:image" content="${fileUrl}">`)
                    tags.push(`<meta property="og:image:secure_url" content="${fileUrl}">`)
                    tags.push(`<meta property="og:image:type" content="${file.mimeType || 'image/jpeg'}">`)
                    if (file.itemWidth && file.itemHeight) {
                        tags.push(`<meta property="og:image:width" content="${file.itemWidth}">`)
                        tags.push(`<meta property="og:image:height" content="${file.itemHeight}">`)
                    }
                    tags.push(`<meta property="og:image:alt" content="${title}">`)
                }
                break

            default:
                tags.push(`<meta property="og:type" content="website">`)
                if (thumbnailUrl) {
                    tags.push(`<meta property="og:image" content="${thumbnailUrl}">`)
                }
                break
        }

        return tags.join('\n    ')
    }

    /**
     * Build Twitter Card meta tags
     */
    private buildTwitterTags(file: FileItem, fileUrl: string, thumbnailUrl: string): string {
        const title = this.escapeHtml(file.originalFileName || file.name || 'Shared File')
        const description = file.description
            ? this.escapeHtml(file.description)
            : `View this ${file.fileType?.toLowerCase() || 'file'} on ${this.siteName}`

        const tags: string[] = []

        switch (file.fileType) {
            case 'VIDEO':
                // Twitter player card for video - note: requires whitelisting on Twitter
                // Fall back to summary_large_image which works without whitelisting
                tags.push(`<meta name="twitter:card" content="summary_large_image">`)
                tags.push(`<meta name="twitter:title" content="${title}">`)
                tags.push(`<meta name="twitter:description" content="${description}">`)
                if (thumbnailUrl) {
                    tags.push(`<meta name="twitter:image" content="${thumbnailUrl}">`)
                    tags.push(`<meta name="twitter:image:alt" content="${title}">`)
                }
                break

            case 'IMAGE':
                tags.push(`<meta name="twitter:card" content="summary_large_image">`)
                tags.push(`<meta name="twitter:title" content="${title}">`)
                tags.push(`<meta name="twitter:description" content="${description}">`)
                if (fileUrl) {
                    tags.push(`<meta name="twitter:image" content="${fileUrl}">`)
                    tags.push(`<meta name="twitter:image:alt" content="${title}">`)
                }
                break

            case 'AUDIO':
                // Twitter player card for audio
                tags.push(`<meta name="twitter:card" content="summary">`)
                tags.push(`<meta name="twitter:title" content="${title}">`)
                tags.push(`<meta name="twitter:description" content="${description}">`)
                if (thumbnailUrl) {
                    tags.push(`<meta name="twitter:image" content="${thumbnailUrl}">`)
                }
                break

            default:
                tags.push(`<meta name="twitter:card" content="summary">`)
                tags.push(`<meta name="twitter:title" content="${title}">`)
                tags.push(`<meta name="twitter:description" content="${description}">`)
                if (thumbnailUrl) {
                    tags.push(`<meta name="twitter:image" content="${thumbnailUrl}">`)
                }
                break
        }

        return tags.join('\n    ')
    }

    /**
     * Build Discord-specific tags
     * Discord uses Open Graph primarily but has some special handling
     */
    private buildDiscordTags(_file: FileItem, _fileUrl: string, _thumbnailUrl: string): string {
        const tags: string[] = []

        // Discord reads og:video:url for inline video playback
        // We've already added these in buildOpenGraphTags for video type

        // For videos, Discord supports direct video embeds when og:video points to a video file
        // The og:type should be "video.other" for best compatibility

        return tags.join('\n    ')
    }

    /**
     * Generate an error page HTML
     */
    private generateErrorPage(message: string): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>File Not Found • ${this.siteName}</title>
    <meta name="theme-color" content="${this.themeColor}">
    <meta property="og:title" content="File Not Found">
    <meta property="og:description" content="${this.escapeHtml(message)}">
    <meta property="og:type" content="website">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: #f1f5f9;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            text-align: center;
            padding: 2rem;
        }
        .icon {
            width: 64px;
            height: 64px;
            background: rgba(239, 68, 68, 0.1);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1.5rem;
            border: 1px solid rgba(239, 68, 68, 0.2);
        }
        .icon svg { width: 32px; height: 32px; color: #ef4444; }
        h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
        p { color: #94a3b8; }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
        </div>
        <h1>File Not Found</h1>
        <p>${this.escapeHtml(message)}</p>
    </div>
</body>
</html>`
    }

    /**
     * Get the site URL for building absolute URLs
     */
    private getSiteUrl(): string {
        // Frontend share page URL
        // This is where users will be redirected after crawlers read the meta tags
        return 'https://share.capthnds.me'
    }

    /**
     * Escape HTML special characters to prevent XSS
     */
    private escapeHtml(str: string): string {
        const htmlEscapes: Record<string, string> = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
        }
        return str.replace(/[&<>"']/g, (char) => htmlEscapes[char] || char)
    }
}
