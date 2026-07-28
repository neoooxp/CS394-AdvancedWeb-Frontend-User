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
 * Fetch all pages from a paginated API endpoint.
 * Recursively fetches pages until all data is collected.
 */
export async function fetchAllPages(url, headers, page = 1, accumulated = []) {
  const separator = url.includes('?') ? '&' : '?';
  const response = await fetch(`${url}${separator}page=${page}`, { headers });
  const json = await response.json();

  const data = (json && typeof json === 'object' && 'data' in json) ? json.data : json;
  const currentPage = json.current_page || json.meta?.current_page || page;
  const lastPage = json.last_page || json.meta?.last_page || 1;

  const results = [...accumulated, ...(Array.isArray(data) ? data : [])];

  if (currentPage < lastPage) {
    return fetchAllPages(url, headers, page + 1, results);
  }

  return results;
}
