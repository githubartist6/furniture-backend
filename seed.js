require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");
const products = require("./data/products.json");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function insertProducts() {
  console.log(`Uploading ${products.length} products...`);

  const { data, error } = await supabase
    .from("products")
    .insert(products)
    .select();

  if (error) {
    console.error("❌ Upload failed:");
    console.error(error);
    return;
  }

  console.log(`✅ ${data.length} products uploaded successfully!`);
}

insertProducts();