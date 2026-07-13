package studio.jami.entymalia.data.database

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import androidx.room.Delete
import kotlinx.coroutines.flow.Flow

@Dao
interface BrandDao {
    // --- Brand Profiles ---

    @Query("SELECT * FROM brand_profiles ORDER BY timestamp DESC")
    fun getAllProfiles(): Flow<List<BrandProfile>>

    @Query("SELECT * FROM brand_profiles WHERE id = :id")
    fun getProfileByIdFlow(id: Long): Flow<BrandProfile?>

    @Query("SELECT * FROM brand_profiles WHERE id = :id")
    suspend fun getProfileById(id: Long): BrandProfile?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertProfile(profile: BrandProfile): Long

    @Update
    suspend fun updateProfile(profile: BrandProfile)

    @Query("DELETE FROM brand_profiles WHERE id = :id")
    suspend fun deleteProfileById(id: Long)

    // --- Generated Assets ---

    @Query("SELECT * FROM generated_assets WHERE profileId = :profileId ORDER BY timestamp DESC")
    fun getAssetsForProfile(profileId: Long): Flow<List<GeneratedAsset>>

    @Query("SELECT * FROM generated_assets WHERE id = :id")
    suspend fun getAssetById(id: Long): GeneratedAsset?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAsset(asset: GeneratedAsset): Long

    @Query("DELETE FROM generated_assets WHERE id = :id")
    suspend fun deleteAssetById(id: Long)
}
