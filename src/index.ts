import { supabase } from "./lib/supabase.js";
import "dotenv/config";
interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

function normalizePrice(price: number) {
  return price / 100;
}
async function getItemToUpdate() {
  const { data, error } = await supabase
    .from("details")
    .select("id, csfloat_api_url, price_updated_at")
    .not("csfloat_api_url", "is", null)
    .order("price_updated_at", { ascending: true, nullsFirst: true });

  if (error) {
    throw new Error(`Error fetching Item to update: ${error.message}`);
  }

  return data;
}
async function fetchPriceFromAPI(url: string) {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: "d5Nwb28OTqQEFeluXnYXO4IxtRFMSpSG",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const rateLimit: RateLimitInfo | null = {
      limit: parseInt(response.headers.get("X-RateLimit-Limit") ?? "0"),
      remaining: parseInt(response.headers.get("X-RateLimit-Remaining") ?? "0"),
      reset: parseInt(response.headers.get("X-RateLimit-Reset") ?? "0"),
    };

    const result = await response.json();
    const price = result.data?.[0]?.price ?? null;

    return { price, rateLimit };
  } catch (error) {
    console.error("Error fetching price from API:", error);
    return { price: null, rateLimit: null };
  }
}

async function updatePrice(detailId: number, normalizePrice: number) {
  const { error } = await supabase
    .from("details")
    .update({
      csfloat_price: normalizePrice,
      price_updated_at: new Date().toISOString(),
    })
    .eq("id", detailId);

  if (error) {
    throw new Error(`Error updating Detail Price: ${error.message}`);
  }
}

async function updateAllCsFloatPrice() {
  console.log("Starting price update...");
  try {
    const details = await getItemToUpdate();

    for (let i = 0; i < details.length; i++) {
      const detail = details[i];
      const { price: apiPrice, rateLimit } = await fetchPriceFromAPI(
        detail.csfloat_api_url,
      );

      if (apiPrice !== null) {
        const normalizedPrice = normalizePrice(apiPrice);
        await updatePrice(detail.id, normalizedPrice);
        console.log(
          `Updated price for Detail ID ${detail.id}: ${normalizedPrice}`,
        );
        console.log(rateLimit?.remaining);
      }

      if (i < details.length - 1 && rateLimit) {
        const timeUntilReset = rateLimit.reset * 1000 - Date.now();
        const optimalDelay = Math.ceil(timeUntilReset / rateLimit.remaining);
        await new Promise((resolve) => setTimeout(resolve, optimalDelay));
      }
    }
  } catch (error) {}
}

async function main() {
  await updateAllCsFloatPrice();
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
