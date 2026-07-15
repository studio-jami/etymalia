# Changelog

## [Global Style & Concept Reference Studio] - 2026-07-12

### Added
- **Persistent Local Database Storage**: Integrated reference image asset persistence directly into our offline-first Room database (reusing the `generated_assets` table). Added `saveReferenceAsset` in the ViewModel to save image binary states under the active brand profile with designated categories.
- **Unified Reusable ReferenceSelector Composable**: Crafted a premium Material 3 horizontal-scroll selector that lists previously saved references, provides direct thumbnail visualization, features quick deletion actions, and allows choosing an active reference for any generation task.
- **Interactive Multi-Modal Upload Dialog**: Created an on-the-fly reference upload flow with custom title naming and category classifications: `Style Reference`, `Character Reference`, `Layout Reference`, and `Product Photo Reference`.
- **Multimodal SVG Logo Generator Integration**: Updated `generateSvgLogo` signature in both `BrandRepository` and `BrandViewModel` to accept visual reference assets, injecting them as `inlineData` parts in the underlying Gemini model call to guide the generated vector shapes.
- **Multimodal AI Marketing Image Generator Integration**: Upgraded `generateMarketingImage` parameters and requests to pass chosen reference images as inline multi-modal inputs, allowing the generation models to capture character style or packaging layout instructions.
- **Unification of Cinematic Veo Video Studio**: Replaced the previous one-off image-to-video file picker in `VeoVideoView` with our brand-new unified, global reference selector, allowing users to animate any of their saved corporate assets seamlessly.
