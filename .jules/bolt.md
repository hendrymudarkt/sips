## 2025-05-15 - [Intl.DateTimeFormat Reuse]
**Learning:** Calling `toLocaleDateString()` or `toLocaleString()` inside a loop or frequent render path is a significant bottleneck. It creates a new `Intl` object on every call, which is computationally expensive.
**Action:** Define static `Intl.DateTimeFormat` instances at the module level for commonly used formats to avoid this overhead.

## 2025-05-15 - [Pre-calculating Display Values]
**Learning:** Repeating complex logic (like status classification via multiple string/regex checks) for every row in a table during React rendering can cause UI lag on large datasets.
**Action:** Shift this logic into the data-processing phase (e.g., inside `useMemo` after a fetch) and store the results as properties on the data objects. This converts O(N) complex work during render into O(N) simple property access.

## 2025-05-15 - [Intl Formatter Caching]
**Learning:** Creating `Intl.DateTimeFormat` and `Intl.NumberFormat` instances is computationally expensive. When used inside React render loops or data table row selectors, it leads to significant UI jank as the dataset size grows.
**Action:** Use the `utils/perf-formatter.ts` utility which implements a `Map`-based cache for these instances. This reduces CPU usage and memory churn during rendering of large datasets.

## 2026-05-31 - [O(N^2) Row Numbering Anti-pattern]
**Learning:** Calculating unique row numbers inside a React render loop using `data.slice(0, idx).filter()` causes O(N²) complexity. This leads to severe UI lag as the number of rows (N) increases, especially in data-heavy report tables.
**Action:** Pre-calculate row numbers or unique counters during the data processing phase (e.g., inside `fetchData` or `useMemo`) using a single-pass (O(N)) counter. Store the result on the data object itself to allow O(1) access during render.

## 2026-05-31 - [O(N) Render-path Lookup Anti-pattern]
**Learning:** Performing O(N) lookups (like `array.find()`) or repeated string operations (like `toLowerCase()`) inside a render loop or during frequent user input (e.g., in a SearchSelect) causes significant UI lag as N grows.
**Action:** Pre-calculate a `Map` for O(1) lookups and pre-calculate search content (e.g., lowercase strings) in a `useMemo` block. This shifts the computational cost from every render/keystroke to once per data change.

## 2025-05-15 - [O(N) Master Data Lookup in Filter Loops]
**Learning:** Performing O(N) array searches (like `.find()`) inside of `.filter()` or `.map()` loops over large datasets (like employees) causes O(N*M) complexity. This results in noticeable UI freezing when changing filters or typing in searchable selects.
**Action:** Pre-calculate a lookup `Map` for master data (e.g., Business Units) and use it for O(1) resolution within the loop. Pre-resolving the current selection's properties before the loop further eliminates redundant Map lookups.

## 2025-06-08 - [Multi-pass Aggregate Calculation Anti-pattern]
**Learning:** Using multiple O(N) passes (e.g., .reduce() followed by several .filter().length) to calculate dashboard statistics creates unnecessary iterations and intermediate array allocations.
**Action:** Consolidate aggregate calculations into a single-pass loop (e.g., for...of) to maintain O(N) complexity regardless of the number of metrics being derived.

## 2026-06-12 - [O(N) Render-path Lookup Anti-pattern]
**Learning:** Performing repeated O(N) array scans (like `.find()`) inside a render loop or during frequent user interactions (like form updates) leads to significant UI lag as the dataset (e.g., employees) grows.
**Action:** Pre-calculate a `Map` using `useMemo` for O(1) constant-time lookups. Consolidate legacy label-only maps into this single-pass O(N) map generation to maintain high performance with large datasets.

## 2026-06-12 - [O(N*M) Multi-pass Table Processing Anti-pattern]
**Learning:** Using multiple O(N) iterations (filter -> some -> reduce) in `useMemo` for table search and aggregation creates redundant work and intermediate allocations. Combining this with expensive string-to-number parsing during search causes severe lag on large datasets.
**Action:** Pre-calculate all numeric values and search content strings during the data fetch/mapping phase. Consolidate all filtering, aggregation, and condition checks into a single-pass `for...of` loop within `useMemo` to maintain O(N) complexity regardless of the number of metrics derived.

## 2026-06-15 - [Pre-calculating Numeric Values and Labels in Pengangkutan]
**Learning:** Performing redundant string-to-number parsing and conditional label mapping (e.g., Langsir/Direct) inside DataTable selectors and cell renderers leads to degraded performance as the dataset grows. It also prevents efficient native numeric sorting in the table.
**Action:** Pre-calculate all numeric values and display labels during the data fetch/mapping phase (e.g., in useQuery). Use these pre-calculated fields in the DataTable columns to ensure O(1) access during render and correct O(N log N) numeric sorting without overhead.

## 2026-06-20 - [O(K*N) Cookie Retrieval Anti-pattern]
**Learning:** Performing multiple regex-based lookups on `document.cookie` for a set of related fields (like user profile) causes O(K*N) complexity where N is cookie length and K is number of fields/variants. This leads to redundant string scanning and regex overhead on every page load or component mount.
**Action:** Implement a single-pass parser that converts `document.cookie` into a `Map` or plain object exactly once. Use this cached map for O(1) field lookups, reducing retrieval complexity to O(N + K).

## 2026-06-25 - [Eliminating Redundant Network Fetches on Locale Change]
**Learning:** Including `localeTag` in a data-fetching dependency array (like `useQuery` or `fetchData`) causes entire datasets to be re-fetched from the network whenever the user toggles the UI language, even if the underlying data is identical.
**Action:** Remove `localeTag` from network dependencies. Instead, move localization-dependent display formatting (e.g., `formatPerfDate`) into an `enrichedItems` `useMemo` hook that depends on both the data and the `localeTag`. This ensures the UI updates instantly without network overhead.

## 2025-06-30 - [O(N) Render-path Lookup in Harvest]
**Learning:** Performing repeated O(N) array scans (like `.find()`) inside event handlers or render loops for large datasets (like employees or TPH) causes noticeable input lag.
**Action:** Pre-calculate a `Map` using `useMemo` for O(1) constant-time lookups. This ensures immediate UI responsiveness even as the dataset grows.

## 2026-06-30 - [Intl Collator Caching in Users Page]
**Learning:** Calling `localeCompare` inside React render passes and list-processing sequences (such as sorting options in cascading selects or filter options) introduces substantial CPU overhead by dynamically reinstantiating standard internationalization collation rules on every comparison step.
**Action:** Utilize the cached `Intl.Collator` instance through `getCachedCollator(localeTag)` for all locale-sensitive sorting operations. This prevents resource allocation churn and keeps list sorting lightning-fast and responsive.
