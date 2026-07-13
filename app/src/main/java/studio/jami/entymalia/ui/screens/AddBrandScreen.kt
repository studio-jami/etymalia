package studio.jami.entymalia.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.ColorLens
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import studio.jami.entymalia.data.database.BrandProfile
import studio.jami.entymalia.ui.BrandViewModel
import studio.jami.entymalia.ui.components.ColorPickerDialog

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddBrandScreen(
    viewModel: BrandViewModel,
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val currentProfile = viewModel.currentProfile.collectAsState().value

    // Form inputs
    var name by remember { mutableStateOf(currentProfile?.name ?: "") }
    var industry by remember { mutableStateOf(currentProfile?.industry ?: "") }
    var description by remember { mutableStateOf(currentProfile?.description ?: "") }
    var voice by remember { mutableStateOf(currentProfile?.voice ?: "Professional & Trusted") }
    var primaryColor by remember { mutableStateOf(currentProfile?.primaryColor ?: "#1E293B") }
    var secondaryColor by remember { mutableStateOf(currentProfile?.secondaryColor ?: "#475569") }
    var accentColor by remember { mutableStateOf(currentProfile?.accentColor ?: "#3B82F6") }
    var fontStyle by remember { mutableStateOf(currentProfile?.fontStyle ?: "Modern Sans") }
    var keywords by remember { mutableStateOf(currentProfile?.keywords ?: "") }

    var isPaletteGenerating by remember { mutableStateOf(false) }
    var activeColorPickingSlot by remember { mutableStateOf<String?>(null) }

    // Preset color palettes
    val presets = listOf(
        PresetPalette("Slate Tech", "#1E293B", "#0F172A", "#38BDF8"),
        PresetPalette("Emerald Luxe", "#064E3B", "#022C22", "#34D399"),
        PresetPalette("Sunset Fire", "#991B1B", "#7F1D1D", "#F59E0B"),
        PresetPalette("Violet Aurora", "#5B21B6", "#4C1D95", "#C084FC"),
        PresetPalette("Clean Ocean", "#0369A1", "#0C4A6E", "#06B6D4")
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (currentProfile == null) "Create Brand Kit" else "Edit Brand Kit", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack, modifier = Modifier.testTag("back_button")) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
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
                .verticalScroll(rememberScrollState())
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            // Section 1: Basic Corporate Details
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Text("Corporate Profile", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)

                    OutlinedTextField(
                        value = name,
                        onValueChange = { name = it },
                        label = { Text("Company or Brand Name *") },
                        placeholder = { Text("e.g. BrandForge Corp") },
                        modifier = Modifier.fillMaxWidth().testTag("brand_name_input"),
                        singleLine = true
                    )

                    OutlinedTextField(
                        value = industry,
                        onValueChange = { industry = it },
                        label = { Text("Industry or Niche *") },
                        placeholder = { Text("e.g. Tech SaaS, Luxury Skincare") },
                        modifier = Modifier.fillMaxWidth().testTag("brand_industry_input"),
                        singleLine = true
                    )

                    OutlinedTextField(
                        value = description,
                        onValueChange = { description = it },
                        label = { Text("Brand Mission & Description *") },
                        placeholder = { Text("Explain what you offer, key values, and who your customers are.") },
                        modifier = Modifier.fillMaxWidth().height(120.dp).testTag("brand_desc_input")
                    )
                }
            }

            // Section 2: Colors Palette
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Color Palette", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                        
                        // AI Color Generator Button
                        FilledTonalButton(
                            onClick = {
                                if (description.isEmpty()) {
                                    Toast.makeText(context, "Please enter brand description first", Toast.LENGTH_SHORT).show()
                                    return@FilledTonalButton
                                }
                                isPaletteGenerating = true
                                viewModel.generateBrandColorPalette(description) { p, s, a ->
                                    primaryColor = p
                                    secondaryColor = s
                                    accentColor = a
                                    isPaletteGenerating = false
                                    Toast.makeText(context, "AI color palette applied!", Toast.LENGTH_SHORT).show()
                                }
                            },
                            enabled = !isPaletteGenerating,
                            modifier = Modifier.testTag("ai_colors_button")
                        ) {
                            if (isPaletteGenerating) {
                                CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                            } else {
                                Icon(Icons.Default.AutoAwesome, contentDescription = "AI Generate Colors", modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(6.dp))
                                Text("AI Palette")
                            }
                        }
                    }

                    // Predefined Presets Row
                    Text("Quick Presets", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        presets.forEach { preset ->
                            Box(
                                modifier = Modifier
                                    .size(44.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(parseColor(preset.primary))
                                    .border(
                                        width = if (primaryColor == preset.primary) 3.dp else 1.dp,
                                        color = if (primaryColor == preset.primary) MaterialTheme.colorScheme.onSurface else Color.LightGray,
                                        shape = RoundedCornerShape(8.dp)
                                    )
                                    .clickable {
                                        primaryColor = preset.primary
                                        secondaryColor = preset.secondary
                                        accentColor = preset.accent
                                    },
                                contentAlignment = Alignment.Center
                            ) {
                                if (primaryColor == preset.primary) {
                                    Icon(Icons.Default.Check, contentDescription = "Selected", tint = Color.White, modifier = Modifier.size(16.dp))
                                }
                            }
                        }
                    }

                    HorizontalDivider()

                    // Hex TextInputs
                    Text("Custom Colors (Hex)", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold)
                    
                    ColorRowInput(label = "Primary Color", hex = primaryColor, onHexChange = { primaryColor = it }, onPickColor = { activeColorPickingSlot = "primary" })
                    ColorRowInput(label = "Secondary Color", hex = secondaryColor, onHexChange = { secondaryColor = it }, onPickColor = { activeColorPickingSlot = "secondary" })
                    ColorRowInput(label = "Accent Color", hex = accentColor, onHexChange = { accentColor = it }, onPickColor = { activeColorPickingSlot = "accent" })
                }
            }

            // Section 3: Visual & Typographic Styling
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Text("Aesthetic Settings", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)

                    Text("Brand Font Style", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold)
                    val fontOptions = listOf("Modern Sans", "Classic Serif", "Tech Mono", "Elegant Display")
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        fontOptions.forEach { style ->
                            val isSelected = fontStyle == style
                            FilterChip(
                                selected = isSelected,
                                onClick = { fontStyle = style },
                                label = { Text(style) },
                                modifier = Modifier.weight(1f).testTag("font_chip_$style")
                            )
                        }
                    }

                    OutlinedTextField(
                        value = voice,
                        onValueChange = { voice = it },
                        label = { Text("Brand Voice & Tone") },
                        placeholder = { Text("e.g. Bold and Rebellious, Professional & Serious") },
                        modifier = Modifier.fillMaxWidth().testTag("brand_voice_input"),
                        singleLine = true
                    )

                    OutlinedTextField(
                        value = keywords,
                        onValueChange = { keywords = it },
                        label = { Text("Taglines or Brand Keywords") },
                        placeholder = { Text("e.g. premium, offline-first, sustainable") },
                        modifier = Modifier.fillMaxWidth().testTag("brand_keywords_input"),
                        singleLine = true
                    )
                }
            }

            // Submit Button
            Button(
                onClick = {
                    if (name.isBlank() || industry.isBlank() || description.isBlank()) {
                        Toast.makeText(context, "Please fill in all required (*) fields.", Toast.LENGTH_SHORT).show()
                        return@Button
                    }
                    val profile = BrandProfile(
                        id = currentProfile?.id ?: 0L,
                        name = name,
                        industry = industry,
                        description = description,
                        voice = voice,
                        primaryColor = primaryColor,
                        secondaryColor = secondaryColor,
                        accentColor = accentColor,
                        fontStyle = fontStyle,
                        keywords = keywords
                    )
                    viewModel.saveProfile(profile) {
                        Toast.makeText(context, "Brand Kit saved successfully!", Toast.LENGTH_SHORT).show()
                        onBack()
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
                    .testTag("save_brand_button"),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(Icons.Default.Check, contentDescription = "Save")
                Spacer(Modifier.width(8.dp))
                Text("Save Brand Identity", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
            }
        }
    }

    if (activeColorPickingSlot != null) {
        val slot = activeColorPickingSlot!!
        val title = when (slot) {
            "primary" -> "Primary Brand Color"
            "secondary" -> "Secondary Brand Color"
            else -> "Accent Brand Color"
        }
        val initialHex = when (slot) {
            "primary" -> primaryColor
            "secondary" -> secondaryColor
            else -> accentColor
        }
        ColorPickerDialog(
            title = title,
            initialHex = initialHex,
            onColorSelected = { selectedColor ->
                when (slot) {
                    "primary" -> primaryColor = selectedColor
                    "secondary" -> secondaryColor = selectedColor
                    "accent" -> accentColor = selectedColor
                }
            },
            onDismissRequest = { activeColorPickingSlot = null }
        )
    }
}

