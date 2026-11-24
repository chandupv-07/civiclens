// @ts-nocheck
"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const Map = dynamic(() => import("./MapView"), { ssr: false });
const API = process.env.NEXT_PUBLIC_API_URL;

export default function Dashboard() {
  const [reports, setReports] = useState([]);
  const [cat, setCat] = useState("all");

  async function load() {
    try {
      const r = await fetch(`${API}/reports`);
      setReports(await r.json());
    } catch (e) {}
  }
  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, []);

  const shown = reports.filter((r) => cat === "all" || r.category === cat);
  const high = reports.filter((r) => r.severity >= 4).length;
  const cats = ["all", "pothole", "water_leak", "garbage", "streetlight", "drainage", "other"];

  return (
    <main className="max-w-5xl mx-auto p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">CivicLens Dashboard</h1>
        <a href="/" className="text-blue-600 underline">Report a problem</a>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="border rounded p-3"><div className="text-2xl font-bold">{reports.length}</div>Total reports</div>
        <div className="border rounded p-3"><div className="text-2xl font-bold text-red-600">{high}</div>High severity (4-5)</div>
        <div className="border rounded p-3"><div className="text-2xl font-bold">{reports.filter((r) => r.status === "fixed").length}</div>Fixed</div>
      </div>
      <select value={cat} onChange={(e) => setCat(e.target.value)} className="border p-2 rounded mb-4">
        {cats.map((c) => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
      </select>
      <Map reports={shown} />
      <h2 className="text-xl font-semibold mt-6 mb-2">Recent reports</h2>
      <ul className="space-y-2">
        {shown.slice(0, 10).map((r) => (
          <li key={r.id} className="border rounded p-3 flex gap-3">
            {r.media_url && <img src={r.media_url} alt="" className="w-20 h-20 object-cover rounded" />}
            <div>
              <b className="capitalize">{r.category.replace("_", " ")}</b> · severity {r.severity}/5 · {r.department ?? "Human review"} · {r.status}
              <div className="text-sm text-gray-600">{r.severity_reason}</div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
