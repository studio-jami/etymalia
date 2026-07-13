package studio.jami.entymalia.data.database

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "brand_profiles")
data class BrandProfile(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val industry: String,
    val description: String,
    val voice: String,
    val primaryColor: String, // Hex code (e.g., #2D3748)
    val secondaryColor: String, // Hex code
    val accentColor: String, // Hex code
    val fontStyle: String = "Modern Sans", // "Modern Sans", "Classic Serif", "Tech Mono", "Elegant Display"
    val keywords: String = "",
    val timestamp: Long = System.currentTimeMillis()
)

@Entity(tableName = "generated_assets")
data class GeneratedAsset(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val profileId: Long, // Links to BrandProfile.id
    val assetType: String, // "logo_svg", "favicon", "social_avatar_insta", "social_avatar_x", "social_avatar_linkedin", "marketing_image", "video_promo"
    val title: String,
    val prompt: String,
    val modelUsed: String,
    val content: String, // SVG XML string, Base64 PNG/JPEG data, or video URI/operation details
    val size: String = "1K", // "1K", "2K", "4K"
    val aspectRatio: String = "1:1",
    val timestamp: Long = System.currentTimeMillis()
)
