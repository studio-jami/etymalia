package studio.jami.entymalia.ui.screens

import android.content.Context
import android.net.Uri
import android.util.Base64
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import studio.jami.entymalia.data.database.BrandProfile
import studio.jami.entymalia.data.database.GeneratedAsset
import studio.jami.entymalia.ui.BrandViewModel
import studio.jami.entymalia.ui.components.SvgWebView
import java.io.InputStream

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BrandDetailScreen(
    viewModel: BrandViewModel,
    onBack: () -> Unit,
    onEditProfile: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val clipboardManager = LocalClipboardManager.current
    val profile = viewModel.currentProfile.collectAsState().value ?: return

    var activeTab by remember { mutableStateOf(0) }
    val tabs = listOf("Workspace", "Logo & Favicon", "Marketing Media", "Veo Video", "Brand Audit")

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(profile.name, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleLarge)
                        Text(profile.industry, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack, modifier = Modifier.testTag("back_button")) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = onEditProfile, modifier = Modifier.testTag("edit_profile_button")) {
                        Icon(Icons.Default.Edit, contentDescription = "Edit Profile")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surfaceColorAtElevation(2.dp)
                )
            )
        }
    ) { innerPadding ->
        Column(
            modifier = modifier
                .padding(innerPadding)
                .fillMaxSize()
        ) {
            // Dynamic theme header swatches
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(6.dp)
            ) {
                Box(modifier = Modifier.weight(1f).fillMaxHeight().background(parseColor(profile.primaryColor)))
                Box(modifier = Modifier.weight(1f).fillMaxHeight().background(parseColor(profile.secondaryColor)))
                Box(modifier = Modifier.weight(1f).fillMaxHeight().background(parseColor(profile.accentColor)))
            }

            // Scrollable Tab Row for easy access to tools
            ScrollableTabRow(
                selectedTabIndex = activeTab,
                edgePadding = 12.dp,
                modifier = Modifier.fillMaxWidth()
            ) {
                tabs.forEachIndexed { index, title ->
                    Tab(
                        selected = activeTab == index,
                        onClick = { activeTab = index },
                        text = { Text(title, fontWeight = FontWeight.SemiBold) },
                        modifier = Modifier.testTag("tab_$index")
                    )
                }
            }

            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
            ) {
                when (activeTab) {
                    0 -> WorkspaceGalleryView(viewModel)
                    1 -> LogoAndFaviconView(viewModel, profile, clipboardManager, context)
                    2 -> MarketingMediaView(viewModel, profile)
                    3 -> VeoVideoView(viewModel, profile, context)
                    4 -> BrandAuditView(viewModel, profile, context)
                }
            }
        }
    }
}

// --- TAB 0: ASSETS GALLERY & STATS WORKSPACE ---

@Composable
fun WorkspaceGalleryView(viewModel: BrandViewModel) {
    val assets = viewModel.assets.collectAsState().value

    if (assets.isEmpty()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(Icons.Default.PhotoLibrary, contentDescription = "Empty", modifier = Modifier.size(64.dp), tint = MaterialTheme.colorScheme.primary.copy(alpha = 0.5f))
            Spacer(Modifier.height(16.dp))
            Text("No Brand Assets Generated", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Text(
                "Use the generation tabs above to design professional logos, adaptive favicons, marketing photos, and animated promos matching your brand guidelines.",
                style = MaterialTheme.typography.bodySmall,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 8.dp)
            )
        }
    } else {
        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            contentPadding = PaddingValues(16.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            items(assets) { asset ->
                AssetCardItem(asset = asset, onDelete = { viewModel.deleteAsset(asset.id) })
            }
        }
    }
}

