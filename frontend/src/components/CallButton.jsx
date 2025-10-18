import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

export default function CallButton() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const handleClick = async () => {
    setLoading(true);
    setStatus("🔄 Starting AI Call...");
    toast.loading("Connecting call...");

    try {
      const res = await axios.post("http://localhost:5000/api/call/start");
      toast.dismiss();
      toast.success("📞 Call started successfully!");
      setStatus(`✅ AI calling ${res.data.number}`);
      console.log("Call Info:", res.data);
    } catch (err) {
      toast.dismiss();
      toast.error("❌ Failed to start call");
      console.error(err);
      setStatus("❌ Something went wrong: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={handleClick}
        disabled={loading}
        className={`${
          loading ? "bg-gray-600" : "bg-blue-600 hover:bg-blue-700"
        } text-white px-6 py-3 rounded-xl text-lg font-semibold transition-all`}
      >
        {loading ? "Calling..." : "Start AI Call"}
      </button>
      <p className="text-sm text-gray-400">{status}</p>
    </div>
  );
}
