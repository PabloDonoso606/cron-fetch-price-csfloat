import { supabase } from "./lib/supabase.js";

async function main() {
  const { data, error } = await supabase.from("items").select("*");
  if (error) {
    console.error(error);
  }

  console.log(data?.length);
}