@Composable
fun AssetCardItem(asset: GeneratedAsset, onDelete: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(140.dp)
                    .background(Color.Black.copy(alpha = 0.05f))
            ) {
                when (asset.assetType) {
                    "logo_svg" -> {
                        SvgWebView(svgContent = asset.content, modifier = Modifier.fillMaxSize())
                    }
                    "video_promo" -> {
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(Color.DarkGray),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.PlayCircleFilled, contentDescription = "Video", modifier = Modifier.size(48.dp), tint = Color.White)
                        }
                    }
                    else -> {
                        // Image asset types
                        Base64Image(base64String = asset.content, contentDescription = asset.title, modifier = Modifier.fillMaxSize())
                    }
                }
            }

            Column(modifier = Modifier.padding(12.dp)) {
                Text(
                    text = asset.title,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = asset.assetType.replace("_", " ").uppercase(),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.padding(top = 2.dp)
                )

                Row(
                    modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = if (asset.size.isNotEmpty()) "${asset.size} • ${asset.aspectRatio}" else asset.aspectRatio,
                        style = MaterialTheme.typography.labelSmall,
                        color = Color.Gray
                    )
                    IconButton(onClick = onDelete, modifier = Modifier.size(24.dp)) {
                        Icon(Icons.Default.Delete, contentDescription = "Delete", tint = Color.Red.copy(alpha = 0.6f), modifier = Modifier.size(16.dp))
                    }
                }
            }
        }
    }
}

// --- TAB 1: SVG LOGOS & PROFILE AVATARS ---

