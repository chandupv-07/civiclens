// @ts-nocheck
"use client";
import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL;

export default function Home() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [coords, setCoords] = useState(null);
  const [ward, setWard] = useState("Ward 1");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  function onFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setError("");
    if (!navigator.geolocation) {
      setCoords({ lat: 12.9716, lng: 77.5946 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setCoords({ lat: 12.9716, lng: 77.5946 })
    );
  }

  async function submit() {
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("lat", coords?.lat ?? 12.9716);
      fd.append("lng", coords?.lng ?? 77.5946);
      fd.append("ward", ward);
      const res = await fetch(`${API}/reports`, { method: "POST", body: fd });
      if (!res.ok) throw new Error("Server error " + res.status);
      setResult(await res.json());
    } catch (e) {
      setError(e.message + ". If Google AI is busy, try again in a minute.");
    }
    setLoading(false);
  }

  const sevColor = ["", "bg-green-500", "bg-lime-500", "bg-yellow-500", "bg-orange-500", "bg-red-600"];

  return (
    <main className="max-w-xl mx-auto p-6">
      <h1 className="text-3xl font-bold">CivicLens</h1>
      <p className="text-gray-600 mb-6">Report a civic problem. AI triages it and routes it to the right department.</p>

      <input type="file" accept="image/*" capture="environment" onChange={onFile} className="mb-4 block" />
      {preview && <img src={preview} alt="preview" className="rounded mb-4 max-h-72" />}

      <select value={ward} onChange={(e) => setWard(e.target.value)} className="border p-2 rounded mb-4 block">
        {["Ward 1", "Ward 2", "Ward 3", "Ward 4", "Ward 5"].map((w) => <option key={w}>{w}</option>)}
      </select>

      {coords && <p className="text-sm text-gray-500 mb-4">Location: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</p>}

      <button onClick={submit} disabled={!file || loading}
        className="bg-blue-600 text-white px-5 py-2 rounded disabled:opacity-50">
        {loading ? "Analyzing..." : "Submit report"}
      </button>

      {error && <p className="text-red-600 mt-4">{error}</p>}

      {result && (
        <div className="border rounded p-4 mt-6">
          <div className="flex items-center gap-3 mb-2">
            <span className={`text-white px-3 py-1 rounded ${sevColor[result.severity]}`}>Severity {result.severity}/5</span>
            <span className="font-semibold capitalize">{result.category.replace("_", " ")}</span>
          </div>
          <p className="mb-2">{result.description}</p>
          <p className="text-sm text-gray-600"><b>Why:</b> {result.severity_reason}</p>
          <p className="text-sm mt-2"><b>Routed to:</b> {result.department ?? "Human review"}</p>
          <p className="text-sm"><b>Status:</b> {result.status}</p>
          <p className="text-sm"><b>AI confidence:</b> {Math.round(result.confidence * 100)}%</p>
        </div>
      )}
    </main>
  );
}
