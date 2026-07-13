package studio.jami.entymalia.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ColorLens
import androidx.compose.material.icons.filled.Palette
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ColorPickerDialog(
    title: String,
    initialHex: String,
    onColorSelected: (String) -> Unit,
    onDismissRequest: () -> Unit
) {
    var selectedTab by remember { mutableStateOf(0) }
    
    // Parse initial state
    val initialHsv = remember(initialHex) {
        val hsv = FloatArray(3)
        try {
            android.graphics.Color.colorToHSV(android.graphics.Color.parseColor(initialHex), hsv)
        } catch (e: Exception) {
            android.graphics.Color.colorToHSV(android.graphics.Color.parseColor("#1E293B"), hsv)
        }
        hsv
    }

    var hue by remember { mutableStateOf(initialHsv[0]) }
    var saturation by remember { mutableStateOf(initialHsv[1]) }
    var brightness by remember { mutableStateOf(initialHsv[2]) }

    var typedHex by remember { mutableStateOf(initialHex) }

    // Synchronize sliders to typed hex if valid
    val currentComputedHex = hsvToHex(hue, saturation, brightness)
    
    LaunchedEffect(currentComputedHex) {
        if (typedHex.uppercase() != currentComputedHex.uppercase()) {
            typedHex = currentComputedHex
        }
    }

    val rainbowColors = listOf(
        Color.Red, Color.Yellow, Color.Green, Color.Cyan, Color.Blue, Color.Magenta, Color.Red
    )

    val presetColors = listOf(
        // Slate/Zinc
        "#0F172A" to "Slate Dark", "#475569" to "Slate Med", "#94A3B8" to "Slate Light",
        // Indigo
        "#4338CA" to "Indigo Dark", "#6366F1" to "Indigo Med", "#A5B4FC" to "Indigo Light",
        // Blue
        "#1D4ED8" to "Blue Dark", "#3B82F6" to "Blue Med", "#93C5FD" to "Blue Light",
        // Emerald
        "#047857" to "Emerald Dark", "#10B981" to "Emerald Med", "#6EE7B7" to "Emerald Light",
        // Green
        "#15803D" to "Green Dark", "#22C55E" to "Green Med", "#86EFAC" to "Green Light",
        // Amber
        "#B45309" to "Amber Dark", "#F59E0B" to "Amber Med", "#FDE047" to "Amber Light",
        // Orange
        "#C2410C" to "Orange Dark", "#F97316" to "Orange Med", "#FDBA74" to "Orange Light",
        // Red
        "#B91C1C" to "Red Dark", "#EF4444" to "Red Med", "#FCA5A5" to "Red Light"
    )

    AlertDialog(
        onDismissRequest = onDismissRequest,
        modifier = Modifier
            .fillMaxWidth()
            .testTag("color_picker_dialog"),
        confirmButton = {
            Button(
                onClick = {
                    onColorSelected(currentComputedHex)
                    onDismissRequest()
                },
                modifier = Modifier.testTag("apply_color_button")
            ) {
                Text("Apply")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismissRequest, modifier = Modifier.testTag("cancel_color_button")) {
                Text("Cancel")
            }
        },
        title = {
            Text(title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Side-by-side color preview (Original vs. New)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(80.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(12.dp)),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Original Color Box
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxHeight()
                            .background(parseHexColor(initialHex)),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                "Original",
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold,
                                color = if (isDarkHex(initialHex)) Color.White else Color.Black
                            )
                            Text(
                                initialHex,
                                style = MaterialTheme.typography.bodySmall,
                                color = if (isDarkHex(initialHex)) Color.White else Color.Black
                            )
                        }
                    }
                    
                    // New Color Box
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxHeight()
                            .background(parseHexColor(currentComputedHex)),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                "Selected",
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold,
                                color = if (isDarkHex(currentComputedHex)) Color.White else Color.Black
                            )
                            Text(
                                currentComputedHex,
                                style = MaterialTheme.typography.bodySmall,
                                color = if (isDarkHex(currentComputedHex)) Color.White else Color.Black
                            )
                        }
                    }
                }

                // Tab selectors for Sliders or Presets
                TabRow(selectedTabIndex = selectedTab) {
                    Tab(
                        selected = selectedTab == 0,
                        onClick = { selectedTab = 0 },
                        icon = { Icon(Icons.Default.Tune, contentDescription = "HSV Sliders") },
                        text = { Text("Custom HSV") },
                        modifier = Modifier.testTag("hsv_tab")
                    )
                    Tab(
                        selected = selectedTab == 1,
                        onClick = { selectedTab = 1 },
                        icon = { Icon(Icons.Default.Palette, contentDescription = "Presets Grid") },
                        text = { Text("Presets") },
                        modifier = Modifier.testTag("presets_tab")
                    )
                }

                if (selectedTab == 0) {
                    // HSV Sliders Section
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        // Hue slider
                        Column(modifier = Modifier.fillMaxWidth()) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("Hue (${hue.toInt()}°)", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold)
                            }
                            Spacer(Modifier.height(4.dp))
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(10.dp)
                                    .clip(RoundedCornerShape(5.dp))
                                    .background(Brush.horizontalGradient(rainbowColors))
                            )
                            Slider(
                                value = hue,
                                onValueChange = { hue = it },
                                valueRange = 0f..360f,
                                modifier = Modifier.fillMaxWidth().testTag("hue_slider")
                            )
                        }

                        // Saturation slider
                        Column(modifier = Modifier.fillMaxWidth()) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("Saturation (${(saturation * 100).toInt()}%)", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold)
                            }
                            Spacer(Modifier.height(4.dp))
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(10.dp)
                                    .clip(RoundedCornerShape(5.dp))
                                    .background(
                                        Brush.horizontalGradient(
                                            listOf(Color.White, hsvToColor(hue, 1f, 1f))
                                        )
                                    )
                            )
                            Slider(
                                value = saturation,
                                onValueChange = { saturation = it },
                                valueRange = 0f..1f,
                                modifier = Modifier.fillMaxWidth().testTag("saturation_slider")
                            )
                        }

                        // Brightness slider
                        Column(modifier = Modifier.fillMaxWidth()) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("Brightness (${(brightness * 100).toInt()}%)", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold)
                            }
                            Spacer(Modifier.height(4.dp))
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(10.dp)
                                    .clip(RoundedCornerShape(5.dp))
                                    .background(
                                        Brush.horizontalGradient(
                                            listOf(Color.Black, hsvToColor(hue, saturation, 1f))
                                        )
                                    )
                            )
                            Slider(
                                value = brightness,
                                onValueChange = { brightness = it },
                                valueRange = 0f..1f,
                                modifier = Modifier.fillMaxWidth().testTag("brightness_slider")
                            )
                        }

                        // Direct Hex input in Custom HSV Tab
                        OutlinedTextField(
                            value = typedHex,
                            onValueChange = { input ->
                                typedHex = input
                                try {
                                    if (input.startsWith("#") && (input.length == 7 || input.length == 9)) {
                                        val hsv = FloatArray(3)
                                        android.graphics.Color.colorToHSV(android.graphics.Color.parseColor(input), hsv)
                                        hue = hsv[0]
                                        saturation = hsv[1]
                                        brightness = hsv[2]
                                    } else if (input.length == 6) {
                                        val hsv = FloatArray(3)
                                        android.graphics.Color.colorToHSV(android.graphics.Color.parseColor("#$input"), hsv)
                                        hue = hsv[0]
                                        saturation = hsv[1]
                                        brightness = hsv[2]
                                    }
                                } catch (e: Exception) {
                                    // Soft failure during active user editing
                                }
                            },
                            label = { Text("Exact Hex Code") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth().testTag("dialog_hex_input"),
                            trailingIcon = {
                                Icon(Icons.Default.ColorLens, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                            }
                        )
                    }
                } else {
                    // Presets Grid Section
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text("Corporate Preset Grids", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.outline)
                        
                        LazyVerticalGrid(
                            columns = GridCells.Fixed(4),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(220.dp)
                                .testTag("presets_grid"),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            items(presetColors) { (hexStr, label) ->
                                Box(
                                    modifier = Modifier
                                        .aspectRatio(1f)
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(parseHexColor(hexStr))
                                        .border(
                                            width = if (currentComputedHex.uppercase() == hexStr.uppercase()) 2.5.dp else 1.dp,
                                            color = if (currentComputedHex.uppercase() == hexStr.uppercase()) MaterialTheme.colorScheme.onSurface else Color.LightGray,
                                            shape = RoundedCornerShape(8.dp)
                                        )
                                        .clickable {
                                            typedHex = hexStr
                                            val hsv = FloatArray(3)
                                            android.graphics.Color.colorToHSV(android.graphics.Color.parseColor(hexStr), hsv)
                                            hue = hsv[0]
                                            saturation = hsv[1]
                                            brightness = hsv[2]
                                        }
                                        .testTag("preset_chip_$hexStr"),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        label,
                                        style = MaterialTheme.typography.labelSmall,
                                        fontWeight = FontWeight.Bold,
                                        textAlign = TextAlign.Center,
                                        color = if (isDarkHex(hexStr)) Color.White else Color.Black,
                                        modifier = Modifier.padding(2.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    )
}

// Private Helpers

private fun hsvToHex(hue: Float, saturation: Float, brightness: Float): String {
    val colorInt = android.graphics.Color.HSVToColor(floatArrayOf(hue, saturation, brightness))
    return String.format("#%06X", 0xFFFFFF and colorInt)
}

private fun hsvToColor(h: Float, s: Float, v: Float): Color {
    return Color(android.graphics.Color.HSVToColor(floatArrayOf(h, s, v)))
}

private fun parseHexColor(hexStr: String): Color {
    return try {
        Color(android.graphics.Color.parseColor(hexStr))
    } catch (e: Exception) {
        Color.Gray
    }
}

private fun isDarkHex(hexStr: String): Boolean {
    return try {
        val colorInt = android.graphics.Color.parseColor(hexStr)
        val r = android.graphics.Color.red(colorInt) / 255f
        val g = android.graphics.Color.green(colorInt) / 255f
        val b = android.graphics.Color.blue(colorInt) / 255f
        val luminance = 0.2126f * r + 0.7152f * g + 0.0722f * b
        luminance < 0.5f
    } catch (e: Exception) {
        true
    }
}
