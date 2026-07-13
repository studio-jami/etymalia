package studio.jami.entymalia.ui.components

import android.webkit.WebView
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView

@Composable
fun SvgWebView(
    svgContent: String,
    modifier: Modifier = Modifier
) {
    // Standardized HTML frame centering the SVG perfectly with responsive scales
    val htmlFrame = """
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <style>
                * {
                    box-sizing: border-box;
                }
                body, html {
                    margin: 0;
                    padding: 0;
                    width: 100%;
                    height: 100%;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    background-color: transparent;
                    overflow: hidden;
                }
                svg {
                    width: 100%;
                    height: 100%;
                    max-width: 95vw;
                    max-height: 95vh;
                    object-fit: contain;
                }
            </style>
        </head>
        <body>
            $svgContent
        </body>
        </html>
    """.trimIndent()

    AndroidView(
        factory = { context ->
            WebView(context).apply {
                setBackgroundColor(0) // Fully transparent background
                settings.useWideViewPort = true
                settings.loadWithOverviewMode = true
                settings.domStorageEnabled = true
                settings.javaScriptEnabled = false // No scripts needed, safer
            }
        },
        update = { webView ->
            webView.loadDataWithBaseURL(null, htmlFrame, "text/html", "UTF-8", null)
        },
        modifier = modifier
    )
}
