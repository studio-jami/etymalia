package studio.jami.entymalia.data.api

import com.squareup.moshi.Json
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.ResponseBody
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import retrofit2.http.*
import java.util.concurrent.TimeUnit
import studio.jami.entymalia.BuildConfig

// --- Gemini Content Generation Data Classes ---

data class GenerateContentRequest(
    @Json(name = "contents") val contents: List<Content>,
    @Json(name = "generationConfig") val generationConfig: GenerationConfig? = null,
    @Json(name = "systemInstruction") val systemInstruction: Content? = null
)

data class Content(
    @Json(name = "parts") val parts: List<Part>
)

data class Part(
    @Json(name = "text") val text: String? = null,
    @Json(name = "inlineData") val inlineData: InlineData? = null
)

data class InlineData(
    @Json(name = "mimeType") val mimeType: String,
    @Json(name = "data") val data: String // Base64 encoded string
)

data class GenerationConfig(
    @Json(name = "responseMimeType") val responseMimeType: String? = null,
    @Json(name = "temperature") val temperature: Float? = null,
    @Json(name = "imageConfig") val imageConfig: ImageConfig? = null,
    @Json(name = "responseModalities") val responseModalities: List<String>? = null
)

data class ImageConfig(
    @Json(name = "aspectRatio") val aspectRatio: String, // "1:1", "16:9", "9:16", "2:3", "3:2", "3:4", "4:3", "21:9"
    @Json(name = "imageSize") val imageSize: String // "1K", "2K", "4K"
)

data class GenerateContentResponse(
    @Json(name = "candidates") val candidates: List<Candidate>?
)

data class Candidate(
    @Json(name = "content") val content: Content?
)

// --- Veo Video Generation Data Classes ---

data class GenerateVideosRequest(
    @Json(name = "prompt") val prompt: String,
    @Json(name = "config") val config: VeoConfig? = null
)

data class VeoConfig(
    @Json(name = "numberOfVideos") val numberOfVideos: Int = 1,
    @Json(name = "resolution") val resolution: String = "1080p", // "720p", "1080p"
    @Json(name = "aspectRatio") val aspectRatio: String = "16:9" // "16:9", "9:16"
)

data class VeoOperationResponse(
    @Json(name = "name") val name: String?,
    @Json(name = "metadata") val metadata: Map<String, Any>?,
    @Json(name = "done") val done: Boolean? = false,
    @Json(name = "response") val response: Map<String, Any>? = null,
    @Json(name = "error") val error: VeoError? = null
)

data class VeoError(
    @Json(name = "code") val code: Int?,
    @Json(name = "message") val message: String?
)

// --- Retrofit API Service ---

interface GeminiApiService {
    @POST("functions/v1/gemini-proxy")
    suspend fun generateContent(
        @Body request: ProxyGenerateContentRequest
    ): GenerateContentResponse

    @POST("functions/v1/gemini-proxy")
    suspend fun generateVideos(
        @Body request: ProxyGenerateVideosRequest
    ): ResponseBody // Returns the raw operation description
}

data class ProxyGenerateContentRequest(
    val model: String,
    val action: String = "generateContent",
    val payload: GenerateContentRequest
)

data class ProxyGenerateVideosRequest(
    val model: String,
    val action: String = "generateVideos",
    val payload: GenerateVideosRequest
)

object RetrofitClient {
    private val BASE_URL = BuildConfig.SUPABASE_URL.let {
        if (it.endsWith("/")) it else "$it/"
    }

    private val moshi = Moshi.Builder()
        .addLast(KotlinJsonAdapterFactory())
        .build()

    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor { chain ->
            val request = chain.request().newBuilder()
                .addHeader("Authorization", "Bearer ${BuildConfig.SUPABASE_ANON_KEY}")
                .addHeader("apikey", BuildConfig.SUPABASE_ANON_KEY)
                .build()
            chain.proceed(request)
        }
        .connectTimeout(90, TimeUnit.SECONDS)
        .readTimeout(90, TimeUnit.SECONDS)
        .writeTimeout(90, TimeUnit.SECONDS)
        .build()

    val service: GeminiApiService by lazy {
        val retrofit = Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()
        retrofit.create(GeminiApiService::class.java)
    }
}
