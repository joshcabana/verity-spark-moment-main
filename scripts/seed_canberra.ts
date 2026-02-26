import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables
config({ path: resolve(process.cwd(), ".env") });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const NAMES = ["Liam", "Olivia", "Noah", "Emma", "Oliver", "Charlotte", "William", "Amelia", "James", "Mia"];
const CITIES = ["Canberra", "Sydney"];
const GENDERS = ["man", "woman", "non-binary"];

async function main() {
  console.log("Seeding 8-10 test users for Canberra & Sydney...");
  
  const numUsers = Math.floor(Math.random() * 3) + 8; // 8 to 10
  
  for (let i = 0; i < numUsers; i++) {
    const email = `test-${Date.now()}-${i}@verity.date`;
    const password = "Password123!";
    const name = NAMES[Math.floor(Math.random() * NAMES.length)];
    const city = CITIES[Math.floor(Math.random() * CITIES.length)];
    const gender = GENDERS[Math.floor(Math.random() * GENDERS.length)];
    
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: name,
      }
    });

    if (error) {
      console.error(`Failed to create user ${email}:`, error.message);
      continue;
    }

    if (data.user) {
      // Create profile info manually if trigger doesn't cover all fields
      const { error: profileError } = await supabase.from("profiles").update({
        display_name: name,
        gender,
        seeking_gender: "everyone",
        location: city,
        verified_phone: true,
      }).eq("user_id", data.user.id);
      
      if (profileError) {
        console.error(`Warning: Could not update profile for ${email}`);
      }

      console.log(`Created test user: ${email} (${name} in ${city}, ${gender})`);
    }
  }
  
  console.log("Seeding complete!");
}

main().catch(console.error);
