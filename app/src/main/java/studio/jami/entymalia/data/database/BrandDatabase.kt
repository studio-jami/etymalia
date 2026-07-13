package studio.jami.entymalia.data.database

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(entities = [BrandProfile::class, GeneratedAsset::class], version = 1, exportSchema = false)
abstract class BrandDatabase : RoomDatabase() {
    abstract fun brandDao(): BrandDao

    companion object {
        @Volatile
        private var INSTANCE: BrandDatabase? = null

        fun getDatabase(context: Context): BrandDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    BrandDatabase::class.java,
                    "brand_forge_database"
                )
                .fallbackToDestructiveMigration()
                .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
