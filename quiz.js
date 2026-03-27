document.getElementById("quizForm").addEventListener("submit", (e) => {
  e.preventDefault();
  let score = 0;
  const formData = new FormData(e.target);

  if (formData.get("q1") === "correct") score++;
  if (formData.get("q2") === "correct") score++;

  const result = document.getElementById("result");
  result.innerHTML = `<h5>You scored ${score}/2</h5>`;

  // Save progress
  chrome.storage.local.set({ lastScore: score });
});