@Composable
fun LogoAndFaviconView(
    viewModel: BrandViewModel,
    profile: BrandProfile,
    clipboardManager: androidx.compose.ui.platform.ClipboardManager,
    context: Context
) {
    var logoPrompt by remember { mutableStateOf("Abstract geometrical icon combining company initials in a sleek crest.") }
    var selectedRef by remember { mutableStateOf<GeneratedAsset?>(null) }
    val lastGeneratedSvg = viewModel.lastGeneratedSvg.collectAsState().value
    val isGenerating = viewModel.isGenerating.collectAsState().value
    val generationError = viewModel.generationError.collectAsState().value
    val bundleAssets = viewModel.faviconAssets.collectAsState().value

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // SVG Vector Generator Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Brush, contentDescription = "Vector Logo", tint = MaterialTheme.colorScheme.primary)
                    Spacer(Modifier.width(8.dp))
                    Text("Transparent SVG Logo Creator", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                }

                Text(
                    "Generates raw, scale-independent vector SVG layouts conforming strictly to your corporate colors. SVG designs support transparent backgrounds, lossless resolutions, and inline styling.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                OutlinedTextField(
                    value = logoPrompt,
                    onValueChange = { logoPrompt = it },
                    label = { Text("Logo Concept & Art Direction") },
                    modifier = Modifier.fillMaxWidth().testTag("logo_concept_input")
                )

                ReferenceSelector(
                    viewModel = viewModel,
                    selectedReference = selectedRef,
                    onReferenceSelected = { selectedRef = it },
                    context = context
                )

                Button(
                    onClick = { viewModel.generateSvgLogo(logoPrompt, selectedRef?.content, "image/png") },
                    enabled = !isGenerating && logoPrompt.isNotEmpty(),
                    modifier = Modifier.fillMaxWidth().testTag("generate_logo_button")
                ) {
                    if (isGenerating) {
                        CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                    } else {
                        Icon(Icons.Default.AutoAwesome, contentDescription = "Gen")
                        Spacer(Modifier.width(8.dp))
                        Text("Render Vector SVG Logo")
                    }
                }

                if (generationError != null) {
                    Text(generationError, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                }

                if (lastGeneratedSvg != null) {
                    Text("Interactive SVG Output", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                    
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(220.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .border(1.dp, Color.LightGray, RoundedCornerShape(8.dp))
                            .background(Color.White) // Clear high contrast visual checkerboard
                    ) {
                        SvgWebView(svgContent = lastGeneratedSvg, modifier = Modifier.fillMaxSize())
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Button(
                            onClick = {
                                clipboardManager.setText(AnnotatedString(lastGeneratedSvg))
                                Toast.makeText(context, "SVG XML copied to clipboard!", Toast.LENGTH_SHORT).show()
                            },
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.ContentCopy, contentDescription = "Copy")
                            Spacer(Modifier.width(4.dp))
                            Text("Copy SVG XML", fontSize = 12.sp)
                        }
                    }

                    // Raw SVG expansion
                    var showCode by remember { mutableStateOf(false) }
                    TextButton(onClick = { showCode = !showCode }) {
                        Text(if (showCode) "Hide Source Code" else "Show Source Code")
                    }
                    if (showCode) {
                        SelectionContainer {
                            Text(
                                text = lastGeneratedSvg,
                                style = MaterialTheme.typography.bodySmall.copy(fontFamily = FontFamily.Monospace),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(Color.LightGray.copy(alpha = 0.3f))
                                    .padding(8.dp)
                            )
                        }
                    }
                }
            }
        }

        // Favicons and Profiles Auto-Bundle Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.BurstMode, contentDescription = "Social Bundles", tint = MaterialTheme.colorScheme.primary)
                    Spacer(Modifier.width(8.dp))
                    Text("Favicons & Social Profile Suite", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                }

                Text(
                    "Instantly deploy your logo identity across all target networks. This tool auto-generates customized squares optimized for Web Favicons, Instagram, X/Twitter, and LinkedIn profiles.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Button(
                    onClick = { viewModel.generateBrandingIconsBundle() },
                    enabled = !isGenerating,
                    modifier = Modifier.fillMaxWidth().testTag("generate_bundle_button"),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondary)
                ) {
                    if (isGenerating) {
                        CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                    } else {
                        Icon(Icons.Default.AutoAwesome, contentDescription = "Bundle")
                        Spacer(Modifier.width(8.dp))
                        Text("Auto-Generate Brand Suite")
                    }
                }

                if (bundleAssets.isNotEmpty()) {
                    Text("Auto-Generated Bundle Assets", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                    
                    LazyVerticalGrid(
                        columns = GridCells.Fixed(2),
                        modifier = Modifier.height(280.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(bundleAssets) { asset ->
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceColorAtElevation(1.dp))
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(8.dp)) {
                                    Box(
                                        modifier = Modifier
                                            .size(64.dp)
                                            .clip(CircleShape)
                                            .background(Color.Black.copy(alpha = 0.05f)),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Base64Image(base64String = asset.content, contentDescription = asset.title, modifier = Modifier.fillMaxSize())
                                    }
                                    Spacer(Modifier.height(6.dp))
                                    Text(asset.title, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                    Text(asset.size, style = MaterialTheme.typography.labelSmall, color = Color.Gray)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// --- TAB 2: PRO MARKETING IMAGE GENERATION ---

@Composable
fun MarketingMediaView(
    viewModel: BrandViewModel,
    profile: BrandProfile
) {
    val context = LocalContext.current
    var userPrompt by remember { mutableStateOf("Branded premium packaging layout showcasing an organic product resting on slate stone blocks surrounded by soft leaves.") }
    var selectedAspectRatio by remember { mutableStateOf("1:1") }
    var selectedSize by remember { mutableStateOf("1K") }
    var isStudioQuality by remember { mutableStateOf(true) }
    var selectedRef by remember { mutableStateOf<GeneratedAsset?>(null) }

    val isGenerating = viewModel.isGenerating.collectAsState().value
    val lastGeneratedImage = viewModel.lastGeneratedImageBase64.collectAsState().value
    val error = viewModel.generationError.collectAsState().value

    val aspectRatios = listOf("1:1", "2:3", "3:2", "3:4", "4:3", "9:16", "16:9", "21:9")
    val sizes = listOf("1K", "2K", "4K")

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.AddPhotoAlternate, contentDescription = "Marketing", tint = MaterialTheme.colorScheme.primary)
                    Spacer(Modifier.width(8.dp))
                    Text("AI Marketing Visuals Creator", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                }

                Text(
                    "Generate consistent high-quality advertising graphics, product displays, or social posts utilizing model: gemini-3-pro-image-preview. Brand colors and target aesthetics will be auto-injected.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                OutlinedTextField(
                    value = userPrompt,
                    onValueChange = { userPrompt = it },
                    label = { Text("Marketing Scene prompt") },
                    modifier = Modifier.fillMaxWidth().testTag("marketing_prompt_input")
                )

                ReferenceSelector(
                    viewModel = viewModel,
                    selectedReference = selectedRef,
                    onReferenceSelected = { selectedRef = it },
                    context = context
                )

                // Aspect ratio picker
                Text("Aspect Ratio", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold)
                LazyVerticalGrid(
                    columns = GridCells.Fixed(4),
                    modifier = Modifier.height(100.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    items(aspectRatios) { ratio ->
                        FilterChip(
                            selected = selectedAspectRatio == ratio,
                            onClick = { selectedAspectRatio = ratio },
                            label = { Text(ratio, fontSize = 11.sp) },
                            modifier = Modifier.testTag("ratio_chip_$ratio")
                        )
                    }
                }

                // Size picker
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("Export Resolution", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold)
                        Text("1K, 2K, or professional 4K sizes", style = MaterialTheme.typography.labelSmall, color = Color.Gray)
                    }

                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        sizes.forEach { size ->
                            FilterChip(
                                selected = selectedSize == size,
                                onClick = { selectedSize = size },
                                label = { Text(size) },
                                modifier = Modifier.testTag("size_chip_$size")
                            )
                        }
                    }
                }

                // Studio quality toggles
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Studio Quality Mode", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold)
                        Text("Enable gemini-3-pro-image-preview for elite retail-grade graphics. Disable to use gemini-3.1-flash-image-preview for fast iteration.", style = MaterialTheme.typography.labelSmall, color = Color.Gray)
                    }
                    Switch(
                        checked = isStudioQuality,
                        onCheckedChange = { isStudioQuality = it },
                        modifier = Modifier.testTag("studio_quality_switch")
                    )
                }

                Button(
                    onClick = {
                        viewModel.generateMarketingImage(
                            prompt = userPrompt,
                            aspectRatio = selectedAspectRatio,
                            size = selectedSize,
                            isStudioQuality = isStudioQuality,
                            referenceImageBase64 = selectedRef?.content,
                            referenceMimeType = "image/png"
                        )
                    },
                    enabled = !isGenerating && userPrompt.isNotEmpty(),
                    modifier = Modifier.fillMaxWidth().testTag("generate_marketing_button")
                ) {
                    if (isGenerating) {
                        CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                    } else {
                        Icon(Icons.Default.AutoAwesome, contentDescription = "Gen")
                        Spacer(Modifier.width(8.dp))
                        Text("Generate High-Res Media Asset")
                    }
                }

                if (error != null) {
                    Text(error, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                }

                if (lastGeneratedImage != null) {
                    Text("Generated Media Asset", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                    
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(280.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color.LightGray.copy(alpha = 0.3f))
                    ) {
                        Base64Image(base64String = lastGeneratedImage, contentDescription = "Generated Marketing Media", modifier = Modifier.fillMaxSize())
                    }

                    Text("Successfully saved to your Brand Kit Gallery workspace!", color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}

// --- TAB 3: VEO VIDEO ANIMATION ---

@Composable
fun VeoVideoView(
    viewModel: BrandViewModel,
    profile: BrandProfile,
    context: Context
) {
    var videoPrompt by remember { mutableStateOf("Cinematic camera sweep over a luxury product container shimmering in atmospheric lighting with gentle fog.") }
    var selectedAspectRatio by remember { mutableStateOf("16:9") }
    var selectedRef by remember { mutableStateOf<GeneratedAsset?>(null) }

    val isVideoRendering = viewModel.isVideoRendering.collectAsState().value
    val renderingProgress = viewModel.videoRenderingProgress.collectAsState().value
    val lastVideoUri = viewModel.lastGeneratedVideoUri.collectAsState().value
    val error = viewModel.generationError.collectAsState().value

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.VideoLibrary, contentDescription = "Video", tint = MaterialTheme.colorScheme.primary)
                    Spacer(Modifier.width(8.dp))
                    Text("Veo 3.1 Branded Video Studio", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                }

                Text(
                    "Add cinematic life to your brand! Write script prompts or select a brand reference photo to animate it into premium marketing ads. Model: veo-3.1-fast-generate-preview.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                OutlinedTextField(
                    value = videoPrompt,
                    onValueChange = { videoPrompt = it },
                    label = { Text("Cinematic Video Script & Motion Direction") },
                    modifier = Modifier.fillMaxWidth().testTag("video_prompt_input")
                )

                // Optional Image upload for Image-to-Video
                ReferenceSelector(
                    viewModel = viewModel,
                    selectedReference = selectedRef,
                    onReferenceSelected = { selectedRef = it },
                    context = context
                )

                // Aspect ratio selector
                Text("Aspect Ratio", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(
                        selected = selectedAspectRatio == "16:9",
                        onClick = { selectedAspectRatio = "16:9" },
                        label = { Text("16:9 Landscape") },
                        modifier = Modifier.testTag("ratio_16_9")
                    )
                    FilterChip(
                        selected = selectedAspectRatio == "9:16",
                        onClick = { selectedAspectRatio = "9:16" },
                        label = { Text("9:16 Portrait") },
                        modifier = Modifier.testTag("ratio_9_16")
                    )
                }

                Button(
                    onClick = {
                        viewModel.generateVideo(
                            prompt = videoPrompt,
                            aspectRatio = selectedAspectRatio,
                            referenceImageBase64 = selectedRef?.content,
                            referenceImageMime = "image/png"
                        )
                    },
                    enabled = !isVideoRendering && videoPrompt.isNotEmpty(),
                    modifier = Modifier.fillMaxWidth().testTag("generate_video_button"),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.tertiary)
                ) {
                    if (isVideoRendering) {
                        CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp, color = MaterialTheme.colorScheme.onTertiary)
                    } else {
                        Icon(Icons.Default.VideoCall, contentDescription = "Video")
                        Spacer(Modifier.width(8.dp))
                        Text("Initiate Veo Render Cycle")
                    }
                }

                if (isVideoRendering) {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        LinearProgressIndicator(progress = { renderingProgress }, modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(4.dp)))
                        Text("Veo AI Engine rendering frames: ${(renderingProgress * 100).toInt()}%", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.SemiBold)
                    }
                }

                if (error != null) {
                    Text(error, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                }

                if (lastVideoUri != null) {
                    Text("Rendered Veo Video Output", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(200.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color.DarkGray),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Default.PlayCircleFilled, contentDescription = "Play Video", modifier = Modifier.size(64.dp), tint = Color.White)
                            Spacer(Modifier.height(8.dp))
                            Text("Cinematic promo generated successfully!", color = Color.White, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                            Text("ID: $lastVideoUri", color = Color.White.copy(alpha = 0.6f), style = MaterialTheme.typography.labelSmall)
                        }
                    }
                }
            }
        }
    }
}

