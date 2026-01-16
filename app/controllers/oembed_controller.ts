import FileService from '#services/FileService'
import type { HttpContext } from '@adonisjs/core/http'
import { createFailure } from '../../shared/types/ApiBase.js'
import FileShareTokenService from '#services/FileShareTokenService'
import FileShareService from '#services/FileShareService'
import env from '#start/env'

/**
 * oEmbed Controller for providing structured embed data
 * 
 * This implements the oEmbed specification (https://oembed.com/) for rich embed support
 * on platforms like Slack, Discord, Notion, and other oEmbed-compatible applications.
 */
export default class OEmbedController {
    private readonly siteName = 'Pomf'

    /**
     * Generate oEmbed JSON response for a given URL
     */
    async getOEmbed({ request, response }: HttpContext) {
        const { url, format = 'json', maxwidth, maxheight } = request.qs()

        if (!url) {
            return response.badRequest(createFailure('URL parameter is required', 'einval'))
        }

        // Only support JSON format
        if (format !== 'json') {
            return response.notImplemented(createFailure('Only JSON format is supported'))
        }

        try {
            // Parse the URL to extract the file alias
            const alias = this.extractAliasFromUrl(url)
            if (!alias) {
                return response.badRequest(createFailure('Invalid URL format', 'einval'))
            }

            // Resolve the file (anonymous access only for oEmbed)
            // Supported:
            // - DB-backed share IDs (UUID)
            // - Legacy token-based private share ids (contain '.')
            // - Public file aliases (UUID/CUID/base36)
            const file = await (async () => {
                try {
                    const { file: sharedFile } = await FileShareService.getShare(alias)
                    await sharedFile.load('serverShard')
                    return sharedFile
                } catch {
                    if (alias.includes('.')) {
                        const payload = FileShareTokenService.verify(alias)
                        const f = await FileService.getFile(payload.fileId, null)
                        await f.load('serverShard')
                        return f
                    }
                    return await FileService.resolveFileAlias(alias, null)
                }
            })()

            if (!file) {
                return response.notFound(createFailure('File not found', 'not-found'))
            }

            // Build oEmbed response based on file type
            const oembedData = this.buildOEmbedResponse(file, url, {
                maxwidth: maxwidth ? parseInt(maxwidth, 10) : undefined,
                maxheight: maxheight ? parseInt(maxheight, 10) : undefined,
            })

            response.header('Content-Type', 'application/json')
            response.header('Cache-Control', 'public, max-age=3600')
            return response.send(oembedData)

        } catch (error: any) {
            console.error('oEmbed error:', error)
            return response.notFound(createFailure(error.message || 'File not found', 'not-found'))
        }
    }

    /**
     * Extract file alias from various URL formats
     */
    private extractAliasFromUrl(url: string): string | null {
        try {
            const parsed = new URL(url)
            const pathParts = parsed.pathname.split('/').filter(Boolean)

            // Handle /s/:alias or /embed/:alias formats
            if (pathParts.length >= 2 && (pathParts[0] === 's' || pathParts[0] === 'embed')) {
                return pathParts[1]
            }

            // Handle /:alias format (single path segment)
            if (pathParts.length === 1) {
                return pathParts[0]
            }

            return null
        } catch {
            return null
        }
    }

    /**
     * Build oEmbed response object
     */
    private buildOEmbedResponse(
        file: any,
        _url: string,
        options: { maxwidth?: number; maxheight?: number }
    ): object {
        const serverDomain = file.serverShard?.domain ? `https://${file.serverShard.domain}` : ''
        const fileUrl = serverDomain && file.fileKey ? `${serverDomain}/${file.fileKey}` : ''
        const thumbnailUrl = serverDomain && file.previewKey ? `${serverDomain}/${file.previewKey}` : ''

        const title = file.originalFileName || file.name || 'Shared File'

        // Calculate constrained dimensions
        let width = file.itemWidth || 640
        let height = file.itemHeight || 480

        if (options.maxwidth && width > options.maxwidth) {
            const ratio = options.maxwidth / width
            width = options.maxwidth
            height = Math.round(height * ratio)
        }

        if (options.maxheight && height > options.maxheight) {
            const ratio = options.maxheight / height
            height = options.maxheight
            width = Math.round(width * ratio)
        }

        // Base oEmbed response
        const base = {
            version: '1.0',
            provider_name: this.siteName,
            provider_url: env.get('COORDINATOR_UI'),
            cache_age: 3600,
        }

        switch (file.fileType) {
            case 'VIDEO':
                return {
                    ...base,
                    type: 'video',
                    title,
                    html: this.generateVideoHtml(fileUrl, width, height, thumbnailUrl),
                    width,
                    height,
                    thumbnail_url: thumbnailUrl || undefined,
                    thumbnail_width: file.itemWidth || undefined,
                    thumbnail_height: file.itemHeight || undefined,
                }

            case 'IMAGE':
                return {
                    ...base,
                    type: 'photo',
                    title,
                    url: fileUrl,
                    width,
                    height,
                }

            case 'AUDIO':
                return {
                    ...base,
                    type: 'rich',
                    title,
                    html: this.generateAudioHtml(fileUrl, title),
                    width: 400,
                    height: 80,
                    thumbnail_url: thumbnailUrl || undefined,
                }

            default:
                return {
                    ...base,
                    type: 'link',
                    title,
                    thumbnail_url: thumbnailUrl || undefined,
                }
        }
    }

    /**
     * Generate HTML embed code for video
     */
    private generateVideoHtml(
        videoUrl: string,
        width: number,
        height: number,
        posterUrl?: string
    ): string {
        const posterAttr = posterUrl ? ` poster="${this.escapeHtml(posterUrl)}"` : ''
        return `<video width="${width}" height="${height}"${posterAttr} controls playsinline><source src="${this.escapeHtml(videoUrl)}" type="video/mp4">Your browser does not support the video tag.</video>`
    }

    /**
     * Generate HTML embed code for audio
     */
    private generateAudioHtml(audioUrl: string, _title: string): string {
        return `<audio controls style="width:100%"><source src="${this.escapeHtml(audioUrl)}" type="audio/mpeg">Your browser does not support the audio tag.</audio>`
    }

    /**
     * Escape HTML special characters
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
