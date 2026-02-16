/**
 * Fuzzy Search Utility for MongoDB
 * Hỗ trợ tìm kiếm gần đúng, chuyển đổi tiếng Việt không dấu
 */

/**
 * Chuyển đổi chuỗi tiếng Việt có dấu sang không dấu
 */
export const removeVietnameseTones = (str) => {
  if (!str) return "";

  str = str.toLowerCase();

  const from =
    "àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ";
  const to =
    "aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd";

  for (let i = 0; i < from.length; i++) {
    str = str.replace(new RegExp(from[i], "g"), to[i]);
  }

  return str;
};

/**
 *   NEW: Tạo regex pattern cho partial matching
 * @param {string} word - Từ cần tìm kiếm
 * @returns {RegExp} Regex pattern
 */
export const createPartialMatchRegex = (word) => {
  // Escape special regex characters
  const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Tạo pattern: tìm từ bất kỳ đâu trong chuỗi, không cần khớp toàn bộ từ
  // ví dụ: "muc" sẽ khớp với "muc", "mucmot", "xemuc", v.v.
  return new RegExp(escapedWord, "i");
};

/**
 *   IMPROVED: Tạo MongoDB regex query với fuzzy search (hỗ trợ partial matching)
 * @param {string} query - Query tìm kiếm
 * @param {Array<string>} fields - Các trường cần tìm kiếm
 * @param {Object} options - Tùy chọn
 * @param {boolean} options.exactWord - Chỉ khớp toàn bộ từ (mặc định: false)
 * @returns {Object} MongoDB query object
 */
export const createFuzzyMongoQuery = (query, fields, options = {}) => {
  if (!query || query.trim() === "") {
    return {};
  }

  const { exactWord = false } = options;
  const normalizedQuery = removeVietnameseTones(query.toLowerCase());
  const words = normalizedQuery.split(/\s+/).filter(Boolean);

  // Tạo regex cho mỗi từ
  const regexPatterns = words.map((word) => {
    const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    if (exactWord) {
      // Khớp toàn bộ từ (word boundary)
      return new RegExp(`\\b${escapedWord}\\b`, "i");
    } else {
      //   Khớp một phần (partial match)
      return new RegExp(escapedWord, "i");
    }
  });

  // Tạo query OR cho tất cả các trường
  const orConditions = fields.flatMap((field) =>
    regexPatterns.map((regex) => ({
      [field]: regex,
    }))
  );

  return { $or: orConditions };
};

/**
 *   NEW: Tạo query cho MongoDB với normalize (chuyển có dấu sang không dấu)
 * CÁCH NÀY HIỆU QUẢ HƠN cho tiếng Việt
 * Hỗ trợ tìm kiếm cả có dấu và không dấu
 * Logic: TẤT CẢ các từ phải xuất hiện trong ÍT NHẤT MỘT field (AND logic)
 */
export const createVietnameseSearchQuery = (query, fields) => {
  if (!query || query.trim() === "") {
    return {};
  }

  const normalizedQuery = removeVietnameseTones(query.toLowerCase());
  const words = normalizedQuery.split(/\s+/).filter(Boolean);

  // Nếu chỉ có 1 từ, tìm trong bất kỳ field nào
  if (words.length === 1) {
    const regex = createVietnameseRegex(words[0]);
    const orConditions = fields.map((field) => ({
      [field]: regex,
    }));
    return { $or: orConditions };
  }

  // Nếu có nhiều từ, TẤT CẢ các từ phải xuất hiện trong cùng 1 field
  // Ví dụ: "dua leo" → field phải chứa cả "dua" VÀ "leo"
  const fieldConditions = fields.map((field) => {
    // Tạo $and cho tất cả các từ trong cùng 1 field
    const wordConditions = words.map((word) => ({
      [field]: createVietnameseRegex(word),
    }));
    return { $and: wordConditions };
  });

  // Ít nhất 1 field phải thỏa mãn tất cả các từ
  return { $or: fieldConditions };
};

/**
 * Tạo regex pattern cho tiếng Việt (khớp cả có dấu và không dấu)
 * @param {string} word - Từ đã normalize (không dấu)
 * @returns {RegExp} Regex pattern khớp cả có dấu và không dấu
 */
export const createVietnameseRegex = (word) => {
  if (!word) return /.^/; // Regex không khớp gì

  // Map các ký tự không dấu sang các biến thể có dấu
  const vietnameseMap = {
    a: "[aàáạảãâầấậẩẫăằắặẳẵ]",
    e: "[eèéẹẻẽêềếệểễ]",
    i: "[iìíịỉĩ]",
    o: "[oòóọỏõôồốộổỗơờớợởỡ]",
    u: "[uùúụủũưừứựửữ]",
    y: "[yỳýỵỷỹ]",
    d: "[dđ]",
  };

  // Escape special regex characters
  const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Thay thế từng ký tự bằng pattern
  let pattern = "";
  for (let char of escapedWord.toLowerCase()) {
    if (vietnameseMap[char]) {
      pattern += vietnameseMap[char];
    } else {
      pattern += char;
    }
  }

  return new RegExp(pattern, "i");
};

/**
 * Tạo MongoDB text search query
 */
export const createTextSearchQuery = (query) => {
  if (!query || query.trim() === "") {
    return {};
  }

  return {
    $text: {
      $search: query,
      $caseSensitive: false,
      $diacriticSensitive: false,
    },
  };
};

