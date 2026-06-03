import mongoose from "mongoose";

const branchSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      street: { type: String, default: "" },
      ward: {
        code: { type: String },
        name: { type: String },
      },
      district: {
        code: { type: Number },
        name: { type: String },
      },
      province: {
        code: { type: Number },
        name: { type: String },
      },

      coordinates: {
        latitude: { type: Number, default: null },
        longitude: { type: Number, default: null },
      },
    },
    phone: {
      type: String,
      default: "",
    },
    // short code for branch (e.g. 6 chars)
    code: {
      type: String,
      trim: true,
      uppercase: true,
      unique: true,
      sparse: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// Index để tìm kiếm nhanh theo branchId
branchSchema.index({ branchId: 1 });
// Index cho code (unique)
branchSchema.index({ code: 1 }, { unique: true, sparse: true });

// Generate a short unique code (6 chars) before saving if not provided
branchSchema.pre("save", async function (next) {
  try {
    if (this.code) return next();

    const genCode = () =>
      Math.random().toString(36).substring(2, 8).toUpperCase();

    for (let i = 0; i < 6; i++) {
      const candidate = genCode();
      // check uniqueness
      const existing = await this.constructor
        .findOne({ code: candidate })
        .lean();
      if (!existing) {
        this.code = candidate;
        return next();
      }
    }

    // fallback: set at least something
    this.code = genCode();
    return next();
  } catch (err) {
    return next(err);
  }
});

export default mongoose.model("Branch", branchSchema);