// --- TAB 4: COMPREHENSIVE BRAND CONSISTENCY AUDITOR ---

@Composable
fun BrandAuditView(
    viewModel: BrandViewModel,
    profile: BrandProfile,
    context: Context
) {
    var selectedUri by remember { mutableStateOf<Uri?>(null) }
    var selectedBase64 by remember { mutableStateOf<String?>(null) }
    
    val isGenerating = viewModel.isGenerating.collectAsState().value
    val auditReport = viewModel.lastAuditReport.collectAsState().value
    val error = viewModel.generationError.collectAsState().value

    val pickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia()
    ) { uri ->
        if (uri != null) {
            selectedUri = uri
            selectedBase64 = uriToBase64(context, uri)
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Verified, contentDescription = "Audit", tint = MaterialTheme.colorScheme.primary)
                    Spacer(Modifier.width(8.dp))
                    Text("Gemini Brand Alignment Auditor", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                }

                Text(
                    "Analyze existing designs or external photos for strict alignment. Upload your design and let Gemini 3.1 Pro analyze color palette usage, design aesthetics, brand voice consistency, and output detailed scores.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                // Select image to audit
                if (selectedUri != null) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(200.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .border(1.dp, Color.LightGray, RoundedCornerShape(12.dp))
                    ) {
                        Base64Image(base64String = selectedBase64 ?: "", contentDescription = "Audit Target", modifier = Modifier.fillMaxSize())
                        IconButton(
                            onClick = { selectedUri = null; selectedBase64 = null },
                            modifier = Modifier.align(Alignment.TopEnd).background(Color.Black.copy(alpha = 0.5f), CircleShape)
                        ) {
                            Icon(Icons.Default.Close, contentDescription = "Remove", tint = Color.White)
                        }
                    }
                } else {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(140.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .border(2.dp, Color.Gray.copy(alpha = 0.4f), RoundedCornerShape(12.dp))
                            .clickable { pickerLauncher.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) },
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Default.AddPhotoAlternate, contentDescription = "Upload", modifier = Modifier.size(48.dp), tint = Color.Gray)
                            Spacer(Modifier.height(8.dp))
                            Text("Select Media Asset to Audit", style = MaterialTheme.typography.bodySmall, color = Color.Gray, fontWeight = FontWeight.SemiBold)
                        }
                    }
                }

                Button(
                    onClick = {
                        val base64 = selectedBase64
                        val type = selectedUri?.let { context.contentResolver.getType(it) } ?: "image/jpeg"
                        if (base64 != null) {
                            viewModel.auditImageConsistency(base64, type)
                        }
                    },
                    enabled = !isGenerating && selectedBase64 != null,
                    modifier = Modifier.fillMaxWidth().testTag("run_audit_button")
                ) {
                    if (isGenerating) {
                        CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                    } else {
                        Icon(Icons.Default.DocumentScanner, contentDescription = "Audit")
                        Spacer(Modifier.width(8.dp))
                        Text("Audit Consistency Alignment")
                    }
                }

                if (error != null) {
                    Text(error, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                }

                if (auditReport != null) {
                    HorizontalDivider()
                    Text("Executive Brand Consistency Report", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                    
                    // Simple Markdown-like card box
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceColorAtElevation(1.dp))
                    ) {
                        SelectionContainer {
                            Text(
                                text = auditReport,
                                style = MaterialTheme.typography.bodySmall,
                                modifier = Modifier.padding(16.dp),
                                lineHeight = 20.sp
                            )
                        }
                    }
                }
            }
        }
    }
}

