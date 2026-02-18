function goTo(selector){
  const el = document.querySelector(selector);
  if(!el) return;
  el.scrollIntoView({behavior:"smooth"});
}

function startMatching(){
  window.location.href = "matcher.html";
}

document.getElementById("scrollBtn").addEventListener("click", () => goTo("#features"));
document.getElementById("topBtn").addEventListener("click", () => goTo("body"));

document.getElementById("startBtn").addEventListener("click", startMatching);
document.getElementById("heroStartBtn").addEventListener("click", startMatching);
document.getElementById("aboutStartBtn").addEventListener("click", startMatching);

// demo animation
const scoreText = document.getElementById("scoreText");
const scoreFill = document.getElementById("scoreFill");

let demoScore = 0;
const targetScore = 84;

const interval = setInterval(() => {
  demoScore += 2;
  if(demoScore >= targetScore){
    demoScore = targetScore;
    clearInterval(interval);
  }
  scoreText.textContent = demoScore + "%";
  scoreFill.style.width = demoScore + "%";
}, 25);

document.getElementById("demoBtn").addEventListener("click", () => {
  alert("Demo: Click Start Matching to paste a Job Description + multiple resumes and get ranking.");
});