/**
 * Tính khoảng cách Levenshtein giữa 2 chuỗi
 */
export const levenshteinDistance = (str1, str2) => {
  const m = str1.length;
  const n = str2.length;
  const dp = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + 1
        );
      }
    }
  }

  return dp[m][n];
};

/**
 * Tính điểm tương đồng giữa 2 chuỗi (0-1)
 */
export const similarityScore = (str1, str2) => {
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 1.0;

  const distance = levenshteinDistance(str1, str2);
  return 1 - distance / maxLength;
};

/**
 *   IMPROVED: Kiểm tra xem text có chứa query không (hỗ trợ partial match)
 */
export const containsQuery = (text, query) => {
  if (!text || !query) return false;

  const normalizedText = removeVietnameseTones(text.toLowerCase());
  const normalizedQuery = removeVietnameseTones(query.toLowerCase());
  const words = normalizedQuery.split(/\s+/).filter(Boolean);

  //   Kiểm tra từng từ có xuất hiện trong text không
  return words.some((word) => normalizedText.includes(word));
};

/**
 *   IMPROVED: Sắp xếp kết quả theo độ phù hợp
 */
export const sortByRelevance = (items, query, keys) => {
  if (!query || query.trim() === "") {
    return items.map((item) => ({ item, score: 1 }));
  }

  const normalizedQuery = removeVietnameseTones(query.toLowerCase());
  const queryWords = normalizedQuery.split(/\s+/).filter(Boolean);

  const results = items.map((item) => {
    let maxScore = 0;

    keys.forEach((key) => {
      const value = getNestedValue(item, key);
      if (!value) return;

      const normalizedValue = removeVietnameseTones(value.toLowerCase());

      // 1.  Exact match (khớp chính xác toàn bộ)
      if (normalizedValue === normalizedQuery) {
        maxScore = Math.max(maxScore, 1.0);
        return;
      }

      // 2.   Starts with query (bắt đầu bằng query)
      if (normalizedValue.startsWith(normalizedQuery)) {
        maxScore = Math.max(maxScore, 0.95);
        return;
      }

      // 3.   Contains full query (chứa toàn bộ query)
      if (normalizedValue.includes(normalizedQuery)) {
        maxScore = Math.max(maxScore, 0.9);
        return;
      }

      // 4.   Contains all words (chứa tất cả các từ)
      const containsAllWords = queryWords.every((word) =>
        normalizedValue.includes(word)
      );
      if (containsAllWords) {
        maxScore = Math.max(maxScore, 0.85);
        return;
      }

      // 5.   Contains any word (chứa ít nhất 1 từ) - QUAN TRỌNG!
      const matchingWords = queryWords.filter((word) =>
        normalizedValue.includes(word)
      );
      if (matchingWords.length > 0) {
        // Tính điểm dựa trên tỷ lệ từ khớp
        const matchRatio = matchingWords.length / queryWords.length;
        maxScore = Math.max(maxScore, 0.6 * matchRatio);
        return;
      }

      // 6.   Similarity score (Levenshtein distance)
      const similarity = similarityScore(normalizedValue, normalizedQuery);
      if (similarity > 0.5) {
        // Chỉ tính nếu tương đồng > 50%
        maxScore = Math.max(maxScore, similarity * 0.5);
      }
    });

    return { item, score: maxScore };
  });

  // Sort by score descending
  return results.sort((a, b) => b.score - a.score);
};

/**
 * Lấy giá trị nested từ object
 */
const getNestedValue = (obj, path) => {
  const keys = path.split(".");
  let value = obj;

  for (const key of keys) {
    if (value && typeof value === "object" && key in value) {
      value = value[key];
    } else if (Array.isArray(value)) {
      //  Hỗ trợ array (vd: items.product_id.name)
      const results = value
        .map((item) =>
          getNestedValue(item, keys.slice(keys.indexOf(key)).join("."))
        )
        .filter(Boolean);
      return results.join(" ");
    } else {
      return null;
    }
  }

  return value ? String(value) : null;
};

/**
 * Highlight các từ khớp trong text
 */
export const highlightMatches = (
  text,
  query,
  openTag = "<mark>",
  closeTag = "</mark>"
) => {
  if (!query || query.trim() === "") return text;

  const normalizedQuery = removeVietnameseTones(query.toLowerCase());
  const words = normalizedQuery.split(/\s+/).filter(Boolean);

  let result = text;

  words.forEach((word) => {
    const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escapedWord})`, "gi");
    result = result.replace(regex, `${openTag}$1${closeTag}`);
  });

  return result;
};

/**
 *   NEW: Debug helper - in ra thông tin search
 */
export const debugSearch = (query, items, keys) => {
  console.log("\n🔍 DEBUG FUZZY SEARCH:");
  console.log("Query:", query);
  console.log("Normalized:", removeVietnameseTones(query.toLowerCase()));
  console.log(
    "Words:",
    removeVietnameseTones(query.toLowerCase()).split(/\s+/)
  );

  items.slice(0, 5).forEach((item, i) => {
    console.log(`\nItem ${i + 1}:`);
    keys.forEach((key) => {
      const value = getNestedValue(item, key);
      if (value) {
        console.log(
          `  ${key}: "${value}" → "${removeVietnameseTones(
            value.toLowerCase()
          )}"`
        );
      }
    });
  });
};