// --- Dynamic Base64 Image Loader Composable ---

@Composable
fun Base64Image(
    base64String: String,
    contentDescription: String?,
    modifier: Modifier = Modifier
) {
    val bitmap = remember(base64String) {
        try {
            val cleanStr = if (base64String.contains(",")) {
                base64String.substringAfter(",")
            } else {
                base64String
            }
            val bytes = Base64.decode(cleanStr, Base64.DEFAULT)
            android.graphics.BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
        } catch (e: Exception) {
            null
        }
    }

    if (bitmap != null) {
        androidx.compose.foundation.Image(
            bitmap = bitmap.asImageBitmap(),
            contentDescription = contentDescription,
            modifier = modifier,
            contentScale = ContentScale.Crop
        )
    } else {
        Box(
            modifier = modifier.background(Color.Gray.copy(alpha = 0.2f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(Icons.Default.BrokenImage, contentDescription = "Corrupted", tint = Color.Gray)
        }
    }
}

// --- Helper Uri conversion ---

fun uriToBase64(context: Context, uri: Uri): String? {
    return try {
        val inputStream: InputStream? = context.contentResolver.openInputStream(uri)
        val bytes = inputStream?.readBytes()
        inputStream?.close()
        if (bytes != null) {
            Base64.encodeToString(bytes, Base64.NO_WRAP)
        } else null
    } catch (e: Exception) {
        null
    }
}

// --- REUSABLE STYLE & CONCEPT REFERENCE SELECTOR COMPOSABLE ---

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReferenceSelector(
    viewModel: BrandViewModel,
    selectedReference: GeneratedAsset?,
    onReferenceSelected: (GeneratedAsset?) -> Unit,
    context: Context
) {
    val assets = viewModel.assets.collectAsState().value
    val references = remember(assets) { assets.filter { it.assetType == "reference_image" } }

    var showUploadDialog by remember { mutableStateOf(false) }
    var tempUri by remember { mutableStateOf<Uri?>(null) }
    var tempBase64 by remember { mutableStateOf<String?>(null) }
    var refTitle by remember { mutableStateOf("") }
    var refType by remember { mutableStateOf("Style Reference") } // Options: Style Reference, Character Reference, Layout Reference, Product Photo

    val refTypes = listOf("Style Reference", "Character Reference", "Layout Reference", "Product Photo")

    val launcher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia()
    ) { uri ->
        if (uri != null) {
            tempUri = uri
            tempBase64 = uriToBase64(context, uri)
            showUploadDialog = true
        }
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceColorAtElevation(1.dp)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("Visual Style & Concept Reference", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                    Text("Influence generative layouts or characters using visual guidelines.", style = MaterialTheme.typography.labelSmall, color = Color.Gray)
                }
                
                IconButton(
                    onClick = { launcher.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) },
                    modifier = Modifier.testTag("upload_ref_image_button")
                ) {
                    Icon(Icons.Default.AddPhotoAlternate, contentDescription = "Upload reference image", tint = MaterialTheme.colorScheme.primary)
                }
            }

            if (references.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(60.dp)
                        .background(Color.Black.copy(alpha = 0.02f), RoundedCornerShape(8.dp))
                        .clickable { launcher.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) },
                    contentAlignment = Alignment.Center
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.UploadFile, contentDescription = null, tint = Color.Gray, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("No references saved. Tap to upload style/ref image.", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                    }
                }
            } else {
                LazyRow(
                    modifier = Modifier.fillMaxWidth().testTag("references_row"),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    item {
                        // "None" option
                        Box(
                            modifier = Modifier
                                .size(72.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .background(if (selectedReference == null) MaterialTheme.colorScheme.primaryContainer else Color.Black.copy(alpha = 0.05f))
                                .border(
                                    width = if (selectedReference == null) 2.dp else 1.dp,
                                    color = if (selectedReference == null) MaterialTheme.colorScheme.primary else Color.LightGray,
                                    shape = RoundedCornerShape(8.dp)
                                )
                                .clickable { onReferenceSelected(null) }
                                .testTag("ref_option_none"),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(
                                    imageVector = Icons.Default.Block,
                                    contentDescription = "None",
                                    tint = if (selectedReference == null) MaterialTheme.colorScheme.onPrimaryContainer else Color.Gray,
                                    modifier = Modifier.size(20.dp)
                                )
                                Text(
                                    "No Ref",
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = if (selectedReference == null) MaterialTheme.colorScheme.onPrimaryContainer else Color.Gray
                                )
                            }
                        }
                    }

                    items(references) { ref ->
                        val isSelected = selectedReference?.id == ref.id
                        Box(
                            modifier = Modifier
                                .size(72.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .border(
                                    width = if (isSelected) 2.5.dp else 1.dp,
                                    color = if (isSelected) MaterialTheme.colorScheme.primary else Color.LightGray,
                                    shape = RoundedCornerShape(8.dp)
                                )
                                .clickable { onReferenceSelected(ref) }
                                .testTag("ref_option_${ref.id}"),
                            contentAlignment = Alignment.Center
                        ) {
                            Base64Image(base64String = ref.content, contentDescription = ref.title, modifier = Modifier.fillMaxSize())
                            
                            // Category Badge at bottom
                            Box(
                                modifier = Modifier
                                    .align(Alignment.BottomCenter)
                                    .fillMaxWidth()
                                    .background(Color.Black.copy(alpha = 0.7f))
                                    .padding(vertical = 2.dp)
                            ) {
                                Text(
                                    text = ref.prompt.replace(" Reference", ""),
                                    color = Color.White,
                                    fontSize = 8.sp,
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold,
                                    textAlign = TextAlign.Center,
                                    maxLines = 1,
                                    modifier = Modifier.fillMaxWidth()
                                )
                            }

                            // Delete button on top-right
                            IconButton(
                                onClick = {
                                    if (isSelected) onReferenceSelected(null)
                                    viewModel.deleteAsset(ref.id)
                                },
                                modifier = Modifier
                                    .size(20.dp)
                                    .align(Alignment.TopEnd)
                                    .background(Color.Black.copy(alpha = 0.5f), CircleShape)
                            ) {
                                Icon(Icons.Default.Close, contentDescription = "Delete reference", tint = Color.White, modifier = Modifier.size(12.dp))
                            }
                        }
                    }
                }
            }

            if (selectedReference != null) {
                Surface(
                    color = MaterialTheme.colorScheme.secondaryContainer,
                    shape = RoundedCornerShape(6.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(Icons.Default.CheckCircle, contentDescription = "Active", tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(16.dp))
                        Text(
                            text = "Active Reference: ${selectedReference.title} (${selectedReference.prompt})",
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSecondaryContainer
                        )
                    }
                }
            }
        }
    }

    // Reference Details Dialog
    if (showUploadDialog) {
        AlertDialog(
            onDismissRequest = { showUploadDialog = false },
            title = { Text("Save Visual Reference Image", fontWeight = FontWeight.Bold) },
            confirmButton = {
                Button(
                    onClick = {
                        val finalTitle = refTitle.ifEmpty { "Reference ${System.currentTimeMillis()}" }
                        tempBase64?.let { base64 ->
                            viewModel.saveReferenceAsset(finalTitle, refType, base64)
                        }
                        showUploadDialog = false
                        refTitle = ""
                        tempUri = null
                        tempBase64 = null
                    },
                    enabled = tempBase64 != null,
                    modifier = Modifier.testTag("save_reference_confirm_button")
                ) {
                    Text("Save to Brand Kit")
                }
            },
            dismissButton = {
                TextButton(onClick = { showUploadDialog = false }) {
                    Text("Cancel")
                }
            },
            text = {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    tempBase64?.let { base64 ->
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(120.dp)
                                .clip(RoundedCornerShape(8.dp))
                        ) {
                            Base64Image(base64String = base64, contentDescription = "Preview", modifier = Modifier.fillMaxSize())
                        }
                    }

                    OutlinedTextField(
                        value = refTitle,
                        onValueChange = { refTitle = it },
                        label = { Text("Reference Asset Name (e.g., Summer Style)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth().testTag("ref_title_input")
                    )

                    Text("Reference Class Category", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold, color = Color.Gray)
                    
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        refTypes.forEach { type ->
                            FilterChip(
                                selected = refType == type,
                                onClick = { refType = type },
                                label = { Text(type, fontSize = 10.sp) },
                                modifier = Modifier.testTag("ref_type_$type")
                            )
                        }
                    }
                }
            }
        )
    }
}
