/**
 * Extract data array from a paginated API response.
 * Laravel pagination returns { data: [...], current_page, last_page, ... }
 * Non-paginated endpoints return the array directly.
 */
export async function extractPaginatedData(response) {
  const json = await response.json();
  if (json && typeof json === 'object' && 'data' in json) {
    return json.data;
  }
  return json;
}

/**
 * Fetch a single page from a paginated API endpoint.
 */
export async function fetchPaginated(url, { page = 1, perPage = 25, headers = {} } = {}) {
  const separator = url.includes('?') ? '&' : '?';
  const response = await fetch(`${url}${separator}page=${page}&per_page=${perPage}`, { headers });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const json = await response.json();
  return {
    data: (json && typeof json === 'object' && 'data' in json) ? json.data : Array.isArray(json) ? json : [],
    currentPage: json.current_page || 1,
    lastPage: json.last_page || 1,
    total: json.total || 0,
    perPage: json.per_page || perPage,
  };
}

/**
 * Fetch the first page of data from a paginated endpoint (backward compat).
 * Returns just the data array (not the envelope).
 */
export async function fetchAllPages(url, headers) {
  const result = await fetchPaginated(url, { headers: headers || {} });
  return result.data;
}
