import mongoose from "mongoose";
import slugify from "slugify";
import Ingredient from "./ingredient-model.js";

const dishSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, index: true },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    price: { type: Number, required: true, min: 0 },
    description: { type: String, default: "" },

    imageUrls: {
      type: [String],
      default: [],
      validate: {
        validator: function (urls) {
          return urls.every((url) => typeof url === "string" && url.length > 0);
        },
      },
    },
    imagePublicIds: { type: [String], default: [] },
    defaultImageIndex: { type: Number, default: 0, min: 0 },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    soldCount: { type: Number, default: 0, min: 0 },

    ingredients: [
      {
        ingredient: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Ingredient",
          required: true,
        },
        quantityGram: { type: Number, required: true, min: 0 },
      },
    ],

    // Tổng dinh dưỡng (tự động tính)
    totalProtein: { type: Number, default: 0 }, // gram
    totalFat: { type: Number, default: 0 }, // gram
    totalCarbs: { type: Number, default: 0 }, // gram
    totalEnergyKcal: { type: Number, default: 0 },

    // Rating fields
    avgRating: { type: Number, default: 0, min: 0, max: 5 },
    totalRatings: { type: Number, default: 0, min: 0 },

    tags: { type: [String], default: [] },
  },
  { timestamps: true }
);

// ✅ Tự động tạo slug trước khi lưu
dishSchema.pre("save", function (next) {
  if (this.isModified("name") || !this.slug) {
    this.slug = slugify(this.name, {
      lower: true,
      locale: "vi",
      strict: true, // loại bỏ ký tự đặc biệt
      remove: /[*+~.()'"!:@]/g,
    });
  }
  next();
});

// Middleware tính toán dinh dưỡng và tags
dishSchema.pre("save", async function (next) {
  try {
    let totalKcal = 0;
    let totalProtein = 0;
    let totalFat = 0;
    let totalCarbs = 0;
    let totalWeight = 0;

    // 1. Tính tổng năng lượng và dinh dưỡng
    for (const item of this.ingredients) {
      const ing = await Ingredient.findById(item.ingredient);
      if (ing) {
        const weightRatio = item.quantityGram / 100;
        totalWeight += item.quantityGram;
        totalProtein += ing.protein * weightRatio;
        totalFat += ing.fat * weightRatio;
        totalCarbs += ing.carbs * weightRatio;
        totalKcal +=
          (ing.protein * 4 + ing.fat * 9 + ing.carbs * 4) * weightRatio;
      }
    }

    // Gán giá trị đã tính
    this.totalProtein = Math.round(totalProtein * 10) / 10;
    this.totalFat = Math.round(totalFat * 10) / 10;
    this.totalCarbs = Math.round(totalCarbs * 10) / 10;
    this.totalEnergyKcal = Math.round(totalKcal);

    // 2. Tính tỷ lệ năng lượng từng nhóm (%)
    const totalEnergy = totalKcal || 1;
    const proteinPct = ((totalProtein * 4) / totalEnergy) * 100;
    const fatPct = ((totalFat * 9) / totalEnergy) * 100;
    const carbPct = ((totalCarbs * 4) / totalEnergy) * 100;
    const energyDensity = totalKcal / (totalWeight / 100); // kcal/100g

    // 3. Gắn tag khoa học
    const tags = new Set();

    if (proteinPct >= 25) tags.add("high_protein");
    if (fatPct >= 35) tags.add("high_fat");
    if (carbPct <= 45) tags.add("low_carb");

    if (
      proteinPct >= 15 &&
      proteinPct <= 25 &&
      fatPct >= 20 &&
      fatPct <= 35 &&
      carbPct >= 45 &&
      carbPct <= 60
    ) {
      tags.add("balanced_meal");
    }

    // Gym meal: Protein cao, fat không quá cao (< 35%)
    if ((this.totalProtein >= 25 || proteinPct >= 25) && fatPct < 35) {
      tags.add("gym_meal");
    }

    if (
      totalKcal < 400 &&
      proteinPct >= 25 &&
      fatPct < 30 &&
      energyDensity < 60
    ) {
      tags.add("lose_weight");
      tags.add("low_calorie");
    }

    this.tags = Array.from(tags);
    next();
  } catch (err) {
    next(err);
  }
});

// Static method để cập nhật avgRating cho một dish
dishSchema.statics.updateDishRating = async function (dishId) {
  const Rating = mongoose.model("Rating");

  const result = await Rating.aggregate([
    {
      $match: {
        dish_id: new mongoose.Types.ObjectId(dishId),
        status: "visible",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "user_id",
        foreignField: "_id",
        as: "user",
      },
    },
    {
      $unwind: "$user",
    },
    {
      $match: {
        "user.active": true,
      },
    },
    {
      $group: {
        _id: null,
        avgRating: { $avg: "$rating" },
        totalRatings: { $sum: 1 },
      },
    },
  ]);

  const avgRating = result[0]?.avgRating || 0;
  const totalRatings = result[0]?.totalRatings || 0;

  await this.findByIdAndUpdate(dishId, {
    avgRating: Math.round(avgRating * 10) / 10, // làm tròn 1 chữ số thập phân
    totalRatings,
  });

  return { avgRating, totalRatings };
};

export default mongoose.model("Dish", dishSchema);
