<div id="voidcaptcha-container">
  <p id="voidcaptcha-instruction"></p>
  <input type="text" id="voidcaptcha-word" autocomplete="off" spellcheck="false" placeholder="Type the word here">
  <div id="voidcaptcha-boxes">
    <div class="voidcaptcha-box" data-color="red" style="width:140px;height:140px;background:red;display:inline-block;margin:8px;cursor:pointer;border-radius:12px;"></div>
    <div class="voidcaptcha-box" data-color="blue" style="width:140px;height:140px;background:blue;display:inline-block;margin:8px;cursor:pointer;border-radius:12px;"></div>
  </div>
  <button id="voidcaptcha-verify">Verify</button>
  <p id="voidcaptcha-status"></p>
</div>

<script>
(async function() {
  let challengeId = null;
  let selectedColor = null;

  const instruction = document.getElementById("voidcaptcha-instruction");
  const wordInput = document.getElementById("voidcaptcha-word");
  const boxes = document.querySelectorAll(".voidcaptcha-box");
  const verifyBtn = document.getElementById("voidcaptcha-verify");
  const status = document.getElementById("voidcaptcha-status");

  async function getChallenge() {
    const res = await fetch("http://localhost:3000/api/voidcaptcha/challenge");
    const data = await res.json();
    challengeId = data.challengeId;
    instruction.textContent = data.instruction;
    wordInput.value = "";
    selectedColor = null;
    status.textContent = "";
  }

  boxes.forEach(box => {
    box.addEventListener("click", () => {
      selectedColor = box.dataset.color;
      boxes.forEach(b => b.style.outline = "");
      box.style.outline = "3px solid yellow";
    });
  });

  verifyBtn.addEventListener("click", async () => {
    if (!challengeId || !selectedColor) { status.textContent = "Select a color!"; return; }
    const typedWord = wordInput.value.trim();
    try {
      const res = await fetch("http://localhost:3000/api/voidcaptcha/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId, selectedColor, typedWord })
      });
      const data = await res.json();
      status.textContent = data.message;
      if (data.verified) verifyBtn.disabled = true;
    } catch {
      status.textContent = "Network error.";
    }
  });

  await getChallenge();
})();
</script>




// add this to ur code!
