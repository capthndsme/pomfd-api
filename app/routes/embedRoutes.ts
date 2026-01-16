import { HttpRouterService } from '@adonisjs/core/types'
const EmbedController = () => import('#controllers/embed_controller')
const OEmbedController = () => import('#controllers/oembed_controller')

/**
 * Embed routes for social media preview generation.
 * 
 * These routes serve HTML pages with Open Graph and Twitter Card meta tags
 * that enable rich embeds on Discord, Slack, Reddit, Facebook, Messenger, etc.
 */
function embedRoutes(router: HttpRouterService) {
    // oEmbed endpoint for Slack, Notion, and other oEmbed-compatible platforms
    // Example: GET /oembed?url=https://pomf.lol/s/abc123&format=json
    router.get('/oembed', [OEmbedController, 'getOEmbed'])

    router
        .group(() => {
            // Generate embed HTML for a file by its alias
            // Example: GET /embed/abc123 -> Returns HTML with OG/Twitter meta tags
            router.get('/:alias', [EmbedController, 'generateEmbed'])
        })
        .prefix('/embed')
}

export { embedRoutes }
