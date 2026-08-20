# Stock Management Integration Findings

The supplied Al-Tamam Stock Management application currently exposes inventory data through its authenticated tRPC route, `inventory.listStock`, together with dispatch and order queries. The page renders live inventory only after an authenticated session is present; the discovered request is not a documented anonymous or service-to-service public API.

An unauthenticated probe of the discovered `inventory.listStock` tRPC endpoint returned HTTP 401 with JSON content. This confirms that the route cannot be called by FFM as a public read-only source.

FFM must not reuse a browser session or private application cookie for a production integration. A supported read-only integration therefore requires the stock application to publish a dedicated server-side endpoint or a documented API credential with a least-privilege inventory-read scope. Until then, FFM should keep Stock Review removed from the operational sidebar as requested.
