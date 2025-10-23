import React, { useState, useEffect } from "react";
import api from "../apiClient";
import "../styles/DbOverview.css";

export default function DbOverviewPage() {
  const [collections, setCollections] = useState([]);
  const [view, setView] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const limit = 50;

  // Only one filter: date string in YYYY-MM-DD format
  const [dateFilter, setDateFilter] = useState("");

  // Keep track of pagination cursors: { pageNum: { prev, next } }
  const [pageCursors, setPageCursors] = useState({});

  const [tickerFilter, setTickerFilter] = useState("");

  // Fetch collections list on mount
  useEffect(() => {
    api
      .get("/api/db/collections_overview")
      .then((res) => setCollections(res.data))
      .catch(() => setCollections([]));
  }, []);

  // Load collection data with current filters & pagination
  const loadCollection = async (
    collectionName,
    pageNum = 1,
    cursor = null,
    direction = "next"
  ) => {
    setLoading(true);
    setError("");

    try {
      const params = { collection: collectionName, limit, direction };

      if (cursor) params.cursor = cursor;
      if (dateFilter.trim() !== "") params.date = dateFilter;
      // Only add ticker filter for specific collections
      const needsTicker = ["intraday", "open_positions", "historical", "periodic_summary", "control"];
      if (needsTicker.includes(collectionName) && tickerFilter.trim() !== "") {
        params.ticker = tickerFilter.trim();
      }

      const res = await api.get("/api/db/collection_data", { params });
      const { data, total, cursor: newCursor, has_more } = res.data;

      setView((prevView) => ({
        data,
        collection: collectionName,
        pages: Math.ceil(total / limit),
        has_more,
        // Update total only on first page load or when collection/filter changes
        total: pageNum === 1 ? total : (prevView ? prevView.total : total),
      }));

      setPage(pageNum);

      setPageCursors((prev) => {
        // Trim cursors to keep only pages near current page (±2)
        const updated = {};
        for (let p = pageNum - 2; p <= pageNum + 2; p++) {
          if (p > 0 && prev[p]) {
            updated[p] = { ...prev[p] };
          }
        }

        if (!updated[pageNum]) updated[pageNum] = { prev: null, next: null };

        if (direction === "next") {
          // cursor is cursor used to get this page, newCursor is for next page
          updated[pageNum].prev = cursor || null;
          updated[pageNum].next = newCursor || null;
        } else if (direction === "prev") {
          // when going prev, newCursor is prev page cursor, cursor is current page cursor
          updated[pageNum].prev = newCursor || null;
          updated[pageNum].next = cursor || null;
        }

        return updated;
      });

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Error loading collection:", err);
      setView(null);
      setError("Failed to load collection data");
    } finally {
      setLoading(false);
    }
  };

  // Next page handler
  const handleNext = () => {
    if (view && pageCursors[page]?.next && view.has_more) {
      loadCollection(view.collection, page + 1, pageCursors[page].next, "next");
    }
  };

  // Previous page handler
  const handlePrevious = () => {
    if (page > 1 && view && pageCursors[page]?.prev) {
      loadCollection(view.collection, page - 1, pageCursors[page].prev, "prev");
    }
  };

  // Select new collection resets everything
  const handleSelectCollection = (collectionName) => {
    setDateFilter("");
    setTickerFilter("");   // reset ticker when changing collection
    setPage(1);
    setPageCursors({});
    setError("");
    setView(null);
    loadCollection(collectionName, 1, null, "next");
  };

  // Apply date filter: reload page 1 with filter
  const handleApplyFilter = () => {
    if (!view?.collection) return;
    setPage(1);
    setPageCursors({});
    loadCollection(view.collection, 1, null, "next");
  };

  // Clear date filter and reload page 1
  const handleClearFilter = () => {
    setDateFilter("");
    setTickerFilter("");
    setPage(1);
    setPageCursors({});
    if (view?.collection) loadCollection(view.collection, 1, null, "next");
  };

  return (
    <div className="app-container db-overview-container">
      <header className="header">StockData DB Overview</header>

      <main className="main-content">
        {!view ? (
          <div className="collections-grid">
            {collections.map((row) => (
              <div
                key={row.collection}
                className="collection-card"
                onClick={() => handleSelectCollection(row.collection)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ")
                    handleSelectCollection(row.collection);
                }}
              >
                <div className="collection-info">
                  <div className="collection-name">{row.collection}</div>
                  <div className="collection-meta">
                    {row.count.toLocaleString()} items • {row.size_mb.toFixed(2)} MB
                    <br />
                    <small>🕒 {row.first_datetime_ist}</small>
                    <br />
                    <small>🆕 {row.last_datetime_ist}</small>
                  </div>
                </div>
                <div className="collection-arrow">›</div>
              </div>
            ))}
          </div>
        ) : (
          <section className="collection-view card">
            <h3>
              {view.collection} (Total: {view.total.toLocaleString()} documents)
            </h3>

            <button
              className="btn back-btn"
              onClick={() => {
                setView(null);
                setDateFilter("");
                setPage(1);
                setPageCursors({});
                setError("");
              }}
            >
              ← Back to Collections
            </button>

            {/* Date filter input */}
            <div className="filters" style={{ marginBottom: "1rem", display: "flex", gap: "20px" }}>
              {/* Date filter */}
              <div className="filter-group" style={{ minWidth: "220px" }}>
                <label htmlFor="filter-date">Date:</label>
                <input
                  id="filter-date"
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  autoComplete="off"
                />
              </div>

              {/* Ticker filter (only show for some collections) */}
              {["intraday", "open_positions", "historical", "periodic_summary", "control"].includes(view.collection) && (
                <div className="filter-group" style={{ minWidth: "150px" }}>
                  <label htmlFor="filter-ticker">Ticker:</label>
                  <input
                    id="filter-ticker"
                    type="text"
                    placeholder="e.g. AAPL"
                    value={tickerFilter}
                    onChange={(e) => setTickerFilter(e.target.value.toUpperCase())}
                    autoComplete="off"
                  />
                </div>
              )}

              {/* Buttons */}
              <div className="filter-buttons" style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
                <button className="btn" onClick={handleApplyFilter}>
                  Apply Filter
                </button>
                <button className="btn btn-secondary" onClick={handleClearFilter}>
                  Clear Filter
                </button>
              </div>
            </div>

            {error && <div className="error-msg">{error}</div>}

            {loading ? (
              <div className="loading">Loading data...</div>
            ) : view.data.length === 0 ? (
              <div className="no-data">No data found.</div>
            ) : (
              <>
                <div className="table-wrapper responsive-table">
                  <table className="stock-table fixed-width-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        {view.data.length > 0 &&
                          Object.keys(view.data[0]).map((key) => (
                            <th key={key}>{key}</th>
                          ))}
                      </tr>
                    </thead>
                    <tbody>
                      {view.data.map((item, index) => (
                        <tr key={index}>
                          <td>{(page - 1) * limit + index + 1}</td>
                          {Object.keys(item).map((key) => (
                            <td key={key}>
                              {item[key] !== undefined
                                ? typeof item[key] === "number"
                                  ? item[key].toFixed(4)
                                  : String(item[key])
                                : ""}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="controls">
                  <button
                    className="btn"
                    onClick={handlePrevious}
                    disabled={page <= 1 || !pageCursors[page]?.prev}
                  >
                    Previous
                  </button>

                  <div className="page-info">
                    Page {page} — Showing {view.data.length} records — Total{" "}
                    {view.total.toLocaleString()}
                  </div>

                  <button
                    className="btn"
                    onClick={handleNext}
                    disabled={!pageCursors[page]?.next || !view.has_more}
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </section>
        )}
      </main>

      <footer className="footer">© {new Date().getFullYear()} Stock DB Viewer</footer>
    </div>
  );
}
