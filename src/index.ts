import { supabase } from "./lib/supabase.js";

async function main() {
  const { data, error } = await supabase.from("items").select("*");
  if (error) {
    console.error(error);
  }

  console.log(data?.length);
}

main()
  .then(() => {
    console.log("Done");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
