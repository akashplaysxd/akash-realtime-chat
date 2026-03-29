"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Database, Play, Loader2, Table2, AlertCircle, CheckCircle, Copy, Download } from "lucide-react";

interface TableInfo {
  table_name: string;
}

export default function SQLEditorPage() {
  const [query, setQuery] = useState('SELECT * FROM "User" LIMIT 10;');
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [result, setResult] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      const res = await fetch("/api/sql");
      const data = await res.json();
      setTables(data.tables || []);
    } catch {
      // Ignore
    }
  };

  const executeQuery = async () => {
    setLoading(true);
    setError("");
    setSuccess(false);
    setResult([]);

    try {
      const res = await fetch("/api/sql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error + (data.details ? `: ${data.details}` : ""));
      } else {
        setResult(Array.isArray(data.data) ? data.data : [data.data]);
        setSuccess(true);
      }
    } catch {
      setError("Failed to execute query");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const downloadResult = () => {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "query-result.json";
    a.click();
  };

  const quickQueries = [
    { name: "All Users", query: 'SELECT id, email, username, status, "createdAt" FROM "User" ORDER BY "createdAt" DESC LIMIT 20;' },
    { name: "All Projects", query: 'SELECT id, title, slug, featured, published FROM "Project" ORDER BY "createdAt" DESC;' },
    { name: "All Blogs", query: 'SELECT id, title, slug, published FROM "Blog" ORDER BY "createdAt" DESC;' },
    { name: "Short URLs", query: 'SELECT code, "originalUrl", visits FROM "ShortUrl" ORDER BY visits DESC;' },
    { name: "Chat Rooms", query: 'SELECT id, name, "inviteCode", "isPublic" FROM "ChatRoom";' },
    { name: "Chat Messages", query: 'SELECT content, "senderId", "roomId" FROM "ChatMessage" ORDER BY "createdAt" DESC LIMIT 50;' },
    { name: "Friendships", query: 'SELECT "senderId", "receiverId", status FROM "Friendship" ORDER BY "createdAt" DESC;' },
    { name: "Direct Messages", query: 'SELECT "senderId", "receiverId", content, "isRead" FROM "DirectMessage" ORDER BY "createdAt" DESC LIMIT 50;' },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
            <Database className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">SQL Editor</h1>
            <p className="text-gray-400">Query your database (SELECT only)</p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Tables Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4"
          >
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Table2 className="w-4 h-4" />
              Tables
            </h2>
            <div className="space-y-1">
              {tables.map((table) => (
                <button
                  key={table.table_name}
                  onClick={() => setQuery(`SELECT * FROM "${table.table_name}" LIMIT 10;`)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--background)] text-sm transition-colors"
                >
                  {table.table_name}
                </button>
              ))}
            </div>

            <h2 className="font-semibold mt-6 mb-4">Quick Queries</h2>
            <div className="space-y-1">
              {quickQueries.map((q) => (
                <button
                  key={q.name}
                  onClick={() => setQuery(q.query)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--background)] text-sm transition-colors text-gray-400 hover:text-white"
                >
                  {q.name}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Main Editor */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-3 space-y-4"
          >
            {/* Query Input */}
            <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4">
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter your SQL query..."
                className="w-full h-32 bg-transparent font-mono text-sm resize-none focus:outline-none"
              />
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-[var(--border)]">
                <p className="text-xs text-gray-500">
                  ⚠️ Only SELECT queries are allowed for security
                </p>
                <button
                  onClick={executeQuery}
                  disabled={loading || !query.trim()}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  Run Query
                </button>
              </div>
            </div>

            {/* Status */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                <div>
                  <p className="font-medium text-red-500">Error</p>
                  <p className="text-sm text-gray-400 mt-1">{error}</p>
                </div>
              </div>
            )}

            {success && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  <p className="text-emerald-500">Query executed successfully! {result.length} rows returned.</p>
                </div>
                <button
                  onClick={downloadResult}
                  className="text-sm px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors flex items-center gap-1"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
            )}

            {/* Results */}
            {result.length > 0 && (
              <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] overflow-hidden">
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--background)] sticky top-0">
                      <tr>
                        {Object.keys(result[0] as object).map((key) => (
                          <th key={key} className="px-4 py-3 text-left font-medium text-gray-400 border-b border-[var(--border)]">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.map((row, i) => (
                        <tr key={i} className="hover:bg-[var(--background)]/50">
                          {Object.values(row as object).map((val: unknown, j) => (
                            <td key={j} className="px-4 py-3 border-b border-[var(--border)]/50">
                              <div className="flex items-center gap-2 group">
                                <span className="truncate max-w-xs">
                                  {val === null ? (
                                    <span className="text-gray-500 italic">NULL</span>
                                  ) : typeof val === "object" ? (
                                    JSON.stringify(val)
                                  ) : (
                                    String(val)
                                  )}
                                </span>
                                {val !== null && (
                                  <button
                                    onClick={() => copyToClipboard(String(val))}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <Copy className="w-3 h-3 text-gray-500" />
                                  </button>
                                )}
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
