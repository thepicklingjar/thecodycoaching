// Cloudflare Pages Function — DEBUG VERSION
// Endpoint: https://your-site.pages.dev/api
// Temporarily returns the real error detail so we can see what's failing.
// Once it's working, swap back to the clean version.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST',
  'Content-Type': 'application/json'
};

function mapProduct(product) {
  const n = product.nutriments || {};
  return {
    item_name: product.product_name || product.generic_name || 'Unknown product',
    nf_calories: Math.round(n['energy-kcal_100g'] || n['energy-kcal'] || 0),
    nf_protein: Math.round(n['proteins_100g'] || 0),
    nf_total_carbohydrate: Math.round(n['carbohydrates_100g'] || 0),
    nf_total_fat: Math.round(n['fat_100g'] || 0)
  };
}

export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const action = url.searchParams.get('action') || '';

  if (action === 'search_barcode') {
    const barcode = url.searchParams.get('barcode') || '';
    if (!barcode) {
      return new Response(JSON.stringify({ error: 'No barcode provided', results: [] }), { headers: corsHeaders });
    }

    const apiUrl = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`;
    try {
      const res = await fetch(apiUrl, { headers: { 'User-Agent': 'PTCoachApp/1.0 (contact: test@example.com)' } });
      const rawText = await res.text();

      let data;
      try {
        data = JSON.parse(rawText);
      } catch (parseErr) {
        return new Response(JSON.stringify({
          error: 'DEBUG: response was not valid JSON',
          status: res.status,
          rawTextSnippet: rawText.slice(0, 300),
          results: []
        }), { headers: corsHeaders });
      }

      if (data.status === 1 && data.product) {
        return new Response(JSON.stringify({ results: [mapProduct(data.product)] }), { headers: corsHeaders });
      }
      return new Response(JSON.stringify({ results: [], debugStatus: res.status, debugData: data }), { headers: corsHeaders });
    } catch (err) {
      return new Response(JSON.stringify({
        error: 'DEBUG: fetch threw an exception',
        errorMessage: err.message,
        errorName: err.name,
        results: []
      }), { headers: corsHeaders });
    }
  }

  if (action === 'search_food') {
    const foodName = url.searchParams.get('food') || '';
    if (!foodName) {
      return new Response(JSON.stringify({ error: 'No food name provided', branded: [], common: [] }), { headers: corsHeaders });
    }

    const apiUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(foodName)}&search_simple=1&action=process&json=1&page_size=10`;
    try {
      const res = await fetch(apiUrl, { headers: { 'User-Agent': 'PTCoachApp/1.0 (contact: test@example.com)' } });
      const rawText = await res.text();

      let data;
      try {
        data = JSON.parse(rawText);
      } catch (parseErr) {
        return new Response(JSON.stringify({
          error: 'DEBUG: response was not valid JSON',
          status: res.status,
          rawTextSnippet: rawText.slice(0, 300),
          branded: [],
          common: []
        }), { headers: corsHeaders });
      }

      const products = (data.products || []).filter(p => p.product_name).map(mapProduct);
      return new Response(JSON.stringify({ branded: [], common: products, debugCount: (data.products || []).length }), { headers: corsHeaders });
    } catch (err) {
      return new Response(JSON.stringify({
        error: 'DEBUG: fetch threw an exception',
        errorMessage: err.message,
        errorName: err.name,
        branded: [],
        common: []
      }), { headers: corsHeaders });
    }
  }

  return new Response(JSON.stringify({ error: 'Invalid action' }), { headers: corsHeaders });
}
