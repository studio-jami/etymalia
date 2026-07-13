package studio.jami.entymalia

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import studio.jami.entymalia.data.database.BrandDatabase
import studio.jami.entymalia.data.repository.BrandRepository
import studio.jami.entymalia.ui.BrandViewModel
import studio.jami.entymalia.ui.BrandViewModelFactory
import studio.jami.entymalia.ui.screens.AddBrandScreen
import studio.jami.entymalia.ui.screens.BrandDetailScreen
import studio.jami.entymalia.ui.screens.BrandListScreen
import studio.jami.entymalia.ui.theme.EntymaliaTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        // Initialize Room Database & Repository
        val database = BrandDatabase.getDatabase(this)
        val repository = BrandRepository(database.brandDao())

        setContent {
            EntymaliaTheme {
                // Initialize ViewModel with Factory
                val brandViewModel: BrandViewModel = viewModel(
                    factory = BrandViewModelFactory(application, repository)
                )

                Scaffold(modifier = Modifier.fillMaxSize()) { innerPadding ->
                    BrandNavigation(
                        viewModel = brandViewModel,
                        modifier = Modifier.padding(innerPadding)
                    )
                }
            }
        }
    }
}

@Composable
fun BrandNavigation(
    viewModel: BrandViewModel,
    modifier: Modifier = Modifier
) {
    val navController = rememberNavController()

    NavHost(
        navController = navController,
        startDestination = "brand_list",
        modifier = modifier
    ) {
        composable("brand_list") {
            BrandListScreen(
                viewModel = viewModel,
                onAddBrand = {
                    viewModel.selectProfile(null) // Reset selection for adding new brand
                    navController.navigate("add_brand")
                },
                onSelectBrand = {
                    navController.navigate("brand_detail")
                }
            )
        }

        composable("brand_detail") {
            BrandDetailScreen(
                viewModel = viewModel,
                onBack = {
                    navController.popBackStack()
                },
                onEditProfile = {
                    navController.navigate("add_brand")
                }
            )
        }

        composable("add_brand") {
            AddBrandScreen(
                viewModel = viewModel,
                onBack = {
                    navController.popBackStack()
                }
            )
        }
    }
}
