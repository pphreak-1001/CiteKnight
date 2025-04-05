(function() {
  const panel = document.getElementById("copilot-panel");
  panel.style.position = "fixed";
  panel.style.top = "80px";
  panel.style.right = "0";
  panel.style.width = "400px";
  panel.style.backgroundColor = "#fff";
  panel.style.border = "1px solid #ccc";
  panel.style.padding = "15px";
  panel.style.zIndex = "9999";
  panel.style.fontFamily = "Arial, sans-serif";
  panel.innerHTML = "<h3>🧠 Wikipedia Copilot</h3><div id='copilot-output'>Start editing to get feedback...</div>";

  const textarea = document.getElementById("wpTextbox1");
  if (textarea) {
    textarea.addEventListener("input", async () => {
      const text = textarea.value;
      document.getElementById("copilot-output").innerText = "Analyzing...";
      const response = await fetch("http://localhost:9999/analyzeEdit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_text: text })
      });
      const data = await response.json();
      document.getElementById("copilot-output").innerHTML =
        data.feedback.map(p => `<p>🔍 ${p}</p>`).join("");
    });
  }
})();