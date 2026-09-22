// Cloudflare Pages Function
// Endpoint: https://your-site.pages.dev/api
// Uses Open Food Facts — a free, open database with no API key required.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST',
  'Content-Type': 'application/json'
};

// Open Food Facts stores nutrition per 100g/100ml, not per serving.
// We map that into the same field names the app already expects
// (item_name, nf_calories, nf_protein, nf_total_carbohydrate, nf_total_fat)
// so index.html needs no changes. Values represent "per 100g".
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

    try {
      const apiUrl = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`;
      const res = await fetch(apiUrl, { headers: { 'User-Agent': 'PTCoachApp - Cloudflare Pages' } });
      const data = await res.json();

      if (data.status === 1 && data.product) {
        return new Response(JSON.stringify({ results: [mapProduct(data.product)] }), { headers: corsHeaders });
      }
      return new Response(JSON.stringify({ results: [] }), { headers: corsHeaders });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'API request failed', results: [] }), { headers: corsHeaders });
    }
  }

  if (action === 'search_food') {
    const foodName = url.searchParams.get('food') || '';
    if (!foodName) {
      return new Response(JSON.stringify({ error: 'No food name provided', branded: [], common: [] }), { headers: corsHeaders });
    }

    try {
      const apiUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(foodName)}&search_simple=1&action=process&json=1&page_size=10`;
      const res = await fetch(apiUrl, { headers: { 'User-Agent': 'PTCoachApp - Cloudflare Pages' } });
      const data = await res.json();

      const products = (data.products || [])
        .filter(p => p.product_name)
        .map(mapProduct);

      return new Response(JSON.stringify({ branded: [], common: products }), { headers: corsHeaders });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'API request failed', branded: [], common: [] }), { headers: corsHeaders });
    }
  }

  return new Response(JSON.stringify({ error: 'Invalid action' }), { headers: corsHeaders });
}