@Composable
fun ColorRowInput(
    label: String,
    hex: String,
    onHexChange: (String) -> Unit,
    onPickColor: () -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(44.dp)
                .clip(CircleShape)
                .background(parseColor(hex))
                .border(1.5.dp, MaterialTheme.colorScheme.outline, CircleShape)
                .clickable { onPickColor() }
                .testTag("color_preview_${label.lowercase().replace(" ", "_")}"),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Default.ColorLens,
                contentDescription = "Pick color",
                tint = if (isDarkColor(parseColor(hex))) Color.White else Color.Black,
                modifier = Modifier.size(18.dp)
            )
        }

        OutlinedTextField(
            value = hex,
            onValueChange = { onHexChange(it) },
            label = { Text(label) },
            singleLine = true,
            modifier = Modifier
                .weight(1f)
                .testTag("color_text_${label.lowercase().replace(" ", "_")}"),
            trailingIcon = {
                IconButton(onClick = onPickColor, modifier = Modifier.testTag("color_picker_${label.lowercase().replace(" ", "_")}")) {
                    Icon(Icons.Default.ColorLens, contentDescription = "Open color picker", tint = MaterialTheme.colorScheme.primary)
                }
            }
        )
    }
}

fun isDarkColor(color: Color): Boolean {
    val luminance = 0.2126f * color.red + 0.7152f * color.green + 0.0722f * color.blue
    return luminance < 0.5f
}

data class PresetPalette(
    val name: String,
    val primary: String,
    val secondary: String,
    val accent: String
)

fun parseColor(hexStr: String): Color {
    return try {
        Color(android.graphics.Color.parseColor(hexStr))
    } catch (e: Exception) {
        Color.Gray // Fallback color if malformed
    }
}
